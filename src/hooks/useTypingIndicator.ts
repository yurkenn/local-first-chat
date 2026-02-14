import { useState, useEffect, useCallback, useRef } from "react";
import { TypingUser, TypingUserList, TypingState } from "@/schema";
import { getOwnerGroup, coSet, coPush, coSplice } from "@/lib/jazz-helpers";

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ownerGroup = getOwnerGroup(channel) as any;
                const typingState = TypingState.create(
                    { typingUsers: TypingUserList.create([], { owner: ownerGroup }) },
                    { owner: ownerGroup }
                );
                coSet(channel, "typingState", typingState);
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
                coSet(myEntryRef.current, "lastTypedAt", now);
            } else {
                // Create new entry
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ownerGroup = getOwnerGroup(channel) as any;
                const entry = TypingUser.create(
                    { userName, lastTypedAt: now },
                    { owner: ownerGroup }
                );
                myEntryRef.current = entry;
                coPush(typingState.typingUsers, entry);
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
                coSplice(list, idx, 1);
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
            const items = Array.from(typingState.typingUsers).filter(Boolean);
            const active: string[] = [];

            for (const item of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ti = item as any;
                if (!ti?.userName || !ti?.lastTypedAt) continue;
                if (ti.userName === userName) continue; // Skip self
                if (now - ti.lastTypedAt < TYPING_TIMEOUT) {
                    active.push(ti.userName);
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
