import { useState, useRef, useCallback, useEffect } from "react";
import Peer from "simple-peer";
import { VoicePeer, VoicePeerList, VoiceState } from "@/schema";

/**
 * useVoiceChat — Manages WebRTC P2P mesh voice connections.
 *
 * Architecture:
 *   - Each peer creates a VoicePeer CoValue with their peerId (random UUID)
 *   - Jazz CoValues handle signaling exchange (no external signaling server)
 *   - simple-peer handles WebRTC connection + audio stream piping
 *   - Full mesh: every peer connects to every other peer
 *   - AudioContext AnalyserNode detects speaking activity for visual feedback
 */

interface PeerInfo {
    peerId: string;
    peerName: string;
    isMuted: boolean;
    isSpeaking: boolean;
}

/** Threshold for audio level to consider "speaking" (0-255 range) */
const SPEAKING_THRESHOLD = 25;
/** How often to check audio levels (ms) */
const AUDIO_CHECK_INTERVAL = 100;

/**
 * Creates an AnalyserNode for a MediaStream and returns a function
 * that checks whether audio exceeds the speaking threshold.
 */
function createAudioAnalyser(stream: MediaStream) {
    try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        return {
            isSpeaking: () => {
                analyser.getByteFrequencyData(dataArray);
                // Average of frequency magnitudes
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                return average > SPEAKING_THRESHOLD;
            },
            cleanup: () => {
                source.disconnect();
                audioContext.close().catch(() => { });
            },
        };
    } catch {
        return {
            isSpeaking: () => false,
            cleanup: () => { },
        };
    }
}

