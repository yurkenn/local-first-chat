import { useState, useRef, useCallback, useEffect } from "react";
import Peer from "simple-peer";
import { Group } from "jazz-tools";
import { VoicePeer, VoicePeerList, VoiceState } from "../schema";

/**
 * useVoiceChat — Manages WebRTC P2P mesh voice connections.
 *
 * Architecture:
 *   - Each peer creates a VoicePeer CoValue with their peerId (random UUID)
 *   - Jazz CoValues handle signaling exchange (no external signaling server)
 *   - simple-peer handles WebRTC connection + audio stream piping
 *   - Full mesh: every peer connects to every other peer
 *
 * Signaling flow:
 *   1. User joins → creates VoicePeer CoValue, pushes to channel's VoiceState.peers
 *   2. Polling loop discovers other peers via the CoList
 *   3. Deterministic initiator selection (lexicographic comparison of peerIds)
 *   4. SDP/ICE candidates exchanged via VoicePeer.signalData
 *   5. Audio streams flow directly P2P
 */

interface PeerInfo {
    peerId: string;
    peerName: string;
    isMuted: boolean;
}

export function useVoiceChat(channel: any, userName: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);

    // Refs for stable references across renders
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, Peer.Instance>>(new Map());
    const myPeerIdRef = useRef<string>(crypto.randomUUID());
    const myPeerCoValueRef = useRef<any>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Join the voice channel.
     * 1. Acquire microphone access
     * 2. Create VoicePeer CoValue
     * 3. Push into channel's VoiceState peer list
     * 4. Start polling for other peers
     */
    const join = useCallback(async () => {
        if (!channel) return;

        try {
            // Acquire local audio stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });
            localStreamRef.current = stream;

            // Ensure voice state exists on channel
            if (!channel.voiceState) {
                const ownerGroup = Group.create();
                ownerGroup.addMember("everyone", "writer");
                const voiceState = VoiceState.create(
                    { peers: VoicePeerList.create([], { owner: ownerGroup }) },
                    { owner: ownerGroup }
                );
                (channel as any).$jazz.set("voiceState", voiceState);
            }

            // Wait for voiceState.peers to be available
            const voiceState = channel.voiceState;
            if (!voiceState || !voiceState.peers) {
                console.warn("[useVoiceChat] Voice state or peers not available");
                return;
            }

            // Create our VoicePeer CoValue
            const ownerGroup = Group.create();
            ownerGroup.addMember("everyone", "writer");

            const voicePeer = VoicePeer.create(
                {
                    peerId: myPeerIdRef.current,
                    signalData: "",
                    peerName: userName,
                    isMuted: false,
                },
                { owner: ownerGroup }
            );
            myPeerCoValueRef.current = voicePeer;

            // Push into the peers list
            (voiceState.peers as any).$jazz.push(voicePeer);

            setIsConnected(true);

            // Start polling for peers
            startPeerPolling();
        } catch (err) {
            console.error("[useVoiceChat] Failed to join voice:", err);
        }
    }, [channel, userName]);

    /**
     * Leave the voice channel.
     * Cleans up audio stream, peer connections, and VoicePeer CoValue.
     */
    const leave = useCallback(() => {
        // Stop polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Destroy all peer connections
        peerConnectionsRef.current.forEach((peer) => {
            try {
                peer.destroy();
            } catch {
                /* ignore cleanup errors */
            }
        });
        peerConnectionsRef.current.clear();

        // Stop local audio stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Remove our VoicePeer from the channel's peer list
        try {
            const voiceState = channel?.voiceState;
            if (voiceState?.peers && myPeerCoValueRef.current) {
                const peersList = voiceState.peers;
                const myCoValueId = myPeerCoValueRef.current.id;
                const items = Array.from(peersList);
                const index = items.findIndex(
                    (p: any) => p?.id === myCoValueId
                );
                if (index >= 0) {
                    // Remove from CoList by splicing
                    (peersList as any).$jazz.splice(index, 1);
                }
            }
        } catch (err) {
            console.warn("[useVoiceChat] Error removing peer from list:", err);
        }

        myPeerCoValueRef.current = null;
        setIsConnected(false);
        setPeers([]);
        setIsMuted(false);
    }, [channel]);

    /**
     * Toggle microphone mute state.
     */
    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);

        // Mute/unmute local audio tracks
        if (localStreamRef.current) {
            localStreamRef.current
                .getAudioTracks()
                .forEach((track) => (track.enabled = !newMuted));
        }

        // Update our VoicePeer CoValue
        if (myPeerCoValueRef.current) {
            (myPeerCoValueRef.current as any).$jazz.set("isMuted", newMuted);
        }
    }, [isMuted]);

    /**
     * Poll the VoiceState peer list for new peers and establish connections.
     */
    const startPeerPolling = useCallback(() => {
        if (pollIntervalRef.current) return;

        pollIntervalRef.current = setInterval(() => {
            if (!channel?.voiceState?.peers) return;

            const voicePeers = channel.voiceState.peers;
            const items = Array.from(voicePeers).filter(Boolean);

            // Update peers list for UI
            const peerInfoList: PeerInfo[] = [];
            for (const vp of items) {
                const vpAny = vp as any;
                if (!vpAny || vpAny.peerId === myPeerIdRef.current) continue;
                peerInfoList.push({
                    peerId: vpAny.peerId,
                    peerName: vpAny.peerName,
                    isMuted: vpAny.isMuted,
                });
            }
            setPeers(peerInfoList);

            // Establish WebRTC connections with new peers
            for (const vp of items) {
                const vpAny = vp as any;
                if (!vpAny || vpAny.peerId === myPeerIdRef.current) continue;

                // Skip if already connected
                if (peerConnectionsRef.current.has(vpAny.peerId)) {
                    // Check for incoming signal data
                    const existingPeer = peerConnectionsRef.current.get(vpAny.peerId);
                    if (existingPeer && vpAny.signalData) {
                        try {
                            const signalData = JSON.parse(vpAny.signalData);
                            existingPeer.signal(signalData);
                        } catch {
                            /* signal may have already been processed */
                        }
                    }
                    continue;
                }

                // Determine initiator (deterministic: higher peerId initiates)
                const isInitiator = myPeerIdRef.current > vpAny.peerId;

                if (!localStreamRef.current) continue;

                // Create simple-peer connection
                const peer = new Peer({
                    initiator: isInitiator,
                    stream: localStreamRef.current,
                    trickle: true,
                    config: {
                        iceServers: [
                            { urls: "stun:stun.l.google.com:19302" },
                            { urls: "stun:stun1.l.google.com:19302" },
                        ],
                    },
                });

                // Send signaling data via our VoicePeer CoValue
                peer.on("signal", (data: Peer.SignalData) => {
                    if (myPeerCoValueRef.current) {
                        (myPeerCoValueRef.current as any).$jazz.set("signalData", JSON.stringify(data));
                    }
                });

                // Handle incoming audio stream
                peer.on("stream", (remoteStream: MediaStream) => {
                    // Play remote audio
                    const audio = new Audio();
                    audio.srcObject = remoteStream;
                    audio.autoplay = true;
                    audio.play().catch(() => {
                        /* autoplay may be blocked */
                    });
                });

                peer.on("error", (err: Error) => {
                    console.error(
                        `[useVoiceChat] Peer error with ${vpAny.peerId}:`,
                        err
                    );
                });

                peer.on("close", () => {
                    peerConnectionsRef.current.delete(vpAny.peerId);
                });

                peerConnectionsRef.current.set(vpAny.peerId, peer);

                // Process any existing signal data from the remote peer
                if (vpAny.signalData) {
                    try {
                        const signalData = JSON.parse(vpAny.signalData);
                        peer.signal(signalData);
                    } catch {
                        /* ignore parse errors */
                    }
                }
            }
        }, 2000); // Poll every 2 seconds
    }, [channel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isConnected) {
                leave();
            }
        };
    }, []);

    return {
        isConnected,
        isMuted,
        peers,
        join,
        leave,
        toggleMute,
    };
}
