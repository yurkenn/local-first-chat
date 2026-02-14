import { memo } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageListView } from "@/components/MessageListView";
import { MessageInput } from "@/components/MessageInput";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatAreaProps {
    channel: any | null;
    userName: string;
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
    onToggleMemberPanel: () => void;
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
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
}: ChatAreaProps) {
    const { typingUsers, notifyTyping } = useTypingIndicator(channel, userName);

    if (!channel) {
        return (
            <div className="flex flex-col items-center justify-center min-w-0">
                <div className="brand-logo brand-logo--lg mb-2">🪷</div>
                <h1 className="text-3xl brand-title mt-4">Lotus</h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">
                    Select a channel to begin.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-w-0 h-full">
            <ChatHeader
                channelName={channel.name}
                channelType={channel.channelType}
                sidebarOpen={sidebarOpen}
                channelSidebarOpen={channelSidebarOpen}
                memberPanelOpen={memberPanelOpen}
                onToggleSidebar={onToggleSidebar}
                onToggleChannelSidebar={onToggleChannelSidebar}
                onToggleMemberPanel={onToggleMemberPanel}
            />
            <MessageListView channel={channel} userName={userName} />

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <TypingIndicator users={typingUsers} />
            )}

            <MessageInput channel={channel} userName={userName} onTyping={notifyTyping} />
        </div>
    );
});

/** Typing indicator — shows animated dots with user names */
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
        <div className="px-4 py-1.5 text-xs text-[hsl(var(--muted-foreground))] animate-fade-in flex items-center gap-2">
            <span className="flex items-center gap-[3px]">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-[6px] h-[6px] rounded-full bg-[var(--organic-sage)]"
                        style={{
                            animation: "typing-bounce 1.2s ease-in-out infinite",
                            animationDelay: `${i * 160}ms`,
                        }}
                    />
                ))}
            </span>
            <span className="text-[11px]">{text}</span>
        </div>
    );
}
