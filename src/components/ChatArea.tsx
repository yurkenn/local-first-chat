import { useRef, useEffect, useCallback, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageInput } from "./MessageInput";
import { VoicePanel } from "./VoicePanel";
import { EmojiPicker, parseReactions, toggleReaction } from "./EmojiPicker";

interface ChatAreaProps {
    channel: any | null;
    userName: string;
}

/**
 * ChatArea — Main content area with message list and input.
 *
 * Uses TanStack Virtual for windowed rendering of large message lists.
 * This prevents DOM bloat and maintains 60fps scroll performance
 * even with thousands of messages.
 */
export function ChatArea({ channel, userName }: ChatAreaProps) {
    // ── Empty state ──
    if (!channel) {
        return (
            <div className="chat-area">
                <div className="empty-state">
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-title">Welcome to LocalChat</div>
                    <p className="empty-state-text">
                        Select a channel from the sidebar to start chatting, or create a new
                        server to begin.
                    </p>
                </div>
            </div>
        );
    }

    // Voice channel view
    if (channel.channelType === "voice") {
        return (
            <div className="chat-area">
                <div className="chat-header">
                    <span className="chat-header-icon">🔊</span>
                    <span className="chat-header-name">{channel.name}</span>
                </div>
                <VoicePanel channel={channel} userName={userName} />
            </div>
        );
    }

    // Text channel view
    return (
        <div className="chat-area">
            <div className="chat-header">
                <span className="chat-header-icon">#</span>
                <span className="chat-header-name">{channel.name}</span>
                <div className="chat-header-divider" />
                <span className="chat-header-topic">End-to-end encrypted channel</span>
            </div>
            <MessageListView channel={channel} userName={userName} />
            <MessageInput channel={channel} userName={userName} />
        </div>
    );
}

/** Format a timestamp with smart relative dates */
function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

/** Check if two messages should be grouped (same sender, within 5 min) */
function shouldGroup(prev: any, curr: any): boolean {
    if (!prev || !curr) return false;
    if (prev.senderName !== curr.senderName) return false;
    return Math.abs(curr.createdAt - prev.createdAt) < 5 * 60 * 1000;
}

/**
 * MessageListView — Virtualized message list with sender grouping.
 * Uses TanStack react-virtual for windowed rendering.
 * Groups consecutive messages from same sender within 5 min.
 */
