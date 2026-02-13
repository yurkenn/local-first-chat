import { useRef, useEffect, useCallback, useState, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmojiPicker, parseReactions, toggleReaction } from "@/components/EmojiPicker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Smile, Pencil, Trash2 } from "lucide-react";

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
function shouldGroup(prev: any, curr: any): boolean {
    if (!prev || !curr) return false;
    if (prev.senderName !== curr.senderName) return false;
    return Math.abs(curr.createdAt - prev.createdAt) < 5 * 60 * 1000;
}

interface MessageListViewProps {
    channel: any;
    userName: string;
}

export function MessageListView({ channel, userName }: MessageListViewProps) {
    const messages = channel.messages;
    const parentRef = useRef<HTMLDivElement>(null);
    const msgArray = useMemo(
        () => (messages ? Array.from(messages).filter(Boolean) : []),
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

    const deleteMessage = (msg: any) => {
        try {
            (msg as any).$jazz.set("isDeleted", true);
            (msg as any).$jazz.set("content", "[message deleted]");
        } catch (err) {
            console.error("[ChatArea] Delete failed:", err);
        }
    };

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
            <div className="flex-1 flex items-center justify-center overflow-y-auto" ref={parentRef}>
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                    <div className="text-4xl">✨</div>
                    <h3 className="text-lg font-heading font-semibold text-[hsl(var(--foreground))]">No messages yet</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Be the first to send a message in this channel!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-2" ref={parentRef}>
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
                            className={cn("group relative px-2 py-0.5 rounded-md hover:bg-[hsl(var(--secondary))/0.3] transition-colors", isDeleted && "opacity-50")}
                        >
                            {isGrouped ? (
                                <div className="flex gap-3 pl-[44px]">
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <EditBox text={editText} onChange={setEditText} onSave={() => saveEdit(msg)} onCancel={cancelEdit} />
                                        ) : isDeleted ? (
                                            <p className="text-sm italic text-[hsl(var(--muted-foreground))]">[message deleted]</p>
                                        ) : (
                                            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:m-0 [&_a]:text-[var(--neon-cyan)]">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.editedAt && !isDeleted && (
                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-1">(edited)</span>
                                        )}
                                    </div>
                                    <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                    {!isDeleted && !isEditing && (
                                        <MessageActions
                                            onEdit={() => startEdit(virtualItem.index, msg.content)}
                                            onDelete={() => deleteMessage(msg)}
                                            onReact={() => setPickerOpenIndex(pickerOpenIndex === virtualItem.index ? null : virtualItem.index)}
                                            isOwn={isOwnMessage}
                                        />
                                    )}
                                    {pickerOpenIndex === virtualItem.index && (
                                        <EmojiPicker onSelect={(emoji) => handleReaction(msg, emoji)} onClose={() => setPickerOpenIndex(null)} />
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                                        {(msg.senderName || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{msg.senderName || "Unknown"}</span>
                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{formatTimestamp(msg.createdAt)}</span>
                                        </div>
                                        {isEditing ? (
                                            <EditBox text={editText} onChange={setEditText} onSave={() => saveEdit(msg)} onCancel={cancelEdit} />
                                        ) : isDeleted ? (
                                            <p className="text-sm italic text-[hsl(var(--muted-foreground))]">[message deleted]</p>
                                        ) : (
                                            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:m-0 [&_a]:text-[var(--neon-cyan)]">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.editedAt && !isDeleted && (
                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-1">(edited)</span>
                                        )}
                                    </div>
                                    <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                    {!isDeleted && !isEditing && (
                                        <MessageActions
                                            onEdit={() => startEdit(virtualItem.index, msg.content)}
                                            onDelete={() => deleteMessage(msg)}
                                            onReact={() => setPickerOpenIndex(pickerOpenIndex === virtualItem.index ? null : virtualItem.index)}
                                            isOwn={isOwnMessage}
                                        />
                                    )}
                                    {pickerOpenIndex === virtualItem.index && (
                                        <EmojiPicker onSelect={(emoji) => handleReaction(msg, emoji)} onClose={() => setPickerOpenIndex(null)} />
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

/** MessageActions — Hover toolbar */
const MessageActions = memo(function MessageActions({
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
        <div className="absolute right-2 top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 rounded-md glass-strong px-1 py-0.5 shadow-lg z-10">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" onClick={onReact} title="Add reaction">
                <Smile className="h-3.5 w-3.5" />
            </Button>
            {isOwn && (
                <>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" onClick={onEdit} title="Edit message">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" onClick={onDelete} title="Delete message">
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
                className="w-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] resize-none"
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
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                Escape to{" "}
                <button className="text-[var(--neon-cyan)] hover:underline" onClick={onCancel}>cancel</button>
                {" · "}Enter to{" "}
                <button className="text-[var(--neon-cyan)] hover:underline" onClick={onSave}>save</button>
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
                                : "bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))/0.8]"
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
