import { useState, useRef, useCallback, useEffect } from "react";
import { VoicePeer, VoicePeerList, VoiceState } from "@/schema";
import { getOwnerGroup, coSet, coPush, coSplice } from "@/lib/jazz-helpers";
import { useAudioAnalysis } from "./useAudioAnalysis";
import { usePeerConnections } from "./usePeerConnections";
import type { PeerInfo } from "./useVoiceChatTypes";

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

    // Refs for stable references across renders
    const localStreamRef = useRef<MediaStream | null>(null);
    const myPeerIdRef = useRef<string>(crypto.randomUUID());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myPeerCoValueRef = useRef<any>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isJoiningRef = useRef(false);

    // Composed hooks
    const audioAnalysis = useAudioAnalysis();
    const peerConnections = usePeerConnections(audioAnalysis);

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
     * Start polling for peers and establishing WebRTC connections.
     */
    const startPeerPolling = useCallback(() => {
        if (pollIntervalRef.current) return;

        pollIntervalRef.current = setInterval(() => {
            if (!channel?.voiceState?.peers) return;
            peerConnections.processPeerList(
                channel.voiceState.peers,
                myPeerIdRef.current,
                localStreamRef.current,
                myPeerCoValueRef.current,
                setPeers,
            );
        }, 2000);
    }, [channel, peerConnections]);

    /**
     * Join the voice channel.
     */
    const join = useCallback(async () => {
        if (!channel) return;
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

            // Set up local audio analyser
            audioAnalysis.setupLocalAnalyser(stream);

            // Ensure voice state exists on channel
            if (!channel.voiceState) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ownerGroup = getOwnerGroup(channel) as any;
                const voiceState = VoiceState.create(
                    { peers: VoicePeerList.create([], { owner: ownerGroup }) },
                    { owner: ownerGroup },
                );
                coSet(channel, "voiceState", voiceState);
            }

            const voiceState = channel.voiceState;
            if (!voiceState || !voiceState.peers) {
                console.warn("[useVoiceChat] Voice state or peers not available");
                isJoiningRef.current = false;
                return;
            }

            // Generate a fresh peerId for this join session
            myPeerIdRef.current = crypto.randomUUID();
            cleanupStalePeerEntries(voiceState, myPeerIdRef.current);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(channel) as any;
            const voicePeer = VoicePeer.create(
                {
                    peerId: myPeerIdRef.current,
                    signalData: "",
                    peerName: userName,
                    isMuted: false,
                },
                { owner: ownerGroup },
            );
            myPeerCoValueRef.current = voicePeer;
            coPush(voiceState.peers, voicePeer);

            setIsConnected(true);
            startPeerPolling();
            audioAnalysis.startAudioMonitoring(setIsSpeaking, setPeers);
        } catch (err) {
            console.error("[useVoiceChat] Failed to join voice:", err);
        } finally {
            isJoiningRef.current = false;
        }
    }, [channel, userName, audioAnalysis, cleanupStalePeerEntries, startPeerPolling]);

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

        // Stop local audio stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Remove our VoicePeer from the channel's peer list
        try {
            const voiceState = channel?.voiceState;
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
    }, [channel, audioAnalysis, peerConnections]);

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

// Re-export types for consumers
export type { PeerInfo } from "./useVoiceChatTypes";
