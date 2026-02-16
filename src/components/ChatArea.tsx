import { memo, useState, useRef } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageListView, MessageListViewHandle } from "@/components/MessageListView";
import { MessageInput, ReplyTarget } from "@/components/MessageInput";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatAreaProps {
    channel: any | null;
    userName: string;
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
    serverName: string;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
    onToggleMemberPanel: () => void;
    /** When true, skip rendering ChatHeader (mobile provides its own) */
    hideHeader?: boolean;
    /** Callback to open the search modal */
    onSearch?: () => void;
}

/**
 * ChatArea — Orchestrator component for text channels.
 *
 * Voice channels are now handled by ChannelSidebar's VoiceStatusBar (Discord-style).
 */
export const ChatArea = memo(function ChatArea({
    channel,
    userName,
    sidebarOpen,
    channelSidebarOpen,
    memberPanelOpen,
    serverName,
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
    hideHeader,
    onSearch,
}: ChatAreaProps) {
    const { typingUsers, notifyTyping } = useTypingIndicator(channel, userName);
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
    const messageListRef = useRef<MessageListViewHandle>(null);

    if (!channel) {
        return (
            <div className="flex flex-col items-center justify-center min-w-0">
                <div className="brand-logo brand-logo--lg mb-2">🪷</div>
                <h1 className="text-3xl brand-title mt-4">Lotus</h1>
                <p className="text-sm text-muted-color text-center mt-2">
                    Select a channel to begin.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-w-0 h-full min-h-0">
            {!hideHeader && (
                <ChatHeader
                    channelName={channel.name}
                    channelType={channel.channelType}
                    sidebarOpen={sidebarOpen}
                    channelSidebarOpen={channelSidebarOpen}
                    memberPanelOpen={memberPanelOpen}
                    onToggleSidebar={onToggleSidebar}
                    onToggleChannelSidebar={onToggleChannelSidebar}
                    onToggleMemberPanel={onToggleMemberPanel}
                    onSearch={onSearch}
                />
            )}
            <div className="relative flex-1 min-h-0">
                <MessageListView
                    ref={messageListRef}
                    channel={channel}
                    serverName={serverName}
                    userName={userName}
                    onReply={(msg) => setReplyTarget(msg)}
                />

                {/* Typing indicator — floats above input */}
                {typingUsers.length > 0 && (
                    <TypingIndicator users={typingUsers} />
                )}
            </div>

            <MessageInput
                channel={channel}
                userName={userName}
                onTyping={notifyTyping}
                replyTarget={replyTarget}
                onClearReply={() => setReplyTarget(null)}
                onEditLast={() => messageListRef.current?.editLastOwnMessage()}
            />
        </div>
    );
});

/** Typing indicator — Discord-style compact overlay bar */
function TypingIndicator({ users }: { users: string[] }) {
    let text = "";
    if (users.length === 1) {
        text = `${users[0]} is typing`;
    } else if (users.length === 2) {
        text = `${users[0]} and ${users[1]} are typing`;
    } else if (users.length === 3) {
        text = `${users[0]}, ${users[1]}, and ${users[2]} are typing`;
    } else {
        text = `${users.length} people are typing`;
    }

    return (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-1 bg-[hsl(var(--background)/0.92)] backdrop-blur-sm z-10 animate-fade-in">
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-[3px]">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-[5px] h-[5px] rounded-full bg-white/70"
                            style={{
                                animation: "typing-bounce 1.2s ease-in-out infinite",
                                animationDelay: `${i * 160}ms`,
                            }}
                        />
                    ))}
                </span>
                <span className="text-[11px] font-medium text-white/70">{text}</span>
            </div>
        </div>
    );
}