export function useVoiceChat(channel: any, userName: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);

    // Refs for stable references across renders
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, Peer.Instance>>(new Map());
    const myPeerIdRef = useRef<string>(crypto.randomUUID());
    const myPeerCoValueRef = useRef<any>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isJoiningRef = useRef(false); // Guard against duplicate join() calls

    // Audio analysis refs
    const localAnalyserRef = useRef<{ isSpeaking: () => boolean; cleanup: () => void } | null>(null);
    const remoteAnalysersRef = useRef<Map<string, { isSpeaking: () => boolean; cleanup: () => void }>>(new Map());
    const audioCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Start monitoring audio levels for speaking detection.
     */
    const startAudioMonitoring = useCallback(() => {
        if (audioCheckIntervalRef.current) return;

        audioCheckIntervalRef.current = setInterval(() => {
            // Check local speaking
            if (localAnalyserRef.current) {
                setIsSpeaking(localAnalyserRef.current.isSpeaking());
            }

            // Check remote peers speaking (update peer info)
            setPeers((prevPeers) => {
                let changed = false;
                const updated = prevPeers.map((peer) => {
                    const analyser = remoteAnalysersRef.current.get(peer.peerId);
                    const speaking = analyser ? analyser.isSpeaking() : false;
                    if (speaking !== peer.isSpeaking) {
                        changed = true;
                        return { ...peer, isSpeaking: speaking };
                    }
                    return peer;
                });
                return changed ? updated : prevPeers;
            });
        }, AUDIO_CHECK_INTERVAL);
    }, []);

    /**
     * Stop audio monitoring.
     */
    const stopAudioMonitoring = useCallback(() => {
        if (audioCheckIntervalRef.current) {
            clearInterval(audioCheckIntervalRef.current);
            audioCheckIntervalRef.current = null;
        }
    }, []);

    /**
     * Remove any stale VoicePeer entries for our peerId from the channel's voice state.
     * This prevents ghost/clone entries when re-joining after an unclean leave.
     */
    const cleanupStalePeerEntries = useCallback((voiceState: any, peerId: string) => {
        if (!voiceState?.peers) return;

        try {
            const peersList = voiceState.peers;
            const items = Array.from(peersList).filter(Boolean);

            // Walk backwards to safely splice multiple matches
            for (let i = items.length - 1; i >= 0; i--) {
                const p = items[i] as any;
                if (p?.peerId === peerId) {
                    try {
                        (peersList as any).$jazz.splice(i, 1);
                    } catch (err) {
                        console.warn("[useVoiceChat] Failed to remove stale peer at index", i, err);
                    }
                }
            }
        } catch (err) {
            console.warn("[useVoiceChat] Error cleaning up stale peers:", err);
        }
    }, []);

    /**
     * Join the voice channel.
     */
    const join = useCallback(async () => {
        if (!channel) return;

        // Guard: prevent duplicate join() calls
        if (isJoiningRef.current) {
            console.warn("[useVoiceChat] join() already in progress, ignoring duplicate call");
            return;
        }
        isJoiningRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });
            localStreamRef.current = stream;

            // Set up local audio analyser for speaking detection
            localAnalyserRef.current = createAudioAnalyser(stream);

            // Ensure voice state exists on channel
            if (!channel.voiceState) {
                const ownerGroup = (channel as any)._owner;
                const voiceState = VoiceState.create(
                    { peers: VoicePeerList.create([], { owner: ownerGroup }) },
                    { owner: ownerGroup }
                );
                (channel as any).$jazz.set("voiceState", voiceState);
            }

            const voiceState = channel.voiceState;
            if (!voiceState || !voiceState.peers) {
                console.warn("[useVoiceChat] Voice state or peers not available");
                isJoiningRef.current = false;
                return;
            }

            // Generate a fresh peerId for this join session
            myPeerIdRef.current = crypto.randomUUID();

            // Clean up any stale entries from our previous peerId (shouldn't exist with fresh UUID,
            // but this also cleans up ghost entries from other crashed sessions)
            cleanupStalePeerEntries(voiceState, myPeerIdRef.current);

            const ownerGroup = (channel as any)._owner;

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

            (voiceState.peers as any).$jazz.push(voicePeer);

            setIsConnected(true);

            // Start polling for peers and audio monitoring
            startPeerPolling();
            startAudioMonitoring();
        } catch (err) {
            console.error("[useVoiceChat] Failed to join voice:", err);
        } finally {
            isJoiningRef.current = false;
        }
    }, [channel, userName, startAudioMonitoring, cleanupStalePeerEntries]);

    /**
     * Leave the voice channel.
     */
    const leave = useCallback(() => {
        // Stop polling & audio monitoring
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        stopAudioMonitoring();

        // Cleanup local analyser
        if (localAnalyserRef.current) {
            localAnalyserRef.current.cleanup();
            localAnalyserRef.current = null;
        }

        // Cleanup remote analysers
        remoteAnalysersRef.current.forEach((analyser) => analyser.cleanup());
        remoteAnalysersRef.current.clear();

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
        // Use peerId matching (more reliable than CoValue id matching)
        try {
            const voiceState = channel?.voiceState;
            if (voiceState?.peers && myPeerIdRef.current) {
                const peersList = voiceState.peers;
                const items = Array.from(peersList).filter(Boolean);

                // Walk backwards to safely remove all entries with our peerId
                for (let i = items.length - 1; i >= 0; i--) {
                    const p = items[i] as any;
                    if (p?.peerId === myPeerIdRef.current) {
                        try {
                            (peersList as any).$jazz.splice(i, 1);
                        } catch (err) {
                            console.warn("[useVoiceChat] Error removing peer at index", i, err);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("[useVoiceChat] Error removing peer from list:", err);
        }

        myPeerCoValueRef.current = null;
        isJoiningRef.current = false;
        setIsConnected(false);
        setIsSpeaking(false);
        setPeers([]);
        setIsMuted(false);
    }, [channel, stopAudioMonitoring]);

    /**
     * Toggle microphone mute state.
     */
    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);

        if (localStreamRef.current) {
            localStreamRef.current
                .getAudioTracks()
                .forEach((track) => (track.enabled = !newMuted));
        }

        // When muted, force speaking to false
        if (newMuted) {
            setIsSpeaking(false);
        }

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
                // Preserve existing isSpeaking state from audio analyser
                const existingAnalyser = remoteAnalysersRef.current.get(vpAny.peerId);
                peerInfoList.push({
                    peerId: vpAny.peerId,
                    peerName: vpAny.peerName,
                    isMuted: vpAny.isMuted,
                    isSpeaking: existingAnalyser ? existingAnalyser.isSpeaking() : false,
                });
            }
            setPeers(peerInfoList);

            // Establish WebRTC connections with new peers
            for (const vp of items) {
                const vpAny = vp as any;
                if (!vpAny || vpAny.peerId === myPeerIdRef.current) continue;

                if (peerConnectionsRef.current.has(vpAny.peerId)) {
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

                const isInitiator = myPeerIdRef.current > vpAny.peerId;

                if (!localStreamRef.current) continue;

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

                peer.on("signal", (data: Peer.SignalData) => {
                    if (myPeerCoValueRef.current) {
                        (myPeerCoValueRef.current as any).$jazz.set("signalData", JSON.stringify(data));
                    }
                });

                // Handle incoming audio stream — create analyser for speaking detection
                const remotePeerId = vpAny.peerId;
                peer.on("stream", (remoteStream: MediaStream) => {
                    // Play remote audio
                    const audio = new Audio();
                    audio.srcObject = remoteStream;
                    audio.autoplay = true;
                    audio.play().catch(() => {
                        /* autoplay may be blocked */
                    });

                    // Create analyser for this remote peer's audio
                    const analyser = createAudioAnalyser(remoteStream);
                    remoteAnalysersRef.current.set(remotePeerId, analyser);
                });

                peer.on("error", (err: Error) => {
                    console.error(
                        `[useVoiceChat] Peer error with ${vpAny.peerId}:`,
                        err
                    );
                });

                peer.on("close", () => {
                    peerConnectionsRef.current.delete(vpAny.peerId);
                    // Cleanup remote analyser
                    const analyser = remoteAnalysersRef.current.get(vpAny.peerId);
                    if (analyser) {
                        analyser.cleanup();
                        remoteAnalysersRef.current.delete(vpAny.peerId);
                    }
                });

                peerConnectionsRef.current.set(vpAny.peerId, peer);

                if (vpAny.signalData) {
                    try {
                        const signalData = JSON.parse(vpAny.signalData);
                        peer.signal(signalData);
                    } catch {
                        /* ignore parse errors */
                    }
                }
            }
        }, 2000);
    }, [channel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isConnected) {
                leave();
            }
        };
    }, [isConnected, leave]);

    return {
        isConnected,
        isMuted,
        isSpeaking,
        peers,
        join,
        leave,
        toggleMute,
    };
}
