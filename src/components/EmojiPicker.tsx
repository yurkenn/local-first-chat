import { useRef, useEffect } from "react";

/** Commonly used emoji reactions, grouped */
const REACTION_EMOJIS = [
    "👍", "👎", "😂", "❤️", "🔥", "👀",
    "🎉", "😮", "😢", "😡", "👏", "💯",
    "✅", "❌", "🤔", "🚀", "💪", "🙏",
];

interface EmojiPickerProps {
    /** Called when an emoji is selected */
    onSelect: (emoji: string) => void;
    /** Called when the picker should close */
    onClose: () => void;
}

/**
 * EmojiPicker — Compact popup grid of commonly used reaction emojis.
 * Positioned relative to the trigger button.
 */
export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
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
        <div className="emoji-picker" ref={ref}>
            <div className="emoji-grid">
                {REACTION_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        className="emoji-btn"
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
