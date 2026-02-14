/**
 * useNotifications.ts — Unread message tracking and browser notifications.
 *
 * Tracks the last-read message timestamp per channel in localStorage.
 * Calculates unread counts and fires browser notifications for new messages.
 */

import { useState, useEffect, useCallback, useRef } from "react";

/** localStorage key prefix for read positions */
const READ_POSITION_PREFIX = "lotus_read_";

interface UnreadState {
    /** Map of channelId → unread message count */
    unreadCounts: Map<string, number>;
    /** Total unread across all channels */
    totalUnread: number;
}

interface UseNotificationsProps {
    /** All channels with their messages (flat array from all servers) */
    channels: Array<{
        id: string;
        name: string;
        messages: any[];
        channelType: string;
    }>;
    /** Currently active channel ID (messages here are considered "read") */
    activeChannelId: string | null;
    /** Current user's display name (to exclude own messages from notifications) */
    userName: string;
}

/**
 * Get the stored read position (timestamp) for a channel.
 */
function getReadPosition(channelId: string): number {
    try {
        const stored = localStorage.getItem(`${READ_POSITION_PREFIX}${channelId}`);
        return stored ? parseInt(stored, 10) : 0;
    } catch {
        return 0;
    }
}

/**
 * Store the read position for a channel.
 */
function setReadPosition(channelId: string, timestamp: number): void {
    try {
        localStorage.setItem(`${READ_POSITION_PREFIX}${channelId}`, String(timestamp));
    } catch {
        /* localStorage may be full or unavailable */
    }
}

/**
 * Request browser notification permission (once).
 */
function requestNotificationPermission(): void {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {
            /* user dismissed */
        });
    }
}

/**
 * Show a browser notification for a new message.
 */
function showNotification(channelName: string, senderName: string, content: string): void {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        try {
            const notification = new Notification(`#${channelName}`, {
                body: `${senderName}: ${content.slice(0, 100)}`,
                icon: "/lotus-192.png",
                tag: `lotus-${channelName}`,
                silent: false,
            });
            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        } catch {
            /* Notification API may not be available */
        }
    }
}

export function useNotifications({ channels, activeChannelId, userName }: UseNotificationsProps) {
    const [unreadState, setUnreadState] = useState<UnreadState>({
        unreadCounts: new Map(),
        totalUnread: 0,
    });
    const prevMessageCountsRef = useRef<Map<string, number>>(new Map());
    const hasRequestedPermission = useRef(false);

    // Request notification permission on first use
    useEffect(() => {
        if (!hasRequestedPermission.current) {
            hasRequestedPermission.current = true;
            requestNotificationPermission();
        }
    }, []);

    // Mark active channel as read
    useEffect(() => {
        if (!activeChannelId) return;

        const channel = channels.find((c) => c.id === activeChannelId);
        if (!channel || !channel.messages || channel.messages.length === 0) return;

        const lastMessage = channel.messages[channel.messages.length - 1];
        if (lastMessage?.createdAt) {
            setReadPosition(activeChannelId, lastMessage.createdAt);
        }
    }, [activeChannelId, channels]);

    // Calculate unread counts and fire notifications
    useEffect(() => {
        const newCounts = new Map<string, number>();
        let total = 0;

        for (const channel of channels) {
            if (channel.channelType !== "text" || !channel.messages) continue;

            const readPos = getReadPosition(channel.id);
            const messages = channel.messages;

            // Count unread messages (after read position, not from self)
            let unread = 0;
            for (const msg of messages) {
                if (!msg) continue;
                if (msg.createdAt > readPos && msg.senderName !== userName) {
                    unread++;
                }
            }

            // Check for truly new messages (not from initial load)
            const prevCount = prevMessageCountsRef.current.get(channel.id) || 0;
            const currentCount = messages.length;

            if (currentCount > prevCount && prevCount > 0) {
                // New message arrived — fire notification if not active channel
                if (channel.id !== activeChannelId) {
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg && lastMsg.senderName !== userName) {
                        showNotification(channel.name, lastMsg.senderName, lastMsg.content);
                    }
                }
            }

            prevMessageCountsRef.current.set(channel.id, currentCount);

            if (unread > 0) {
                newCounts.set(channel.id, unread);
                total += unread;
            }
        }

        setUnreadState({ unreadCounts: newCounts, totalUnread: total });
    }, [channels, activeChannelId, userName]);

    /**
     * Mark a specific channel as read.
     */
    const markAsRead = useCallback((channelId: string) => {
        const channel = channels.find((c) => c.id === channelId);
        if (!channel?.messages?.length) return;

        const lastMessage = channel.messages[channel.messages.length - 1];
        if (lastMessage?.createdAt) {
            setReadPosition(channelId, lastMessage.createdAt);
        }
    }, [channels]);

    /**
     * Get unread count for a specific channel.
     */
    const getUnreadCount = useCallback(
        (channelId: string): number => {
            return unreadState.unreadCounts.get(channelId) || 0;
        },
        [unreadState.unreadCounts]
    );

    return {
        unreadCounts: unreadState.unreadCounts,
        totalUnread: unreadState.totalUnread,
        getUnreadCount,
        markAsRead,
    };
}
