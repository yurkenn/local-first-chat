import { memo } from "react";

/** Shimmer base animation — pulse with gradient */
const shimmerClass = "animate-pulse rounded bg-[hsl(var(--muted))]";

/** Single message skeleton — avatar + lines */
export const MessageSkeleton = memo(function MessageSkeleton() {
    return (
        <div className="flex gap-3 px-4 py-3" aria-hidden>
            {/* Avatar */}
            <div className={`${shimmerClass} h-9 w-9 rounded-full shrink-0`} />
            {/* Text lines */}
            <div className="flex-1 space-y-2 pt-1">
                <div className="flex items-center gap-2">
                    <div className={`${shimmerClass} h-3.5 w-24`} />
                    <div className={`${shimmerClass} h-3 w-14`} />
                </div>
                <div className={`${shimmerClass} h-3 w-full max-w-[480px]`} />
                <div className={`${shimmerClass} h-3 w-3/4 max-w-[360px]`} />
            </div>
        </div>
    );
});

/** Multiple message skeletons for a chat area */
export const ChatAreaSkeleton = memo(function ChatAreaSkeleton({
    count = 6,
}: {
    count?: number;
}) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Channel header skeleton */}
            <div className="flex items-center h-12 px-4 border-b border-[hsl(var(--border))] surface-elevated">
                <div className={`${shimmerClass} h-4 w-32`} />
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-hidden px-0 py-2">
                {Array.from({ length: count }, (_, i) => (
                    <MessageSkeleton key={i} />
                ))}
            </div>
            {/* Input skeleton */}
            <div className="px-4 py-3 border-t border-[hsl(var(--border))]">
                <div className={`${shimmerClass} h-10 w-full rounded-lg`} />
            </div>
        </div>
    );
});

/** Single sidebar item skeleton */
const SidebarItemSkeleton = memo(function SidebarItemSkeleton() {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5" aria-hidden>
            <div className={`${shimmerClass} h-3.5 w-3.5 rounded`} />
            <div className={`${shimmerClass} h-3.5 flex-1 max-w-[140px]`} />
        </div>
    );
});

/** Channel sidebar skeleton */
export const SidebarSkeleton = memo(function SidebarSkeleton({
    count = 5,
}: {
    count?: number;
}) {
    return (
        <div className="flex flex-col h-full surface-primary" aria-hidden>
            {/* Server name header */}
            <div className="flex items-center h-12 px-4 border-b border-[hsl(var(--border))]">
                <div className={`${shimmerClass} h-4 w-28`} />
            </div>
            {/* Channel list */}
            <div className="flex-1 py-3 space-y-1">
                {Array.from({ length: count }, (_, i) => (
                    <SidebarItemSkeleton key={i} />
                ))}
            </div>
            {/* User area */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-[hsl(var(--border))]">
                <div className={`${shimmerClass} h-8 w-8 rounded-full`} />
                <div className={`${shimmerClass} h-3.5 w-20`} />
            </div>
        </div>
    );
});