function MessageListView({ channel, userName }: { channel: any; userName: string }) {
    const messages = channel.messages;
    const parentRef = useRef<HTMLDivElement>(null);
    const msgArray = messages ? Array.from(messages).filter(Boolean) : [];

    // ── Edit state ──
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    // ── Reaction state ──
    const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);

    const virtualizer = useVirtualizer({
        count: msgArray.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const prev = index > 0 ? msgArray[index - 1] : null;
            const curr = msgArray[index];
            return shouldGroup(prev, curr) ? 28 : 52;
        },
        overscan: 10,
    });

    const scrollToBottom = useCallback(() => {
        if (msgArray.length > 0) {
            virtualizer.scrollToIndex(msgArray.length - 1, { align: "end" });
        }
    }, [msgArray.length, virtualizer]);

    useEffect(() => {
        scrollToBottom();
    }, [msgArray.length, scrollToBottom]);

    // ── Edit handlers ──
    const startEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditText(content);
    };

    const saveEdit = (msg: any) => {
        if (!editText.trim()) return;
        try {
            (msg as any).$jazz.set("content", editText.trim());
            (msg as any).$jazz.set("editedAt", Date.now());
        } catch (err) {
            console.error("[ChatArea] Edit failed:", err);
        }
        setEditingIndex(null);
        setEditText("");
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditText("");
    };

    // ── Delete handler ──
    const deleteMessage = (msg: any) => {
        try {
            (msg as any).$jazz.set("isDeleted", true);
            (msg as any).$jazz.set("content", "[message deleted]");
        } catch (err) {
            console.error("[ChatArea] Delete failed:", err);
        }
    };

    // ── Reaction handler ──
    const handleReaction = (msg: any, emoji: string) => {
        try {
            const current = parseReactions(msg.reactions);
            const updated = toggleReaction(current, emoji, userName);
            (msg as any).$jazz.set("reactions", JSON.stringify(updated));
        } catch (err) {
            console.error("[ChatArea] Reaction failed:", err);
        }
    };

    if (msgArray.length === 0) {
        return (
            <div className="chat-messages" ref={parentRef}>
                <div className="empty-state">
                    <div className="empty-state-icon">✨</div>
                    <div className="empty-state-title">No messages yet</div>
                    <p className="empty-state-text">
                        Be the first to send a message in this channel!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-messages" ref={parentRef}>
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const msg = msgArray[virtualItem.index] as any;
                    if (!msg) return null;

                    const prev = virtualItem.index > 0 ? msgArray[virtualItem.index - 1] as any : null;
                    const isGrouped = shouldGroup(prev, msg);
                    const isOwnMessage = msg.senderName === userName;
                    const isEditing = editingIndex === virtualItem.index;
                    const isDeleted = msg.isDeleted;

                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                            ref={virtualizer.measureElement}
                            data-index={virtualItem.index}
                        >
                            {isGrouped ? (
                                /* Compact grouped message — no avatar, just content */
                                <div className={`message-group message-grouped ${isDeleted ? "message-deleted" : ""}`}>
                                    <div className="message-avatar-spacer" />
                                    <div className="message-content">
                                        {isEditing ? (
                                            <EditBox
                                                text={editText}
                                                onChange={setEditText}
                                                onSave={() => saveEdit(msg)}
                                                onCancel={cancelEdit}
                                            />
                                        ) : isDeleted ? (
                                            <div className="message-text deleted-text">[message deleted]</div>
                                        ) : (
                                            <div className="message-text">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.editedAt && !isDeleted && (
                                            <span className="message-edited">(edited)</span>
                                        )}
                                    </div>
                                    {/* Reaction pills */}
                                    <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                    {/* Hover actions */}
                                    {!isDeleted && !isEditing && (
                                        <MessageActions
                                            onEdit={() => startEdit(virtualItem.index, msg.content)}
                                            onDelete={() => deleteMessage(msg)}
                                            onReact={() => setPickerOpenIndex(pickerOpenIndex === virtualItem.index ? null : virtualItem.index)}
                                            isOwn={isOwnMessage}
                                        />
                                    )}
                                    {/* Emoji picker */}
                                    {pickerOpenIndex === virtualItem.index && (
                                        <EmojiPicker
                                            onSelect={(emoji) => handleReaction(msg, emoji)}
                                            onClose={() => setPickerOpenIndex(null)}
                                        />
                                    )}
                                </div>
                            ) : (
                                /* Full message with avatar and header */
                                <div className={`message-group ${isDeleted ? "message-deleted" : ""}`}>
                                    <div className="message-avatar">
                                        {(msg.senderName || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="message-author">
                                                {msg.senderName || "Unknown"}
                                            </span>
                                            <span className="message-timestamp">
                                                {formatTimestamp(msg.createdAt)}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <EditBox
                                                text={editText}
                                                onChange={setEditText}
                                                onSave={() => saveEdit(msg)}
                                                onCancel={cancelEdit}
                                            />
                                        ) : isDeleted ? (
                                            <div className="message-text deleted-text">[message deleted]</div>
                                        ) : (
                                            <div className="message-text">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.editedAt && !isDeleted && (
                                            <span className="message-edited">(edited)</span>
                                        )}
                                    </div>
                                    {/* Reaction pills */}
                                    <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                    {/* Hover actions */}
                                    {!isDeleted && !isEditing && (
                                        <MessageActions
                                            onEdit={() => startEdit(virtualItem.index, msg.content)}
                                            onDelete={() => deleteMessage(msg)}
                                            onReact={() => setPickerOpenIndex(pickerOpenIndex === virtualItem.index ? null : virtualItem.index)}
                                            isOwn={isOwnMessage}
                                        />
                                    )}
                                    {/* Emoji picker */}
                                    {pickerOpenIndex === virtualItem.index && (
                                        <EmojiPicker
                                            onSelect={(emoji) => handleReaction(msg, emoji)}
                                            onClose={() => setPickerOpenIndex(null)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** MessageActions — Hover toolbar with edit/delete/react buttons */
function MessageActions({
    onEdit,
    onDelete,
    onReact,
    isOwn,
}: {
    onEdit: () => void;
    onDelete: () => void;
    onReact: () => void;
    isOwn: boolean;
}) {
    return (
        <div className="message-actions">
            <button className="message-action-btn" onClick={onReact} title="Add reaction">
                😀
            </button>
            {isOwn && (
                <>
                    <button className="message-action-btn" onClick={onEdit} title="Edit message">
                        ✏️
                    </button>
                    <button className="message-action-btn" onClick={onDelete} title="Delete message">
                        🗑️
                    </button>
                </>
            )}
        </div>
    );
}

/** EditBox — Inline edit textarea */
function EditBox({
    text,
    onChange,
    onSave,
    onCancel,
}: {
    text: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="message-edit-box">
            <textarea
                className="message-edit-input"
                value={text}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSave();
                    }
                    if (e.key === "Escape") {
                        onCancel();
                    }
                }}
                autoFocus
                rows={2}
            />
            <div className="message-edit-actions">
                <span className="message-edit-hint">
                    Escape to <button onClick={onCancel}>cancel</button> · Enter to{" "}
                    <button onClick={onSave}>save</button>
                </span>
            </div>
        </div>
    );
}

/** ReactionPills — Displays emoji reaction counts below a message */
function ReactionPills({
    msg,
    userName,
    onToggle,
}: {
    msg: any;
    userName: string;
    onToggle: (emoji: string) => void;
}) {
    const reactions = parseReactions(msg.reactions);
    const entries = Object.entries(reactions);
    if (entries.length === 0) return null;

    return (
        <div className="reaction-pills">
            {entries.map(([emoji, users]) => {
                const hasReacted = users.includes(userName);
                return (
                    <button
                        key={emoji}
                        className={`reaction-pill ${hasReacted ? "reacted" : ""}`}
                        onClick={() => onToggle(emoji)}
                        title={users.join(", ")}
                    >
                        <span className="reaction-emoji">{emoji}</span>
                        <span className="reaction-count">{users.length}</span>
                    </button>
                );
            })}
        </div>
    );
}
