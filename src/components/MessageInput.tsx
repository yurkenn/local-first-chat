import { useState, useCallback, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { toast } from "sonner";
import { ChatMessage, MessageList } from "@/schema";
import { Button } from "@/components/ui/button";
import { Send, X, Image as ImageIcon, Reply } from "lucide-react";
import { messageRateLimiter } from "@/lib/rate-limiter";
import { getOwnerGroup, coPush, coSet } from "@/lib/jazz-helpers";
import { MAX_MESSAGE_LENGTH, isValidImageDataUrl } from "@/lib/validators";
import type { LoadedChannel } from "@/lib/jazz-types";
import { handleError } from "@/lib/error-utils";

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
}: MessageInputProps) {
    const [text, setText] = useState("");
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="px-4 pb-4 pt-1">
            {/* Reply banner */}
            {replyTarget && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 rounded-lg bg-surface text-xs">
                    <Reply className="h-3 w-3 text-[var(--organic-sage)] shrink-0" />
                    <span className="text-muted-color">
                        Replying to{" "}
                        <span className="font-semibold text-primary-color">
                            {replyTarget.senderName}
                        </span>
                    </span>
                    <span className="truncate text-muted-color flex-1">
                        {replyTarget.content.slice(0, 80)}
                    </span>
                    <button
                        onClick={onClearReply}
                        className="text-muted-color hover:text-primary-color transition-colors shrink-0"
                        aria-label="Cancel reply"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Image preview */}
            {pendingImage && (
                <div className="relative inline-block mb-1.5">
                    <img
                        src={pendingImage}
                        alt="Pending attachment"
                        className="h-20 rounded-lg border border-[hsl(var(--border))] object-cover"
                    />
                    <button
                        onClick={() => setPendingImage(null)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-[hsl(var(--destructive))] text-white text-xs"
                        aria-label="Remove image"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2 rounded-xl surface-floating p-1.5 focus-glow transition-all duration-200">
                {/* Image upload button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-color hover:text-primary-color hover:bg-surface transition-colors shrink-0"
                    aria-label="Attach image"
                >
                    <ImageIcon className="h-4 w-4" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <textarea
                    className="flex-1 min-h-[36px] max-h-[120px] bg-transparent border-none outline-none resize-none text-sm text-primary-color placeholder:text-muted-color px-3 py-2"
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
                {text.length > MAX_MESSAGE_LENGTH * 0.9 && (
                    <span className={`text-[10px] self-end shrink-0 tabular-nums ${text.length > MAX_MESSAGE_LENGTH ? "text-[hsl(var(--destructive))]" : "text-muted-color"}`}>
                        {text.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                )}
                <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] hover:scale-110 hover:shadow-[var(--shadow-md)] shrink-0 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 text-white"
                    onClick={handleSend}
                    disabled={!text.trim() && !pendingImage}
                    aria-label="Send message"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
