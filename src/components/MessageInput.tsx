import { useState, useCallback, useRef, useEffect, KeyboardEvent, ClipboardEvent, type RefObject } from "react";
import { toast } from "sonner";
import { ChatMessage, MessageList } from "@/schema";
import {
    X,
    Reply,
    PlusCircle,
    Gift,
    Sticker,
    Smile
} from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { messageRateLimiter } from "@/lib/rate-limiter";
import { getOwnerGroup, coPush, coSet } from "@/lib/jazz-helpers";
import { MAX_MESSAGE_LENGTH, isValidImageDataUrl } from "@/lib/validators";
import type { LoadedChannel } from "@/lib/jazz-types";
import { handleError } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

export interface ReplyTarget {
    senderName: string;
    content: string;
}

interface MessageInputProps {
    channel: LoadedChannel;
    userName: string;
    /** Callback to notify that the user is typing */
    onTyping?: () => void;
    /** Reply target (set when user clicks "Reply" on a message) */
    replyTarget?: ReplyTarget | null;
    /** Clear the reply target */
    onClearReply?: () => void;
    /** Called when user presses Arrow Up on empty input — edit last own message */
    onEditLast?: () => void;
    /** External ref to the textarea for programmatic focus */
    inputRef?: RefObject<HTMLTextAreaElement | null>;
}

/** Max image file size (2MB) */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

/**
 * Convert a File/Blob to a data URL string.
 */
function fileToDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function MessageInput({
    channel,
    userName,
    onTyping,
    replyTarget,
    onClearReply,
    onEditLast,
    inputRef,
}: MessageInputProps) {
    const [text, setText] = useState("");
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = inputRef || internalTextareaRef;

    // Auto-resize textarea to fit content
    const autoResize = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
    }, []);

    useEffect(() => {
        autoResize();
    }, [text, autoResize]);

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if ((!trimmed && !pendingImage) || !channel) return;

        // Message length validation
        if (trimmed.length > MAX_MESSAGE_LENGTH) {
            toast.error(`Message too long (${trimmed.length}/${MAX_MESSAGE_LENGTH} characters)`);
            return;
        }

        // Image data URL validation
        if (pendingImage && !isValidImageDataUrl(pendingImage)) {
            toast.error("Invalid image format");
            setPendingImage(null);
            return;
        }

        // Rate limit check
        const rateCheck = messageRateLimiter.check();
        if (!rateCheck.allowed) {
            toast.warning(`Too fast! Wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ownerGroup = getOwnerGroup(channel) as any;

            const msgData: Record<string, any> = {
                content: trimmed || (pendingImage ? "📷 Image" : ""),
                createdAt: Date.now(),
                senderName: userName,
            };

            // Attach reply-to data
            if (replyTarget) {
                msgData.replyToContent = replyTarget.content.slice(0, 200);
                msgData.replyToSender = replyTarget.senderName;
            }

            // Attach image
            if (pendingImage) {
                msgData.imageDataUrl = pendingImage;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message = ChatMessage.create(msgData as any, { owner: ownerGroup });

            if (channel.messages) {
                coPush(channel.messages, message);
            } else {
                const newList = MessageList.create([message], { owner: ownerGroup });
                coSet(channel, "messages", newList);
            }

            setText("");
            setPendingImage(null);
            onClearReply?.();
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            messageRateLimiter.record();
        } catch (err) {
            handleError(err, { context: "MessageInput", toast: "Failed to send message" });
        }
    }, [text, pendingImage, channel, userName, replyTarget, onClearReply]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }

        // Arrow Up on empty input → edit last own message
        if (e.key === "ArrowUp" && !text.trim() && !pendingImage) {
            e.preventDefault();
            onEditLast?.();
        }

        // Escape → close emoji picker, then clear reply, then blur
        if (e.key === "Escape") {
            if (emojiPickerOpen) {
                setEmojiPickerOpen(false);
            } else if (replyTarget) {
                onClearReply?.();
            } else {
                textareaRef.current?.blur();
            }
        }
    };

    /** Shared image processing — validates size, converts to data URL, sets pending image */
    const processImageFile = useCallback(async (file: File | Blob) => {
        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("Image too large (max 2MB)");
            return;
        }
        try {
            const dataUrl = await fileToDataUrl(file);
            setPendingImage(dataUrl);
            toast.success("Image attached");
        } catch {
            toast.error("Failed to process image");
        }
    }, []);

    /** Handle pasting images from clipboard */
    const handlePaste = useCallback(async (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) await processImageFile(file);
                return;
            }
        }
    }, [processImageFile]);

    /** Handle file input change */
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Only images are supported");
            return;
        }

        await processImageFile(file);

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [processImageFile]);

    return (
        <div className="px-4 pb-6 pt-0">
            {/* Reply banner - Discord style */}
            {replyTarget && (
                <div className="flex items-center gap-2 px-4 py-2 mb-[-8px] rounded-t-lg bg-[#2b2d31] border-x border-t border-[rgba(0,0,0,0.2)] text-[12px]">
                    <Reply className="h-3 w-3 text-[#b5bac1] shrink-0" />
                    <span className="text-[#b5bac1]">
                        Replying to{" "}
                        <span className="font-bold text-[#dbdee1]">
                            {replyTarget.senderName}
                        </span>
                    </span>
                    <span className="truncate text-[#b5bac1] flex-1">
                        {replyTarget.content.slice(0, 80)}
                    </span>
                    <button
                        onClick={onClearReply}
                        className="text-[#dbdee1] hover:text-white transition-colors shrink-0 p-2 -mr-1"
                        aria-label="Cancel reply"
                    >
                        <PlusCircle className="h-5 w-5 rotate-45" />
                    </button>
                </div>
            )}

            {/* Image preview - Discord style */}
            {pendingImage && (
                <div className="inline-block p-4 mb-[-8px] rounded-t-lg bg-[#2b2d31] border-x border-t border-[rgba(0,0,0,0.2)]">
                    <div className="relative">
                        <img
                            src={pendingImage}
                            alt="Pending attachment"
                            className="h-48 rounded-md border border-[#1e1f22] object-cover"
                        />
                        <button
                            onClick={() => setPendingImage(null)}
                            className="absolute -top-2 -right-2 h-8 w-8 flex items-center justify-center rounded-full bg-[#2b2d31] text-[#dbdee1] hover:text-[#f23f42] shadow-md transition-colors border border-[rgba(255,255,255,0.1)]"
                            aria-label="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className={cn(
                "flex items-center gap-1 bg-[#383a40] p-1 shadow-sm transition-all duration-200",
                (replyTarget || pendingImage) ? "rounded-b-lg" : "rounded-lg"
            )}>
                {/* Upload button - Discord style on the left */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-[#b5bac1] hover:text-[#dbdee1] transition-colors shrink-0 ml-2"
                    aria-label="Upload file"
                >
                    <PlusCircle className="h-6 w-6" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <textarea
                    ref={textareaRef}
                    className="flex-1 min-h-[44px] max-h-[144px] bg-transparent border-none outline-none resize-none text-[16px] text-[#dbdee1] placeholder:text-[#80848e] px-2 py-[11px] leading-[1.375]"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (e.target.value.trim() && onTyping) {
                            onTyping();
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={`Message #${channel?.name || "channel"}`}
                    rows={1}
                    aria-label="Message input"
                    maxLength={MAX_MESSAGE_LENGTH}
                />

                {/* Counter & Action buttons on the right */}
                <div className="flex items-center gap-2 pr-2">
                    {text.length > MAX_MESSAGE_LENGTH * 0.9 && (
                        <span className={`text-[11px] tabular-nums ${text.length > MAX_MESSAGE_LENGTH ? "text-[#f23f42]" : "text-[#80848e]"}`}>
                            {MAX_MESSAGE_LENGTH - text.length}
                        </span>
                    )}

                    <button className="h-8 w-8 flex items-center justify-center text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:flex">
                        <Gift className="h-5 w-5" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:flex">
                        <Sticker className="h-5 w-5" />
                    </button>
                    <div className="relative">
                        <button
                            className={cn(
                                "h-8 w-8 flex items-center justify-center transition-colors",
                                emojiPickerOpen ? "text-[#dbdee1]" : "text-[#b5bac1] hover:text-[#dbdee1]"
                            )}
                            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                            aria-label="Open emoji picker"
                        >
                            <Smile className="h-5 w-5" />
                        </button>
                        {emojiPickerOpen && (
                            <div className="absolute bottom-full right-0 mb-2">
                                <EmojiPicker
                                    onSelect={(emoji) => {
                                        // Insert emoji at cursor position
                                        const ta = textareaRef.current;
                                        if (ta) {
                                            const start = ta.selectionStart;
                                            const end = ta.selectionEnd;
                                            const newText = text.slice(0, start) + emoji + text.slice(end);
                                            setText(newText);
                                            // Restore cursor after emoji
                                            requestAnimationFrame(() => {
                                                ta.selectionStart = ta.selectionEnd = start + emoji.length;
                                                ta.focus();
                                            });
                                        } else {
                                            setText(text + emoji);
                                        }
                                    }}
                                    onClose={() => setEmojiPickerOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
