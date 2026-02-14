import { useState, useEffect, useCallback, useRef } from "react";
import { TypingUser, TypingUserList, TypingState } from "@/schema";

/**
 * useTypingIndicator — Manages typing state for a text channel.
 *
 * How it works:
 *   - When the local user types, their TypingUser entry is updated with current timestamp
 *   - A poll interval checks remote users' lastTypedAt — if > 3s ago, they're no longer typing
 *   - When the local user stops typing for 3s, their entry is cleared
 *   - Jazz CoValues sync typing state to all connected peers
 */

const TYPING_TIMEOUT = 3000; // 3 seconds
const POLL_INTERVAL = 1000; // Check every second

export interface TypingInfo {
    /** List of users currently typing (excluding self) */
    typingUsers: string[];
    /** Notify the hook that the local user is typing */
    notifyTyping: () => void;
}

export function useTypingIndicator(channel: any, userName: string): TypingInfo {
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const myEntryRef = useRef<any>(null);
    const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Ensure typingState exists on channel
    const ensureTypingState = useCallback(() => {
        if (!channel) return null;
        try {
            if (!channel.typingState) {
                const ownerGroup = (channel as any)._owner;
                const typingState = TypingState.create(
                    { typingUsers: TypingUserList.create([], { owner: ownerGroup }) },
                    { owner: ownerGroup }
                );
                (channel as any).$jazz.set("typingState", typingState);
            }
            return channel.typingState;
        } catch {
            return null;
        }
    }, [channel]);

    // Notify that user is typing
    const notifyTyping = useCallback(() => {
        if (!channel) return;

        const typingState = ensureTypingState();
        if (!typingState?.typingUsers) return;

        const now = Date.now();

        try {
            if (myEntryRef.current) {
                // Update existing entry
                (myEntryRef.current as any).$jazz.set("lastTypedAt", now);
            } else {
                // Create new entry
                const ownerGroup = (channel as any)._owner;
                const entry = TypingUser.create(
                    { userName, lastTypedAt: now },
                    { owner: ownerGroup }
                );
                myEntryRef.current = entry;
                (typingState.typingUsers as any).$jazz.push(entry);
            }
        } catch {
            /* ignore — channel may have been deleted */
        }

        // Reset clear timeout
        if (clearTimeoutRef.current) {
            clearTimeout(clearTimeoutRef.current);
        }
        clearTimeoutRef.current = setTimeout(() => {
            removeMyEntry();
        }, TYPING_TIMEOUT);
    }, [channel, userName, ensureTypingState]);

    // Remove our typing entry
    const removeMyEntry = useCallback(() => {
        if (!myEntryRef.current || !channel?.typingState?.typingUsers) return;
        try {
            const list = channel.typingState.typingUsers;
            const items = Array.from(list);
            const idx = items.findIndex(
                (item: any) => item?.id === myEntryRef.current?.id
            );
            if (idx >= 0) {
                (list as any).$jazz.splice(idx, 1);
            }
        } catch {
            /* ignore */
        }
        myEntryRef.current = null;
    }, [channel]);

    // Poll for typing users
    useEffect(() => {
        if (!channel) return;

        pollRef.current = setInterval(() => {
            const typingState = channel.typingState;
            if (!typingState?.typingUsers) {
                setTypingUsers([]);
                return;
            }

            const now = Date.now();
            const items = Array.from(typingState.typingUsers).filter(Boolean) as any[];
            const active: string[] = [];

            for (const item of items) {
                if (!item?.userName || !item?.lastTypedAt) continue;
                if (item.userName === userName) continue; // Skip self
                if (now - item.lastTypedAt < TYPING_TIMEOUT) {
                    active.push(item.userName);
                }
            }

            setTypingUsers(active);
        }, POLL_INTERVAL);

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [channel, userName]);

    // Cleanup on channel change or unmount
    useEffect(() => {
        return () => {
            removeMyEntry();
            if (clearTimeoutRef.current) {
                clearTimeout(clearTimeoutRef.current);
                clearTimeoutRef.current = null;
            }
        };
    }, [channel, removeMyEntry]);

    return { typingUsers, notifyTyping };
}
