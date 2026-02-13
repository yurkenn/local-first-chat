import { useState, useCallback, KeyboardEvent } from "react";
import { ChatMessage, MessageList } from "@/schema";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
    channel: any;
    userName: string;
}

export function MessageInput({ channel, userName }: MessageInputProps) {
    const [text, setText] = useState("");

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || !channel) return;

        try {
            const ownerGroup = (channel as any)._owner;

            const message = ChatMessage.create(
                {
                    content: trimmed,
                    createdAt: Date.now(),
                    senderName: userName,
                },
                { owner: ownerGroup }
            );

            if (channel.messages) {
                (channel.messages as any).$jazz.push(message);
            } else {
                const newList = MessageList.create([message], { owner: ownerGroup });
                (channel as any).$jazz.set("messages", newList);
            }

            setText("");
        } catch (err) {
            console.error("[MessageInput] Failed to send message:", err);
        }
    }, [text, channel, userName]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="px-4 pb-4 pt-1">
            <div className="flex items-end gap-2 rounded-xl glass-strong p-1.5">
                <textarea
                    className="flex-1 min-h-[36px] max-h-[120px] bg-transparent border-none outline-none resize-none text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] px-3 py-2"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${channel?.name || "channel"}`}
                    rows={1}
                    aria-label="Message input"
                />
                <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.8] shrink-0 disabled:opacity-30 transition-all"
                    onClick={handleSend}
                    disabled={!text.trim()}
                    aria-label="Send message"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
