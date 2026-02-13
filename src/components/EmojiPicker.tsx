import { useRef, useEffect } from "react";

/** Commonly used emoji reactions, grouped */
const REACTION_EMOJIS = [
    "👍", "👎", "😂", "❤️", "🔥", "👀",
    "🎉", "😮", "😢", "😡", "👏", "💯",
    "✅", "❌", "🤔", "🚀", "💪", "🙏",
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

/**
 * EmojiPicker — Compact popup grid of commonly used reaction emojis.
 */
export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute right-0 top-full mt-1 z-20 glass-strong rounded-xl p-2 shadow-xl border border-[var(--glass-border)] animate-fade-in"
        >
            <div className="grid grid-cols-6 gap-0.5">
                {REACTION_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-base hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer"
                        onClick={() => {
                            onSelect(emoji);
                            onClose();
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Reaction helpers ──
export type ReactionMap = Record<string, string[]>;

/** Parse reactions JSON string → ReactionMap */
export function parseReactions(json: string | undefined): ReactionMap {
    if (!json) return {};
    try {
        return JSON.parse(json);
    } catch {
        return {};
    }
}

/** Toggle a user's reaction on a message */
export function toggleReaction(
    reactions: ReactionMap,
    emoji: string,
    userName: string
): ReactionMap {
    const updated = { ...reactions };
    const users = updated[emoji] ? [...updated[emoji]] : [];

    const idx = users.indexOf(userName);
    if (idx >= 0) {
        users.splice(idx, 1);
        if (users.length === 0) {
            delete updated[emoji];
        } else {
            updated[emoji] = users;
        }
    } else {
        updated[emoji] = [...users, userName];
    }

    return updated;
}
