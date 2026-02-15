import { useState, useRef, useCallback, useEffect } from "react";
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
export function useVoiceChat(channel: any, userName: string, audioSettings?: AudioSettings) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

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

    /**
     * Remove stale VoicePeer entries for a peerId from the channel's voice state.
     * Prevents ghost/clone entries when re-joining after an unclean leave.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any


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
            console.log("[useVoiceChat] join() starting — requesting mic...", audioSettings?.selectedInputId);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: audioSettings?.selectedInputId && audioSettings.selectedInputId !== "default"
                        ? { exact: audioSettings.selectedInputId }
                        : undefined,
                    echoCancellation: audioSettings?.echoCancellation ?? true,
                    noiseSuppression: audioSettings?.noiseSuppression ?? true,
                    autoGainControl: false, // Disabled to reduce hissing/feedback
                },
                video: false,
            });
            localStreamRef.current = stream;
            console.log("[useVoiceChat] Got local stream, tracks:", stream.getAudioTracks().length);

            // Set up local audio analyser
            audioAnalysis.setupLocalAnalyser(stream);

            // Ensure voice state exists on channel
            const peersList = ensureVoiceState(currentChannel);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(currentChannel) as any;

            if (!peersList) {
                console.warn("[useVoiceChat] Voice state peers still not available — giving up");
                stream.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
                isJoiningRef.current = false;
                return;
            }

            // Generate a fresh peerId for this join session
            myPeerIdRef.current = crypto.randomUUID();
            console.log("[useVoiceChat] My peerId:", myPeerIdRef.current);
            cleanupStalePeers({ peers: peersList }, myPeerIdRef.current);

            const voicePeer = VoicePeer.create(
                {
                    peerId: myPeerIdRef.current,
                    targetPeerId: "", // Empty = announcement entry (not a signal)
                    signalData: "",
                    peerName: userName,
                    isMuted: false,
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
    }, [userName, audioAnalysis, isConnected, audioSettings?.selectedInputId]);

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
            coSet(myPeerCoValueRef.current, "isMuted", newMuted);
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

    // Handle Deafen state (mute all incoming remote streams)
    useEffect(() => {
        if (!audioSettings) return;
        remoteStreams.forEach((stream) => {
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !audioSettings.isDeafened;
            });
        });
    }, [remoteStreams, audioSettings?.isDeafened]);

    /**
     * Live Audio Settings Update
     * Watch for changes in input device or processing options and hot-swap the stream.
     */
    useEffect(() => {
        if (!isConnected || isJoiningRef.current) return;
        if (!audioSettings) return;

        const handleAudioChange = async () => {
            console.log("[useVoiceChat] Audio settings changed, updating stream...", {
                deviceId: audioSettings.selectedInputId,
                echo: audioSettings.echoCancellation,
                noise: audioSettings.noiseSuppression
            });

            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: audioSettings.selectedInputId && audioSettings.selectedInputId !== "default"
                            ? { exact: audioSettings.selectedInputId }
                            : undefined,
                        echoCancellation: audioSettings.echoCancellation ?? true,
                        noiseSuppression: audioSettings.noiseSuppression ?? true,
                        autoGainControl: false,
                    },
                    video: false,
                });

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
        audioSettings?.echoCancellation,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        audioSettings?.noiseSuppression
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
