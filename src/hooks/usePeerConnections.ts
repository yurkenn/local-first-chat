import { useRef, useCallback } from "react";
import Peer from "simple-peer";
import { coPush, getOwnerGroup } from "@/lib/jazz-helpers";
import { VoicePeer } from "@/schema";
import type { PeerInfo } from "./useVoiceChatTypes";
import type { useAudioAnalysis } from "./useAudioAnalysis";

/**
 * Hook for managing WebRTC peer connections in voice chat.
 *
 * Architecture (FIXED):
 * - trickle: false — all ICE candidates are batched into a single offer/answer
 * - Signal routing via targetPeerId — each signal is addressed to a specific peer
 * - New VoicePeer CoValue entries are created per signal (push new signal entries to peers list)
 * - Each peer reads only signals addressed to them
 */
export function usePeerConnections(
    audioAnalysis: ReturnType<typeof useAudioAnalysis>,
    onRemoteStream: (peerId: string, stream: MediaStream) => void,
    onRemoteStreamRemoved: (peerId: string) => void,
) {
    const peerConnectionsRef = useRef<Map<string, Peer.Instance>>(new Map());
    // Track which signals we've already processed (by CoValue ID)
    const processedSignalsRef = useRef<Set<string>>(new Set());

    /**
     * Poll the VoiceState peer list for peers and signals.
     * - Builds peer list for UI
     * - Establishes WebRTC connections with new peers
     * - Routes signal data between peers
     */
    const processPeerList = useCallback(
        (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            voicePeers: any,
            myPeerId: string,
            localStream: MediaStream | null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            _myPeerCoValue: any, // kept for API compatibility
            setPeers: (peers: PeerInfo[]) => void,
        ) => {
            if (!voicePeers) return;

            const items = Array.from(voicePeers).filter(Boolean);

            // Build unique peers map (by peerId) for UI — exclude signal entries (targetPeerId !== "")
            const uniquePeers = new Map<string, PeerInfo>();
            // Keep track of all unique remote peerIds for connection purposes
            const remotePeerIds = new Set<string>();

            for (const vp of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vpAny = vp as any;
                if (!vpAny?.peerId || vpAny.peerId === myPeerId) continue;

                // Only add to UI peer list if this is an announcement entry (no targetPeerId)
                if (!vpAny.targetPeerId || vpAny.targetPeerId === "") {
                    remotePeerIds.add(vpAny.peerId);
                    if (!uniquePeers.has(vpAny.peerId)) {
                        const existingAnalyser = audioAnalysis.getRemoteAnalyser(vpAny.peerId);
                        uniquePeers.set(vpAny.peerId, {
                            peerId: vpAny.peerId,
                            peerName: vpAny.peerName || "Unknown",
                            isMuted: vpAny.isMuted ?? false,
                            isSpeaking: existingAnalyser ? existingAnalyser.isSpeaking() : false,
                        });
                    }
                }
            }

            setPeers(Array.from(uniquePeers.values()));

            // Debug: log discovered peers (simplified)
            // if (remotePeerIds.size > 0 || items.length > 0) {
            //    console.log("[usePeerConnections] peers:", remotePeerIds.size, "signals:", items.length);
            // }

            // Process signals addressed to me
            for (const vp of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vpAny = vp as any;
                if (!vpAny?.peerId || vpAny.peerId === myPeerId) continue;
                if (vpAny.targetPeerId !== myPeerId) continue; // Not addressed to me
                if (!vpAny.signalData) continue;

                // Check if we already processed this signal (by CoValue ID)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const signalId = (vpAny as any)?.$jazz?.id || "";
                if (signalId && processedSignalsRef.current.has(signalId)) continue;
                if (signalId) processedSignalsRef.current.add(signalId);

                const remotePeerId = vpAny.peerId;

                // If we don't have a connection to this peer yet, create one
                if (!peerConnectionsRef.current.has(remotePeerId)) {
                    if (!localStream) continue;
                    // We receive a signal, so we are NOT the initiator
                    const peer = createPeerConnection(
                        remotePeerId,
                        false, // not initiator — we're responding to their signal
                        localStream,
                        myPeerId,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        voicePeers as any,
                        audioAnalysis,
                        onRemoteStream,
                        onRemoteStreamRemoved,
                    );

                    // CRITICAL FIX: Clean up peer from map on close/error so we can reconnect
                    const cleanup = () => {
                        console.log("[usePeerConnections] Removing closed/error peer", remotePeerId.slice(0, 8));
                        if (peerConnectionsRef.current.get(remotePeerId) === peer) {
                            peerConnectionsRef.current.delete(remotePeerId);
                        }
                    };
                    peer.on("close", cleanup);
                    peer.on("error", cleanup);

                    peerConnectionsRef.current.set(remotePeerId, peer);
                }

                // Feed the signal to the peer connection
                const existingPeer = peerConnectionsRef.current.get(remotePeerId);
                if (existingPeer) {
                    try {
                        const signalData = JSON.parse(vpAny.signalData);
                        existingPeer.signal(signalData);
                    } catch (err) {
                        console.warn("[usePeerConnections] Failed to parse/apply signal:", err);
                    }
                }
            }

            // Create initiator connections for peers we don't have connections to yet
            for (const remotePeerId of remotePeerIds) {
                if (peerConnectionsRef.current.has(remotePeerId)) continue;
                if (!localStream) continue;

                const isInitiator = myPeerId > remotePeerId;
                if (!isInitiator) continue; // Only the "higher" peerId initiates

                const peer = createPeerConnection(
                    remotePeerId,
                    true, // initiator
                    localStream,
                    myPeerId,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    voicePeers as any,
                    audioAnalysis,
                    onRemoteStream,
                    onRemoteStreamRemoved,
                );

                // CRITICAL FIX: Clean up peer from map on close/error so we can reconnect
                const cleanup = () => {
                    console.log("[usePeerConnections] Removing closed/error peer", remotePeerId.slice(0, 8));
                    if (peerConnectionsRef.current.get(remotePeerId) === peer) {
                        peerConnectionsRef.current.delete(remotePeerId);
                    }
                };
                peer.on("close", cleanup);
                peer.on("error", cleanup);

                peerConnectionsRef.current.set(remotePeerId, peer);
            }
        },
        [audioAnalysis],
    );

    /** Destroy all peer connections and clean up. */
    const destroyAll = useCallback(() => {
        peerConnectionsRef.current.forEach((peer) => {
            try {
                peer.destroy();
            } catch {
                /* ignore cleanup errors */
            }
        });
        peerConnectionsRef.current.clear();
        processedSignalsRef.current.clear();
    }, []);

    /**
     * Replace the audio track in all active peer connections.
     * Used for hot-swapping microphone (e.g. changing device or toggling noise cancellation).
     */
    /**
     * Replace the audio track in all active peer connections.
     * Used for hot-swapping microphone (e.g. changing device or toggling noise cancellation).
     */
    const replaceStream = useCallback((oldStream: MediaStream | null, newStream: MediaStream) => {
        const newTrack = newStream.getAudioTracks()[0];
        if (!newTrack) {
            console.warn("[usePeerConnections] replaceStream: New stream has no audio track");
            return;
        }

        peerConnectionsRef.current.forEach((peer, peerId) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = peer as any;
                const pc = p._pc as RTCPeerConnection;

                if (pc) {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (sender && sender.track) {
                        console.log(`[usePeerConnections] Found active audio sender for ${peerId.slice(0, 8)}, replacing track...`);
                        sender.replaceTrack(newTrack)
                            .then(() => console.log(`[usePeerConnections] Successfully replaced track for ${peerId.slice(0, 8)}`))
                            .catch(err => console.error(`[usePeerConnections] Failed native replaceTrack for ${peerId}:`, err));
                        return; // Done for this peer
                    }
                }

                // Fallback to simple-peer method if native check fails (or if we couldn't find sender)
                if (oldStream) {
                    const oldTrack = oldStream.getAudioTracks()[0];
                    if (oldTrack) {
                        peer.replaceTrack(oldTrack, newTrack, oldStream);
                    }
                }
            } catch (err) {
                console.error("[usePeerConnections] Failed to replace track for peer", peerId, err);
            }
        });
    }, []);

    return { processPeerList, destroyAll, replaceStream };
}

