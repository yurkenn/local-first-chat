import { ChatHeader } from "@/components/ChatHeader";
import { MessageListView } from "@/components/MessageListView";
import { MessageInput } from "@/components/MessageInput";

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
export function ChatArea({
    channel,
    userName,
    sidebarOpen,
    channelSidebarOpen,
    memberPanelOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
}: ChatAreaProps) {
    if (!channel) {
        return (
            <div className="flex flex-col items-center justify-center min-w-0">
                <div className="text-6xl drop-shadow-[0_0_24px_rgba(168,85,247,0.3)]">🪷</div>
                <h1 className="text-3xl font-heading font-bold text-gradient mt-4">Lotus</h1>
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
            <MessageInput channel={channel} userName={userName} />
        </div>
    );
}
