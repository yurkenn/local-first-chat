import { useState, useRef, useCallback, useEffect } from "react";
import { useRnnoise } from './useRnnoise';
import { VoicePeer, VoicePeerList, VoiceState } from "@/schema";
import { getOwnerGroup, coSet, coPush, coSplice } from "@/lib/jazz-helpers";
import { useAudioAnalysis } from "./useAudioAnalysis";
import { usePeerConnections } from "./usePeerConnections";
import type { PeerInfo } from "./useVoiceChatTypes";
import { handleError } from "@/lib/error-utils";
import type { AudioSettings } from "./useAudioSettings";

/**
 * useVoiceChat — Full-mesh voice chat via WebRTC + Jazz state.
 *
 * Architecture:
 *   - Jazz VoiceState CoValue acts as the signaling server (peer list + signal data)
 *   - simple-peer handles WebRTC connection + audio stream piping
 *   - Full mesh: every peer connects to every other peer
 *   - AudioContext AnalyserNode detects speaking activity for visual feedback
 *
 * Composed of:
 *   - useAudioAnalysis: speaking detection for local + remote peers
 *   - usePeerConnections: WebRTC peer management via simple-peer
 */



/**
 * Remove stale VoicePeer entries for a peerId from the channel's voice state.
 * Prevents ghost/clone entries when re-joining after an unclean leave.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanupStalePeers(voiceState: any, peerId: string) {
    if (!voiceState?.peers) return;
    try {
        const peersList = voiceState.peers;
        const items = Array.from(peersList).filter(Boolean);
        for (let i = items.length - 1; i >= 0; i--) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = items[i] as any;
            if (p?.peerId === peerId) {
                try {
                    coSplice(peersList, i, 1);
                } catch (err) {
                    console.warn("[useVoiceChat] Failed to remove stale peer at index", i, err);
                }
            }
        }
    } catch (err) {
        console.warn("[useVoiceChat] Error cleaning up stale peers:", err);
    }
}

/**
 * Remove any existing peers belonging to the same User ID.
 * This handles the "refresh page" scenario where a user comes back with a new peerId
 * but the old peer entry is still present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanupStaleUserPeers(voiceState: any, userId: string, currentPeerId: string) {
    if (!voiceState?.peers || !userId) return;
    try {
        const peersList = voiceState.peers;
        const items = Array.from(peersList).filter(Boolean);
        let removedCount = 0;

        for (let i = items.length - 1; i >= 0; i--) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = items[i] as any;

            // Remove if SAME userId but DIFFERENT peerId
            if (p?.userId === userId && p?.peerId !== currentPeerId) {
                try {
                    console.log("[useVoiceChat] Removing stale peer for user:", userId, "peerId:", p.peerId);
                    coSplice(peersList, i, 1);
                    removedCount++;
                } catch (err) {
                    console.warn("[useVoiceChat] Failed to remove stale user peer at index", i, err);
                }
            }
        }
        if (removedCount > 0) {
            console.log(`[useVoiceChat] Cleaned up ${removedCount} stale peer(s) for user ${userId}`);
        }
    } catch (err) {
        console.warn("[useVoiceChat] Error cleaning up stale user peers:", err);
    }
}

/**
 * Ensure the channel has a valid VoiceState and PeerList.
 * Creates them if missing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureVoiceState(channel: any) {
    let voiceState = channel.voiceState;
    let peersList = voiceState?.peers;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerGroup = getOwnerGroup(channel) as any;

    if (!voiceState) {
        // No voice state at all — create fresh VoiceState + PeerList
        peersList = VoicePeerList.create([], { owner: ownerGroup });
        voiceState = VoiceState.create(
            { peers: peersList },
            { owner: ownerGroup },
        );
        coSet(channel, "voiceState", voiceState);
        console.log("[useVoiceChat] Created new VoiceState + PeerList");
        return peersList;
    }

    if (!peersList) {
        // VoiceState exists but peers not loaded yet (Jazz lazy loading)
        peersList = voiceState.peers;

        // If still null (unlikely), create a new peersList
        if (!peersList) {
            try {
                peersList = VoicePeerList.create([], { owner: ownerGroup });
                coSet(voiceState, "peers", peersList);
            } catch (err) {
                console.error("[useVoiceChat] Failed to create PeerList:", err);
                return null;
            }
        }
    }
    return peersList;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVoiceChat(channel: any, userName: string, userId: string, audioSettings?: AudioSettings) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    // Destructure audio settings for easier access and dependency tracking
    const selectedInputId = audioSettings?.selectedInputId;
    const noiseSuppression = audioSettings?.noiseSuppression;
    const echoCancellation = audioSettings?.echoCancellation;
    const autoGainControl = audioSettings?.autoGainControl;
    const aiNoiseCancellation = audioSettings?.aiNoiseCancellation;

    // Refs for stable references across renders
    const localStreamRef = useRef<MediaStream | null>(null);
    const myPeerIdRef = useRef<string>(crypto.randomUUID());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myPeerCoValueRef = useRef<any>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isJoiningRef = useRef(false);

    // Keep a ref to the current channel to avoid stale closures in polling
    const channelRef = useRef(channel);
    useEffect(() => {
        channelRef.current = channel;
    }, [channel]);

    // Cleanup callbacks for usePeerConnections
    const addRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, stream);
            return newMap;
        });
    }, []);

    const removeRemoteStream = useCallback((peerId: string) => {
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
        });
    }, []);

    // Composed hooks
    const audioAnalysis = useAudioAnalysis();
    const peerConnections = usePeerConnections(audioAnalysis, addRemoteStream, removeRemoteStream);
    const { processStream, isLoaded: isRnnoiseLoaded, cleanup: cleanupRnnoise } = useRnnoise();

    /**
     * Join the voice channel.
     */
    const join = useCallback(async () => {
        // Use the ref to get the absolute latest channel instance
        const currentChannel = channelRef.current;

        // Guard: If already connected, do not join again.
        if (isConnected) {
            console.log("[useVoiceChat] Already connected, ignoring join request");
            return;
        }

        if (!currentChannel) return;
        if (isJoiningRef.current) {
            console.warn("[useVoiceChat] join() already in progress, ignoring duplicate call");
            return;
        }
        isJoiningRef.current = true;

        try {
            console.log("[useVoiceChat] join() starting — requesting mic...", selectedInputId);
            if (!navigator.mediaDevices) {
                console.warn("[useVoiceChat] navigator.mediaDevices not available");
                isJoiningRef.current = false;
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedInputId && selectedInputId !== "default"
                        ? { exact: selectedInputId }
                        : undefined,
                    // If AI Noise Cancellation is ON, disable native Noise Suppression to avoid double processing
                    // However, Echo Cancellation should usually remain ON unless AI handles it (RNNoise is mostly NS)
                    echoCancellation: echoCancellation ?? true,
                    noiseSuppression: aiNoiseCancellation ? false : (noiseSuppression ?? true),
                    // Enable AGC if any processing is on, otherwise it might be too quiet
                    autoGainControl: autoGainControl ?? true,
                },
                video: false,
            });

            // Apply AI Noise Cancellation if enabled and loaded
            let processedStream = stream;
            if (aiNoiseCancellation && isRnnoiseLoaded) {
                console.log("[useVoiceChat] Applying AI Noise Cancellation...");
                processedStream = await processStream(stream);
            }

            localStreamRef.current = processedStream;
            console.log("[useVoiceChat] Got local stream, tracks:", processedStream.getAudioTracks().length);

            // Set up local audio analyser
            audioAnalysis.setupLocalAnalyser(processedStream);

            // Ensure voice state exists on channel
            const peersList = ensureVoiceState(currentChannel);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(currentChannel) as any;

            if (!peersList) {
                console.warn("[useVoiceChat] Voice state peers still not available — giving up");
                processedStream.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
                isJoiningRef.current = false;
                return;
            }

            // Generate a fresh peerId for this join session
            myPeerIdRef.current = crypto.randomUUID();
            console.log("[useVoiceChat] My peerId:", myPeerIdRef.current);

            // Clean up ANY stale peers for this user before adding new one
            cleanupStalePeers({ peers: peersList }, myPeerIdRef.current); // safe check for ID collision
            cleanupStaleUserPeers({ peers: peersList }, userId, myPeerIdRef.current); // Check for ghost sessions

            const voicePeer = VoicePeer.create(
                {
                    peerId: myPeerIdRef.current,
                    targetPeerId: "", // Empty = announcement entry (not a signal)
                    signalData: "",
                    peerName: userName,
                    isMuted: false,
                    userId: userId,
                },
                { owner: ownerGroup },
            );
            myPeerCoValueRef.current = voicePeer;
            coPush(peersList, voicePeer);

            // Log existing peers count
            try {
                const existingPeers = Array.from(peersList).filter(Boolean);
                console.log("[useVoiceChat] Joined. Peers in room:", existingPeers.length);
            } catch { /* ignore */ }

            setIsConnected(true);
            audioAnalysis.startAudioMonitoring(setIsSpeaking, setPeers);
        } catch (err) {
            handleError(err, { context: "useVoiceChat", toast: "Failed to join voice channel" });
            setIsConnected(false);
        } finally {
            isJoiningRef.current = false;
        }
    }, [userName, userId, audioAnalysis, isConnected, selectedInputId, autoGainControl, aiNoiseCancellation, isRnnoiseLoaded, processStream, echoCancellation, noiseSuppression]);

    /**
     * Start polling for peers and establishing WebRTC connections.
     * Rewritten to use channelRef to avoid stale closures.
     */
    useEffect(() => {
        if (!isConnected) return;

        console.log("[useVoiceChat] Starting peer polling interval");

        const interval = setInterval(() => {
            const currentChannel = channelRef.current;

            // If we lost connection to channel or voice state, abort
            if (!currentChannel?.voiceState?.peers) {
                // console.warn("[useVoiceChat] Polling: voiceState or peers missing");
                return;
            }

            const voiceState = currentChannel.voiceState;
            const peersList = voiceState.peers;

            // 1. Process peers for connection & UI
            peerConnections.processPeerList(
                peersList,
                myPeerIdRef.current,
                localStreamRef.current,
                myPeerCoValueRef.current,
                setPeers,
            );

            // 2. Self-healing: Check if *I* am still in the peers list
            // Sometimes during sync or if we were kicked/pruned, we might disappear.
            // If so, and we think we are connected, re-add ourselves.
            try {
                const items = Array.from(peersList).filter(Boolean);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const amIPresent = items.some((p: any) => p.peerId === myPeerIdRef.current && (!p.targetPeerId || p.targetPeerId === ""));

                if (!amIPresent && myPeerCoValueRef.current) {
                    console.warn("[useVoiceChat] Self-healing: I am missing from peers list! Re-adding...");
                    coPush(peersList, myPeerCoValueRef.current);
                }
            } catch (err) {
                console.warn("[useVoiceChat] Self-healing check failed:", err);
            }

        }, 1000); // 1s polling for faster signal exchange

        pollIntervalRef.current = interval;

        return () => {
            if (interval) clearInterval(interval);
            pollIntervalRef.current = null;
        };
    }, [isConnected, peerConnections]);


    /**
     * Leave the voice channel.
     */
    const leave = useCallback(() => {
        // Stop polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Cleanup audio + peers
        audioAnalysis.cleanupAll();
        peerConnections.destroyAll();
        setRemoteStreams(new Map()); // Clear streams

        // Stop local audio stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Remove our VoicePeer from the channel's peer list
        const currentChannel = channelRef.current;
        try {
            const voiceState = currentChannel?.voiceState;
            if (voiceState?.peers && myPeerIdRef.current) {
                const peersList = voiceState.peers;
                const items = Array.from(peersList).filter(Boolean);
                for (let i = items.length - 1; i >= 0; i--) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const p = items[i] as any;
                    if (p?.peerId === myPeerIdRef.current) {
                        try {
                            coSplice(peersList, i, 1);
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
    }, [audioAnalysis, peerConnections]);

    /**
     * Handle page reload / close to clean up peer entry
     */
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isConnected) {
                leave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isConnected, leave]);

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

        if (newMuted) {
            setIsSpeaking(false);
        }

        if (myPeerCoValueRef.current) {
            try {
                coSet(myPeerCoValueRef.current, "isMuted", newMuted);
            } catch (err) {
                console.warn("[useVoiceChat] Failed to update mute state in Jazz:", err);
            }
        }
    }, [isMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isConnected) {
                // We can't easily call leave() here because it might depend on state that is unmounting
                // But we should at least stop tracks
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => t.stop());
                }
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
            }
        };
    }, [isConnected]);

    // Handle Deafen state (mute remote streams + sync to CoValue for peers)
    useEffect(() => {
        if (!audioSettings) return;
        const deafened = audioSettings.isDeafened;

        // 1. Mute/unmute all incoming remote streams
        remoteStreams.forEach((stream) => {
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !deafened;
            });
        });

        // 2. Disable local mic tracks when deafened
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = deafened ? false : !isMuted;
            });
        }

        if (deafened) {
            setIsSpeaking(false);
        }

        // 3. Sync deafen + mute state to CoValue so peers see correct icon
        if (myPeerCoValueRef.current) {
            try {
                coSet(myPeerCoValueRef.current, "isDeafened", deafened);
                coSet(myPeerCoValueRef.current, "isMuted", deafened ? true : isMuted);
            } catch (err) {
                console.warn("[useVoiceChat] Failed to update deafen state in Jazz:", err);
            }
        }
    }, [remoteStreams, audioSettings?.isDeafened, isMuted]);

    /**
     * Live Audio Settings Update
     * Watch for changes in input device or processing options and hot-swap the stream.
     */
    useEffect(() => {
        if (!isConnected || isJoiningRef.current) return;
        if (!audioSettings) return;

        const handleAudioChange = async () => {
            console.log("[useVoiceChat] Audio settings changed, updating stream...", {
                deviceId: selectedInputId,
                echo: echoCancellation,
                noise: noiseSuppression,
                agc: autoGainControl,
                aiNoise: aiNoiseCancellation
            });

            try {
                if (!navigator.mediaDevices) {
                    console.warn("[useVoiceChat] navigator.mediaDevices not available for stream update");
                    return;
                }
                let newStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: selectedInputId && selectedInputId !== "default"
                            ? { exact: selectedInputId }
                            : undefined,
                        echoCancellation: echoCancellation ?? true,
                        noiseSuppression: aiNoiseCancellation ? false : (noiseSuppression ?? true),
                        // Enable AGC if any processing is on, otherwise it might be too quiet
                        autoGainControl: autoGainControl ?? true,
                    },
                    video: false,
                });

                // Apply AI Noise Cancellation if enabled and loaded
                if (aiNoiseCancellation && isRnnoiseLoaded) {
                    newStream = await processStream(newStream);
                } else {
                    cleanupRnnoise();
                }

                const oldStream = localStreamRef.current;

                // 1. Update local ref
                localStreamRef.current = newStream;

                // 2. Update local analyser (so visualizer works with new stream)
                audioAnalysis.setupLocalAnalyser(newStream);

                // 3. Replace track in all peer connections
                peerConnections.replaceStream(oldStream, newStream);

                // 4. Update mute state on new stream
                newStream.getAudioTracks().forEach(t => t.enabled = !isMuted);

                // 5. Cleanup old stream
                if (oldStream) {
                    oldStream.getTracks().forEach(t => t.stop());
                }

            } catch (err) {
                console.error("[useVoiceChat] Failed to update audio stream:", err);
                // Fallback: maybe notify user?
            }
        };

        handleAudioChange();

        // We depend on specific settings to trigger this
    }, [
        isConnected,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        audioSettings?.selectedInputId,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        echoCancellation,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        noiseSuppression,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        autoGainControl,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        aiNoiseCancellation,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        isRnnoiseLoaded
    ]);

    return {
        isConnected,
        isMuted,
        isSpeaking,
        peers,
        remoteStreams,
        join,
        leave,
        toggleMute,
    };
}

// Re-export types for consumers
export type { PeerInfo } from "./useVoiceChatTypes";
