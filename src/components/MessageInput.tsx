import { useState, useCallback, KeyboardEvent } from "react";
import { Group } from "jazz-tools";
import { ChatMessage, MessageList } from "../schema";

interface MessageInputProps {
    channel: any;
    userName: string;
}

/**
 * MessageInput — Controlled input for sending messages.
 *
 * Optimistic CoValue creation:
 *   1. Creates a ChatMessage CoValue immediately on send.
 *   2. Pushes it into the channel's MessageList.
 *   3. Jazz syncs the CoValue to all peers in the background.
 *
 * This ensures the message appears instantly in the sender's UI
 * before the network round-trip completes.
 */
export function MessageInput({ channel, userName }: MessageInputProps) {
    const [text, setText] = useState("");

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || !channel) return;

        try {
            // Determine owner group — use the channel's existing group or create one
            const ownerGroup = Group.create();
            ownerGroup.addMember("everyone", "writer");

            // Create message CoValue (optimistic — instant local appearance)
            const message = ChatMessage.create(
                {
                    content: trimmed,
                    createdAt: Date.now(),
                    senderName: userName,
                },
                { owner: ownerGroup }
            );

            // Push into the channel's message list using Jazz's .$jazz.push()
            if (channel.messages) {
                (channel.messages as any).$jazz.push(message);
            } else {
                // Initialize messages list if not present
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
        <div className="chat-input-container">
            <div className="chat-input-wrapper">
                <textarea
                    className="chat-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${channel?.name || "channel"}`}
                    rows={1}
                    aria-label="Message input"
                />
                <button
                    className="chat-input-send"
                    onClick={handleSend}
                    disabled={!text.trim()}
                    aria-label="Send message"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
