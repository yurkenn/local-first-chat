import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import type { AudioSettings } from "@/hooks/useAudioSettings";

/**
 * useVoiceState — App-level voice state management.
 *
 * Separates "which voice channel am I connected to" from "which channel am I viewing".
 * This enables Discord-like behavior: stay in voice while browsing text channels.
 */

export interface VoiceStateReturn {
    /** The voice channel we're currently connected to (or null) */
    connectedChannel: any | null;
    /** Whether we're connected to a voice channel */
    isConnected: boolean;
    /** Whether a join is in progress (for loading UI) */
    isJoining: boolean;
    /** Whether our mic is muted */
    isMuted: boolean;
    /** Whether we are currently speaking */
    isSpeaking: boolean;
    /** List of peers in the voice channel */
    peers: Array<{ peerId: string; peerName: string; isMuted: boolean; isSpeaking: boolean }>;
    /** Map of remote peer IDs to their audio streams */
    remoteStreams: Map<string, MediaStream>;
    /** Join a voice channel (auto-leaves current if any) */
    joinVoice: (channel: any) => void;
    /** Leave the current voice channel */
    leaveVoice: () => void;
    /** Toggle mic mute */
    toggleMute: () => void;
}

export function useVoiceState(userName: string, audioSettings?: AudioSettings): VoiceStateReturn {
    const [connectedChannel, setConnectedChannel] = useState<any | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const joiningRef = useRef(false); // Ref mirror to avoid stale closures

    const { isConnected, isMuted, isSpeaking, peers, remoteStreams, join, leave, toggleMute } =
        useVoiceChat(connectedChannel, userName, audioSettings);

    // Keep ref in sync
    joiningRef.current = isJoining;

    // When channel changes + we're in joining state, trigger join
    // This effect fires after useVoiceChat has re-initialized with the new channel
    useEffect(() => {
        if (!joiningRef.current || !connectedChannel) return;

        // Small delay to ensure useVoiceChat has the new channel reference
        const timer = setTimeout(() => {
            join();
        }, 50);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectedChannel]);

    // Clear isJoining when connection is established
    useEffect(() => {
        if (isConnected && isJoining) {
            setIsJoining(false);
        }
    }, [isConnected, isJoining]);

    // Safety timeout — if stuck in joining for 8s, reset
    useEffect(() => {
        if (!isJoining) return;

        const timeout = setTimeout(() => {
            if (joiningRef.current && !isConnected) {
                console.warn("[useVoiceState] Join timed out after 8s, resetting");
                setIsJoining(false);
            }
        }, 8000);

        return () => clearTimeout(timeout);
    }, [isJoining, isConnected]);

    const joinVoice = useCallback(
        (channel: any) => {
            const channelId = channel?.$jazz?.id;
            const currentId = connectedChannel?.$jazz?.id;

            // If already connected to this channel or join in progress, do nothing
            if (joiningRef.current) return;
            if (channelId && channelId === currentId && isConnected) return;

            // If connected to a different channel, leave first
            if (isConnected) {
                leave();
            }

            // Set joining state to prevent duplicate clicks
            setIsJoining(true);

            // Set the new channel — this triggers re-render of useVoiceChat,
            // and the effect above will call join() once the hook is ready
            setConnectedChannel(channel);
        },
        [connectedChannel, isConnected, leave]
    );

    const leaveVoice = useCallback(() => {
        leave();
        setIsJoining(false);
        setConnectedChannel(null);
    }, [leave]);

    return {
        connectedChannel,
        isConnected,
        isJoining,
        isMuted,
        isSpeaking,
        peers,
        remoteStreams,
        joinVoice,
        leaveVoice,
        toggleMute,
    };
}
