import { useRef, useEffect, useCallback, useState, useMemo, memo, forwardRef, useImperativeHandle } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { EmojiPicker, parseReactions, toggleReaction } from "@/components/EmojiPicker";
import { ImageLightbox } from "@/components/ImageLightbox";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Smile, Pencil, Trash2, Reply, ChevronDown } from "lucide-react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
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

/** Format a compact time for hover gutter (e.g. "9:42 AM") */
function formatCompactTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format a date label for separators (e.g. "February 16, 2026") */
function formatDateLabel(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

/** Check if a date separator should appear before this message */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shouldShowDateSeparator(prev: any, curr: any): boolean {
    if (!prev || !curr) return !!curr; // first message gets a separator
    const prevDate = new Date(prev.createdAt).toDateString();
    const currDate = new Date(curr.createdAt).toDateString();
    return prevDate !== currDate;
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
    serverName: string;
    userName: string;
    /** Called when user clicks Reply on a message */
    onReply?: (msg: { senderName: string; content: string }) => void;
    /** Welcome screen: open invite modal */
    onInvite?: () => void;
    /** Welcome screen: open server settings */
    onPersonalise?: () => void;
    /** Welcome screen: focus message input */
    onSendMessage?: () => void;
}

export interface MessageListViewHandle {
    editLastOwnMessage: () => void;
}

export const MessageListView = memo(forwardRef<MessageListViewHandle, MessageListViewProps>(function MessageListView({ channel, serverName, userName, onReply, onInvite, onPersonalise, onSendMessage }, ref) {
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
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newMsgCount, setNewMsgCount] = useState(0);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const isFirstRender = useRef(true);
    const prevMsgCountRef = useRef(msgArray.length);

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
        const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
        setIsAtBottom(atBottom);
        if (atBottom) setNewMsgCount(0);
    }, []);

    // Track new messages arriving while scrolled up
    useEffect(() => {
        const diff = msgArray.length - prevMsgCountRef.current;
        if (diff > 0 && !isAtBottom) {
            setNewMsgCount((c) => c + diff);
        }
        prevMsgCountRef.current = msgArray.length;
    }, [msgArray.length, isAtBottom]);

    const virtualizer = useVirtualizer({
        count: msgArray.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const prev = index > 0 ? msgArray[index - 1] : null;
            const curr = msgArray[index] as any;
            const isGrouped = shouldGroup(prev, curr);
            let height = isGrouped ? 32 : 58;
            // Account for images in messages
            if (curr?.imageDataUrl) height += 220;
            // Account for reply quote block
            if (curr?.replyToContent) height += 44;
            // Account for date separator
            if (shouldShowDateSeparator(prev, curr)) height += 44;
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
        const lastMsg = msgArray[msgArray.length - 1] as any;
        const isOwn = lastMsg?.senderName === userName;

        if (isFirstRender.current || isAtBottom || isOwn) {
            scrollToBottom();
        }
        isFirstRender.current = false;
    }, [msgArray.length, scrollToBottom, isAtBottom, userName, msgArray]);

    const startEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditText(content);
    };

    // Expose editLastOwnMessage for keyboard shortcuts
    useImperativeHandle(ref, () => ({
        editLastOwnMessage: () => {
            // Find the last message from this user
            for (let i = msgArray.length - 1; i >= 0; i--) {
                const msg = msgArray[i] as any;
                if (msg?.senderName === userName && !msg.isDeleted) {
                    startEdit(i, msg.content);
                    return;
                }
            }
        },
    }), [msgArray, userName]);

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
            <div className="flex-1 overflow-y-auto" ref={parentRef}>
                <WelcomeScreen
                    serverName={serverName}
                    onInvite={onInvite}
                    onPersonalise={onPersonalise}
                    onSendMessage={onSendMessage}
                />
            </div>
        );
    }

    return (
        <>
            <div
                className="flex-1 overflow-y-auto px-4 py-2"
                ref={parentRef}
                onScroll={onScroll}
                role="log"
                aria-live="polite"
                aria-label="Message history"
            >
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
                        const showDateSep = shouldShowDateSeparator(prev, msg);

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
                                className={cn(
                                    "group relative px-4 py-[3px] transition-colors duration-75",
                                    !isGrouped && "mt-[2px]",
                                    "hover:bg-[#2e3338]/40",
                                    isDeleted && "opacity-50"
                                )}
                            >
                                {/* Date separator */}
                                {showDateSep && (
                                    <div className="flex items-center gap-3 py-3 px-4">
                                        <div className="flex-1 h-px bg-[#3f4147]" />
                                        <span className="text-xs font-semibold text-muted-color uppercase tracking-wide shrink-0">
                                            {formatDateLabel(msg.createdAt)}
                                        </span>
                                        <div className="flex-1 h-px bg-[#3f4147]" />
                                    </div>
                                )}
                                <div className={cn("flex gap-4", isGrouped && !showDateSep && "pl-[52px]")}
                                >
                                    {/* Hover timestamp for grouped messages */}
                                    {isGrouped && !showDateSep && (
                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-color opacity-0 group-hover:opacity-100 transition-opacity duration-100 font-mono pointer-events-none select-none">
                                            {formatCompactTime(msg.createdAt)}
                                        </span>
                                    )}
                                    {/* Avatar — only for ungrouped (first message in group) */}
                                    {!isGrouped && (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-sm font-semibold text-white shrink-0 mt-0.5">
                                            {(msg.senderName || "?").charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        {/* Sender name + timestamp — only for ungrouped */}
                                        {!isGrouped && (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[15px] font-semibold text-primary-color leading-snug">{msg.senderName || "Unknown"}</span>
                                                <span className="text-xs text-muted-color">{formatTimestamp(msg.createdAt)}</span>
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
                                            onImageClick={setLightboxSrc}
                                        />

                                        {/* Reaction pills — below message content */}
                                        <ReactionPills msg={msg} userName={userName} onToggle={(emoji) => handleReaction(msg, emoji)} />
                                    </div>

                                    {sharedActions}
                                    {showPicker && (
                                        <EmojiPicker onSelect={(emoji) => handleReaction(msg, emoji)} onClose={() => setPickerOpenIndex(null)} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Scroll to Bottom Button with new message badge */}
                {!isAtBottom && (
                    <Button
                        size="icon"
                        className="absolute bottom-14 right-8 rounded-full shadow-lg bg-primary-color text-primary-foreground hover:bg-primary-color/90 animate-in fade-in zoom-in duration-200 z-10 flex items-center gap-1.5 px-3 h-9"
                        onClick={() => {
                            scrollToBottom();
                            setNewMsgCount(0);
                            setTimeout(scrollToBottom, 50);
                        }}
                        aria-label={newMsgCount > 0 ? `${newMsgCount} new messages, scroll to bottom` : "Scroll to bottom"}
                    >
                        {newMsgCount > 0 && (
                            <span className="text-xs font-medium">
                                {newMsgCount} new
                            </span>
                        )}
                        <ChevronDown className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {lightboxSrc && (
                <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )
            }
        </>
    );
}));

/** MessageContent — Shared message body rendering (edit, delete, reply, markdown, image) */
function MessageContent({
    msg,
    isEditing,
    isDeleted,
    editText,
    onEditChange,
    onSave,
    onCancel,
    onImageClick,
}: {
    msg: any;
    isEditing: boolean;
    isDeleted: boolean;
    editText: string;
    onEditChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onImageClick?: (src: string) => void;
}) {
    if (isEditing) {
        return <EditBox text={editText} onChange={onEditChange} onSave={onSave} onCancel={onCancel} />;
    }

    if (isDeleted) {
        return <p className="text-sm italic text-muted-color">[message deleted]</p>;
    }

    return (
        <>
            <div className="text-[15px] leading-[1.375rem] prose prose-invert prose-base max-w-none [&_p]:m-0 [&_a]:text-[hsl(var(--primary))] [&_code]:text-[13px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[#2b2d31]">
                {msg.replyToSender && (
                    <div className="flex items-center gap-1.5 mb-1.5 pl-2.5 border-l-2 border-[hsl(var(--primary))] text-[13px] text-muted-color">
                        <Reply className="h-3 w-3 shrink-0" />
                        <span className="font-semibold">{msg.replyToSender}</span>
                        <span className="truncate">{(msg.replyToContent || '').slice(0, 80)}</span>
                    </div>
                )}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                        code(props) {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { children, className, node, ref, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || "");
                            return match ? (
                                <SyntaxHighlighter
                                    {...rest}
                                    PreTag="div"
                                    children={String(children).replace(/\n$/, "")}
                                    language={match[1]}
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "13px", padding: "0.75rem 1rem" }}
                                />
                            ) : (
                                <code {...rest} className={className}>
                                    {children}
                                </code>
                            );
                        },
                    }}
                >
                    {msg.content}
                </ReactMarkdown>
                {msg.imageDataUrl && isValidImageDataUrl(msg.imageDataUrl) && (
                    <img src={msg.imageDataUrl} alt="Attachment" className="mt-1.5 max-w-[340px] max-h-[220px] rounded-lg object-cover cursor-pointer hover:brightness-110 transition-all" onClick={() => onImageClick?.(msg.imageDataUrl)} />
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
        <div className="absolute right-3 top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 rounded-[10px] glass-strong px-1 py-0.5 shadow-[var(--shadow-lg)] z-10">
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
