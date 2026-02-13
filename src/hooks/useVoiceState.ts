import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";

/**
 * useVoiceState — App-level voice state management.
 *
 * Separates "which voice channel am I connected to" from "which channel am I viewing".
 * This enables Discord-like behavior: stay in voice while browsing text channels.
 *
 * Usage:
 *   const voice = useVoiceState(userName, allChannels);
 *   // Click voice channel → voice.joinVoice(channel)
 *   // Sidebar shows voice.connectedChannel, voice.peers, voice controls
 */

export interface VoiceStateReturn {
    /** The voice channel we're currently connected to (or null) */
    connectedChannel: any | null;
    /** Whether we're connected to a voice channel */
    isConnected: boolean;
    /** Whether our mic is muted */
    isMuted: boolean;
    /** List of peers in the voice channel */
    peers: Array<{ peerId: string; peerName: string; isMuted: boolean }>;
    /** Join a voice channel (auto-leaves current if any) */
    joinVoice: (channel: any) => void;
    /** Leave the current voice channel */
    leaveVoice: () => void;
    /** Toggle mic mute */
    toggleMute: () => void;
}

export function useVoiceState(userName: string): VoiceStateReturn {
    const [connectedChannel, setConnectedChannel] = useState<any | null>(null);
    const pendingJoinRef = useRef(false);

    // useVoiceChat manages the actual WebRTC connections
    const { isConnected, isMuted, peers, join, leave, toggleMute } =
        useVoiceChat(connectedChannel, userName);

    // When connectedChannel changes and we have a pending join, trigger it
    useEffect(() => {
        if (pendingJoinRef.current && connectedChannel) {
            pendingJoinRef.current = false;
            join();
        }
    }, [connectedChannel, join]);

    const joinVoice = useCallback(
        (channel: any) => {
            const channelId = channel?.$jazz?.id;
            const currentId = connectedChannel?.$jazz?.id;

            // If already connected to this channel, do nothing
            if (channelId && channelId === currentId && isConnected) return;

            // If connected to a different channel, leave first
            if (isConnected) {
                leave();
            }

            // Set the new channel and queue a join
            pendingJoinRef.current = true;
            setConnectedChannel(channel);
        },
        [connectedChannel, isConnected, leave]
    );

    const leaveVoice = useCallback(() => {
        leave();
        setConnectedChannel(null);
    }, [leave]);

    return {
        connectedChannel,
        isConnected,
        isMuted,
        peers,
        joinVoice,
        leaveVoice,
        toggleMute,
    };
}
