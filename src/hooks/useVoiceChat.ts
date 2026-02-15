import { useState, useRef, useCallback, useEffect } from "react";
import { VoicePeer, VoicePeerList, VoiceState } from "@/schema";
import { getOwnerGroup, coSet, coPush, coSplice } from "@/lib/jazz-helpers";
import { useAudioAnalysis } from "./useAudioAnalysis";
import { usePeerConnections } from "./usePeerConnections";
import type { PeerInfo } from "./useVoiceChatTypes";
import { handleError } from "@/lib/error-utils";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVoiceChat(channel: any, userName: string) {
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
    const cleanupStalePeerEntries = useCallback((voiceState: any, peerId: string) => {
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
    }, []);

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
            console.log("[useVoiceChat] join() starting — requesting mic...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });
            localStreamRef.current = stream;
            console.log("[useVoiceChat] Got local stream, tracks:", stream.getAudioTracks().length);

            // Set up local audio analyser
            audioAnalysis.setupLocalAnalyser(stream);

            // Ensure voice state exists on channel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let voiceState: any = currentChannel.voiceState;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let peersList: any = voiceState?.peers;

            // DEBUG: Log CoValue IDs to check for split-brain
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const channelId = (currentChannel as any)?.$jazz?.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const voiceStateId = (voiceState as any)?.$jazz?.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const peersListId = (peersList as any)?.$jazz?.id;

            console.log("[useVoiceChat] DEBUG IDs:", {
                channelId,
                voiceStateId,
                peersListId,
                voiceStateExists: !!voiceState,
                peersListExists: !!peersList
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(currentChannel) as any;

            if (!voiceState) {
                // No voice state at all — create fresh VoiceState + PeerList
                peersList = VoicePeerList.create([], { owner: ownerGroup });
                voiceState = VoiceState.create(
                    { peers: peersList },
                    { owner: ownerGroup },
                );
                coSet(currentChannel, "voiceState", voiceState);
                console.log("[useVoiceChat] Created new VoiceState + PeerList", {
                    newVoiceStateId: (voiceState as any)?.$jazz?.id,
                    newPeersListId: (peersList as any)?.$jazz?.id
                });
            } else if (!peersList) {
                // VoiceState exists but peers not loaded yet (Jazz lazy loading)
                // Wait with retries for Jazz to sync the nested CoValue
                console.log("[useVoiceChat] Waiting for peers to load...");
                for (let retry = 0; retry < 10; retry++) {
                    await new Promise((r) => setTimeout(r, 500));
                    // Re-read from channel in case Jazz synced it
                    voiceState = currentChannel.voiceState;
                    peersList = voiceState?.peers;
                    if (peersList) {
                        console.log("[useVoiceChat] Peers loaded after retry", retry + 1, {
                            loadedPeersListId: (peersList as any)?.$jazz?.id
                        });
                        break;
                    }
                    console.log("[useVoiceChat] Retry", retry + 1, "- peers still null");
                }

                // If still null after retries, create a new peersList
                if (!peersList) {
                    console.log("[useVoiceChat] Creating new PeerList after retries exhausted");
                    try {
                        peersList = VoicePeerList.create([], { owner: ownerGroup });
                        coSet(voiceState, "peers", peersList);
                        console.log("[useVoiceChat] Created replacement PeerList", {
                            replacementPeersListId: (peersList as any)?.$jazz?.id
                        });
                    } catch (err) {
                        console.error("[useVoiceChat] Failed to create PeerList:", err);
                    }
                }
            }

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
            cleanupStalePeerEntries({ peers: peersList }, myPeerIdRef.current);

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

            // Log existing peers in the list
            try {
                const existingPeers = Array.from(peersList).filter(Boolean);
                console.log("[useVoiceChat] Peers in voice state:", existingPeers.length,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    existingPeers.map((p: any) => ({
                        peerId: p?.peerId?.slice(0, 8),
                        name: p?.peerName,
                        target: p?.targetPeerId ? p.targetPeerId.slice(0, 8) : 'BROADCAST'
                    })));
            } catch { /* ignore */ }

            setIsConnected(true);
            audioAnalysis.startAudioMonitoring(setIsSpeaking, setPeers);
        } catch (err) {
            handleError(err, { context: "useVoiceChat", toast: "Failed to join voice channel" });
            setIsConnected(false);
        } finally {
            isJoiningRef.current = false;
        }
    }, [userName, audioAnalysis, cleanupStalePeerEntries, isConnected]); // Added isConnected dep

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
                console.warn("[useVoiceChat] Polling: voiceState or peers missing");
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