/**
 * Create a single WebRTC peer connection via simple-peer.
 *
 * KEY FIX: trickle: false — batches all ICE candidates into a single signal.
 * This means the `signal` event fires exactly once per connection side,
 * making our CoValue-based signaling work correctly.
 */
function createPeerConnection(
    remotePeerId: string,
    isInitiator: boolean,
    localStream: MediaStream,
    myPeerId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voicePeers: any,
    audioAnalysis: ReturnType<typeof useAudioAnalysis>,
    onRemoteStream: (peerId: string, stream: MediaStream) => void,
    onRemoteStreamRemoved: (peerId: string) => void,
): Peer.Instance {
    const peer = new Peer({
        initiator: isInitiator,
        stream: localStream,
        trickle: false, // CRITICAL: batch all ICE candidates into one signal
        config: {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                // Free TURN servers (OpenRelay) for NAT traversal
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443?transport=tcp",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        },
    });

    peer.on("signal", (data: Peer.SignalData) => {
        // Create a new VoicePeer entry with this signal, addressed to the remote peer
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(voicePeers) as any;
            if (ownerGroup) {
                const signalEntry = VoicePeer.create(
                    {
                        peerId: myPeerId,
                        userId: myPeerId,
                        targetPeerId: remotePeerId,
                        signalData: JSON.stringify(data),
                        peerName: "",
                        isMuted: false,
                    },
                    { owner: ownerGroup },
                );
                coPush(voicePeers, signalEntry);
            }
        } catch (err) {
            console.error("[usePeerConnections] Failed to push signal:", err);
        }
    });

    peer.on("connect", () => {
        console.log("[usePeerConnections] ✅ Connected to", remotePeerId.slice(0, 8));
    });

    peer.on("stream", (remoteStream: MediaStream) => {
        // Pass stream up to UI for rendering in <audio> tag
        onRemoteStream(remotePeerId, remoteStream);

        // Create analyser for this remote peer's audio
        audioAnalysis.addRemoteAnalyser(remotePeerId, remoteStream);
    });

    peer.on("error", (err: Error) => {
        console.error(`[usePeerConnections] ❌ Peer error with ${remotePeerId.slice(0, 8)}:`, err.message);
    });

    peer.on("close", () => {
        console.log("[usePeerConnections] Peer closed:", remotePeerId.slice(0, 8));
        onRemoteStreamRemoved(remotePeerId);
        audioAnalysis.removeRemoteAnalyser(remotePeerId);
    });

    return peer;
}
