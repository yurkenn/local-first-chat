import { useRef, useEffect, useCallback, useState, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { EmojiPicker, parseReactions, toggleReaction } from "@/components/EmojiPicker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Smile, Pencil, Trash2, Reply } from "lucide-react";
import { isValidImageDataUrl } from "@/lib/validators";
import { coSet } from "@/lib/jazz-helpers";
import type { LoadedChannel } from "@/lib/jazz-types";
import { handleError } from "@/lib/error-utils";

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

/** Check if two messages should be grouped */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shouldGroup(prev: any, curr: any): boolean {
    if (!prev || !curr) return false;
    if (prev.senderName !== curr.senderName) return false;
    return Math.abs(curr.createdAt - prev.createdAt) < 5 * 60 * 1000;
}

interface MessageListViewProps {
    channel: LoadedChannel;
    userName: string;
    /** Called when user clicks Reply on a message */
    onReply?: (msg: { senderName: string; content: string }) => void;
}

export const MessageListView = memo(function MessageListView({ channel, userName, onReply }: MessageListViewProps) {
    const messages = channel.messages;
    const parentRef = useRef<HTMLDivElement>(null);
    const msgArray = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => (messages ? Array.from(messages as any).filter(Boolean) : []),
        [messages]
    );

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);

    const virtualizer = useVirtualizer({
        count: msgArray.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const prev = index > 0 ? msgArray[index - 1] : null;
            const curr = msgArray[index] as any;
            const isGrouped = shouldGroup(prev, curr);
            let height = isGrouped ? 28 : 52;
            // Account for images in messages
            if (curr?.imageDataUrl) height += 220;
            // Account for reply quote block
            if (curr?.replyToContent) height += 40;
            return height;
        },
        overscan: 5,
    });

    const scrollToBottom = useCallback(() => {
        if (msgArray.length > 0) {
            virtualizer.scrollToIndex(msgArray.length - 1, { align: "end" });
        }
    }, [msgArray.length, virtualizer]);

    useEffect(() => {
        scrollToBottom();
    }, [msgArray.length, scrollToBottom]);

    const startEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditText(content);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveEdit = (msg: any) => {
        if (!editText.trim()) return;
        try {
            coSet(msg, "content", editText.trim());
            coSet(msg, "editedAt", Date.now());
        } catch (err) {
            handleError(err, { context: "MessageList" });
        }
        setEditingIndex(null);
        setEditText("");
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditText("");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deleteMessage = (msg: any) => {
        try {
            coSet(msg, "isDeleted", true);
            coSet(msg, "content", "[message deleted]");
        } catch (err) {
            handleError(err, { context: "MessageList" });
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleReaction = (msg: any, emoji: string) => {
        try {
            const current = parseReactions(msg.reactions);
            const updated = toggleReaction(current, emoji, userName);
            coSet(msg, "reactions", JSON.stringify(updated));
        } catch (err) {
            handleError(err, { context: "MessageList" });
        }
    };

    if (msgArray.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center overflow-y-auto" ref={parentRef} role="status" aria-label="No messages in channel">
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                    <div className="text-4xl">✨</div>
                    <h3 className="text-lg font-heading font-semibold text-primary-color">No messages yet</h3>
                    <p className="text-xs text-muted-color">
                        Be the first to send a message in this channel!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-2" ref={parentRef} role="log" aria-live="polite" aria-label="Message history">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const msg = msgArray[virtualItem.index] as any;
                    if (!msg) return null;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prev = virtualItem.index > 0 ? msgArray[virtualItem.index - 1] as any : null;
                    const isGrouped = shouldGroup(prev, msg);
                    const isOwnMessage = msg.senderName === userName;
                    const isEditing = editingIndex === virtualItem.index;
                    const isDeleted = msg.isDeleted;
                    const showPicker = pickerOpenIndex === virtualItem.index;

                    // Shared actions passed to both grouped and ungrouped renders
                    const sharedActions = !isDeleted && !isEditing ? (
                        <MessageActions
                            onEdit={() => startEdit(virtualItem.index, msg.content)}
                            onDelete={() => deleteMessage(msg)}
                            onReact={() => setPickerOpenIndex(showPicker ? null : virtualItem.index)}
                            onReply={() => onReply?.({ senderName: msg.senderName, content: msg.content })}
                            isOwn={isOwnMessage}
                        />
                    ) : null;

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
                            className={cn("group relative px-2 py-0.5 rounded-md hover:bg-[hsl(var(--secondary))/0.3] transition-colors", isDeleted && "opacity-50")}
                        >
                            <div className={cn("flex gap-3", isGrouped && "pl-[44px]")}>
                                {/* Avatar — only for ungrouped (first message in group) */}
                                {!isGrouped && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[var(--organic-blue)] flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                                        {(msg.senderName || "?").charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {/* Sender name + timestamp — only for ungrouped */}
                                    {!isGrouped && (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-semibold text-primary-color">{msg.senderName || "Unknown"}</span>
                                            <span className="text-[10px] text-muted-color">{formatTimestamp(msg.createdAt)}</span>
                                        </div>
                                    )}

                                    {/* Message content — shared for both grouped and ungrouped */}
                                    <MessageContent
                                        msg={msg}
                                        isEditing={isEditing}
                                        isDeleted={isDeleted}
                                        editText={editText}
                                        onEditChange={setEditText}
                                        onSave={() => saveEdit(msg)}
                                        onCancel={cancelEdit}
                                    />
                                </div>

                                <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                {sharedActions}
                                {showPicker && (
                                    <EmojiPicker onSelect={(emoji) => handleReaction(msg, emoji)} onClose={() => setPickerOpenIndex(null)} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/** MessageContent — Shared message body rendering (edit, delete, reply, markdown, image) */
function MessageContent({
    msg,
    isEditing,
    isDeleted,
    editText,
    onEditChange,
    onSave,
    onCancel,
}: {
    msg: any;
    isEditing: boolean;
    isDeleted: boolean;
    editText: string;
    onEditChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    if (isEditing) {
        return <EditBox text={editText} onChange={onEditChange} onSave={onSave} onCancel={onCancel} />;
    }

    if (isDeleted) {
        return <p className="text-sm italic text-muted-color">[message deleted]</p>;
    }

    return (
        <>
            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:m-0 [&_a]:text-[var(--organic-sage)]">
                {msg.replyToSender && (
                    <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-[var(--organic-sage)] text-xs text-muted-color">
                        <Reply className="h-3 w-3 shrink-0" />
                        <span className="font-semibold">{msg.replyToSender}</span>
                        <span className="truncate">{(msg.replyToContent || '').slice(0, 80)}</span>
                    </div>
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                {msg.imageDataUrl && isValidImageDataUrl(msg.imageDataUrl) && (
                    <img src={msg.imageDataUrl} alt="Attachment" className="mt-1 max-w-[300px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.imageDataUrl, '_blank')} />
                )}
            </div>
            {msg.editedAt && (
                <span className="text-[10px] text-muted-color ml-1">(edited)</span>
            )}
        </>
    );
}

/** MessageActions — Hover toolbar */
const MessageActions = memo(function MessageActions({
    onEdit,
    onDelete,
    onReact,
    onReply,
    isOwn,
}: {
    onEdit: () => void;
    onDelete: () => void;
    onReact: () => void;
    onReply?: () => void;
    isOwn: boolean;
}) {
    return (
        <div className="absolute right-2 top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 rounded-md surface-elevated px-1 py-0.5 shadow-lg z-10">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-color hover:text-primary-color" onClick={onReact} title="Add reaction">
                <Smile className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-color hover:text-primary-color" onClick={onReply} title="Reply">
                <Reply className="h-3.5 w-3.5" />
            </Button>
            {isOwn && (
                <>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-color hover:text-primary-color" onClick={onEdit} title="Edit message">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-color hover:text-[hsl(var(--destructive))]" onClick={onDelete} title="Delete message">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </>
            )}
        </div>
    );
});

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
        <div className="mt-1">
            <textarea
                className="w-full bg-surface border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-primary-color outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] resize-none"
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
            <div className="text-[10px] text-muted-color mt-1">
                Escape to{" "}
                <button className="text-[var(--organic-sage)] hover:underline" onClick={onCancel}>cancel</button>
                {" · "}Enter to{" "}
                <button className="text-[var(--organic-sage)] hover:underline" onClick={onSave}>save</button>
            </div>
        </div>
    );
}

/** ReactionPills */
const ReactionPills = memo(function ReactionPills({
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
        <div className="flex flex-wrap gap-1 mt-1">
            {entries.map(([emoji, users]) => {
                const hasReacted = users.includes(userName);
                return (
                    <button
                        key={emoji}
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer",
                            hasReacted
                                ? "bg-[hsl(var(--primary))/0.2] border border-[hsl(var(--primary))/0.4] text-[hsl(var(--primary))]"
                                : "bg-surface border border-[hsl(var(--border))] text-muted-color hover:bg-[hsl(var(--secondary))/0.8]"
                        )}
                        onClick={() => onToggle(emoji)}
                        title={users.join(", ")}
                    >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                    </button>
                );
            })}
        </div>
    );
});
