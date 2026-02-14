/**
 * jazz-helpers.ts — Type-safe wrappers for Jazz CoValue operations.
 *
 * Eliminates `(x as any).$jazz.xxx` patterns throughout the codebase
 * by providing typed utility functions for common Jazz operations.
 *
 * These helpers use `any` internally at the SDK boundary,
 * but expose type-safe public APIs.
 */

import type { ChatServer, Channel, ChatMessage } from "@/schema";

// ─── CoValue ID Helpers ──────────────────────────────────────────────────────

/**
 * Get the CoValue ID from any Jazz CoValue.
 * Replaces: `(x as any).$jazz.id`
 */
export function getCoId(coValue: unknown): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (coValue as any)?.$jazz?.id;
}

// ─── CoMap Operations ────────────────────────────────────────────────────────

/**
 * Set a field on a CoMap.
 * Replaces: `(x as any).$jazz.set("field", value)`
 */
export function coSet<T>(coValue: unknown, field: string, value: T): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cv = coValue as any;
    if (cv?.$jazz?.set) {
        cv.$jazz.set(field, value);
    }
}

/**
 * Check if a field exists on a CoMap.
 * Replaces: `(x as any).$jazz.has("field")`
 */
export function coHas(coValue: unknown, field: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (coValue as any)?.$jazz?.has?.(field) ?? false;
}

// ─── CoList Operations ───────────────────────────────────────────────────────

/**
 * Push an item onto a CoList.
 * Replaces: `(x as any).$jazz.push(item)`
 */
export function coPush<T>(coList: unknown, item: T): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cl = coList as any;
    if (cl?.$jazz?.push) {
        cl.$jazz.push(item);
    }
}

/**
 * Splice items from a CoList.
 * Replaces: `(x as any).$jazz.splice(start, deleteCount)`
 */
export function coSplice(coList: unknown, start: number, deleteCount: number): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cl = coList as any;
    if (cl?.$jazz?.splice) {
        cl.$jazz.splice(start, deleteCount);
    }
}

/**
 * Convert a CoList to a typed array, filtering nulls.
 * Replaces: `Array.from(coList).filter(Boolean) as T[]`
 */
export function coToArray<T = unknown>(coList: unknown): T[] {
    if (!coList) return [];
    return Array.from(coList as Iterable<T | null | undefined>).filter(Boolean) as T[];
}

// ─── Ownership ───────────────────────────────────────────────────────────────

/**
 * Get the owner Group of a CoValue.
 * Replaces: `(channel as any)._owner`
 */
export function getOwnerGroup(coValue: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (coValue as any)?._owner;
}

// ─── Account Helpers ─────────────────────────────────────────────────────────

/**
 * Check if a Jazz account has fully loaded.
 * Replaces: `me && (me as any).$isLoaded`
 */
export function isAccountLoaded(account: unknown): boolean {
    if (!account) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (account as any)?.$isLoaded ?? false;
}

/**
 * Get the profile name from a loaded account.
 * Replaces: `(me as any)?.profile?.name`
 */
export function getProfileName(account: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (account as any)?.profile?.name ?? "Anonymous";
}

/**
 * Get the server list from a loaded account.
 * Replaces: `(me as any)?.root?.servers`
 */
export function getServerList(account: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (account as any)?.root?.servers;
}

/**
 * Get servers as a typed array from an account.
 * Replaces: `servers ? Array.from(servers).filter(Boolean) : []`
 */
export function getServerArray(account: unknown): ChatServer[] {
    const servers = getServerList(account);
    return coToArray<ChatServer>(servers);
}

// ─── Server Helpers ──────────────────────────────────────────────────────────

/**
 * Find a server by its CoValue ID.
 * Replaces: `serverArray.find((s: any) => s?.$jazz?.id === id)`
 */
export function findServerById(servers: ChatServer[], id: string | null): ChatServer | null {
    if (!id) return null;
    return servers.find(s => getCoId(s) === id) ?? null;
}

/**
 * Get channels as a typed array from a server.
 * Replaces: `(activeServer as any)?.channels ? Array.from(...).filter(Boolean) : []`
 */
export function getChannelArray(server: ChatServer | null): Channel[] {
    if (!server) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels = (server as any)?.channels;
    return coToArray<Channel>(channels);
}

// ─── Channel Helpers ─────────────────────────────────────────────────────────

/**
 * Find a channel by its CoValue ID.
 * Replaces: `channelArray.find((c: any) => c?.$jazz?.id === id)`
 */
export function findChannelById(channels: Channel[], id: string | null): Channel | null {
    if (!id) return null;
    return channels.find(c => getCoId(c) === id) ?? null;
}

/**
 * Get messages as a typed array from a channel.
 * Replaces: `channel.messages ? Array.from(channel.messages).filter(Boolean) : []`
 */
export function getMessageArray(channel: Channel | null): ChatMessage[] {
    if (!channel) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = (channel as any)?.messages;
    return coToArray<ChatMessage>(messages);
}

// ─── Modal Helpers ───────────────────────────────────────────────────────────

/**
 * Type-safe check if any modal in a record is open.
 * Replaces: `Object.values(modals).some(Boolean)` with proper typing
 */
export function isAnyOpen(record: Record<string, boolean>): boolean {
    return Object.values(record).some(Boolean);
}

/**
 * Find the first open key in a record.
 * Replaces: `Object.keys(modals).forEach(k => { if ((modals as any)[k]) closeModal(k as any) })`
 */
export function closeAllModals(
    modals: Record<string, boolean>,
    closeModal: (key: string) => void
): void {
    for (const key of Object.keys(modals)) {
        if (modals[key]) closeModal(key);
    }
}
