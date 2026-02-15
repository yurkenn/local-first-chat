/**
 * SearchModal.tsx — Message search across all channels (Ctrl/⌘+K).
 *
 * Fuzzy text search with results grouped by channel,
 * highlighting matching text and providing click-to-navigate.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, X, Hash, ArrowRight, MessageSquare } from "lucide-react";

interface SearchResult {
    channelId: string;
    channelName: string;
    messageContent: string;
    senderName: string;
    createdAt: number;
    matchStart: number;
    matchEnd: number;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** All servers with their channels and messages */
    servers: any[];
    /** Navigate to a specific channel */
    onNavigate: (channelId: string) => void;
}

export function SearchModal({
    isOpen,
    onClose,
    servers,
    onNavigate,
}: SearchModalProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    // Search across all channels
    const results = useMemo<SearchResult[]>(() => {
        const trimmed = query.trim().toLowerCase();
        if (trimmed.length < 2) return [];

        const found: SearchResult[] = [];
        const maxResults = 50;

        for (const server of servers) {
            if (!server?.channels) continue;
            const channels = Array.from(server.channels).filter(Boolean);

            for (const channel of channels) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ch = channel as any;
                if (!ch?.messages || ch.channelType !== "text") continue;

                const messages = Array.from(ch.messages).filter(Boolean);
                for (const msg of messages) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const m = msg as any;
                    if (!m?.content) continue;

                    const content = m.content.toLowerCase();
                    const matchIndex = content.indexOf(trimmed);

                    if (matchIndex !== -1) {
                        found.push({
                            channelId: ch.$jazz?.id || "",
                            channelName: ch.name || "unknown",
                            messageContent: m.content,
                            senderName: m.senderName || "Unknown",
                            createdAt: m.createdAt || 0,
                            matchStart: matchIndex,
                            matchEnd: matchIndex + trimmed.length,
                        });

                        if (found.length >= maxResults) break;
                    }
                }
                if (found.length >= maxResults) break;
            }
            if (found.length >= maxResults) break;
        }

        // Sort by recency
        return found.sort((a, b) => b.createdAt - a.createdAt);
    }, [query, servers]);

    const handleSelect = useCallback(
        (result: SearchResult) => {
            onNavigate(result.channelId);
            onClose();
        },
        [onNavigate, onClose]
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-[hsl(var(--card))] border border-[rgba(255,255,255,0.06)] rounded-[20px] shadow-[var(--shadow-xl)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
                    <Search className="h-5 w-5 text-[hsl(var(--muted-foreground))] shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search messages…"
                        className="flex-1 bg-transparent text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none text-[15px]"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="rounded-full w-6 h-6 flex items-center justify-center bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {query.trim().length < 2 ? (
                        <div className="p-8 text-center text-muted-color text-sm">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            Type at least 2 characters to search
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center text-muted-color text-sm">
                            No messages found for &ldquo;{query}&rdquo;
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-4 py-1 text-xs text-muted-color">
                                {results.length} result{results.length !== 1 && "s"}
                            </div>
                            {results.map((result, i) => (
                                <button
                                    key={`${result.channelId}-${result.createdAt}-${i}`}
                                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-surface transition-colors text-left group cursor-pointer"
                                    onClick={() => handleSelect(result)}
                                >
                                    <Hash className="h-4 w-4 text-muted-color shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-muted-color">
                                            <span className="font-medium text-primary-color">
                                                {result.senderName}
                                            </span>
                                            <span>in #{result.channelName}</span>
                                            <span>·</span>
                                            <span>
                                                {new Date(result.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-primary-color truncate mt-0.5">
                                            <HighlightedText
                                                text={result.messageContent}
                                                matchStart={result.matchStart}
                                                matchEnd={result.matchEnd}
                                            />
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-color opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer shortcut hint */}
                <div className="px-5 py-2.5 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <kbd className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded-md text-[10px] font-mono border border-[rgba(255,255,255,0.06)]">↵</kbd>
                    <span>Select</span>
                    <kbd className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded-md text-[10px] font-mono border border-[rgba(255,255,255,0.06)]">Esc</kbd>
                    <span>Close</span>
                </div>
            </div>
        </div>
    );
}

/** Highlight matching substring */
function HighlightedText({
    text,
    matchStart,
    matchEnd,
}: {
    text: string;
    matchStart: number;
    matchEnd: number;
}) {
    // Show context around the match
    const contextStart = Math.max(0, matchStart - 30);
    const contextEnd = Math.min(text.length, matchEnd + 50);
    const before = text.slice(contextStart, matchStart);
    const match = text.slice(matchStart, matchEnd);
    const after = text.slice(matchEnd, contextEnd);

    return (
        <span>
            {contextStart > 0 && "…"}
            {before}
            <mark className="bg-[var(--organic-sage)]/30 text-primary-color rounded-sm px-0.5">
                {match}
            </mark>
            {after}
            {contextEnd < text.length && "…"}
        </span>
    );
}
