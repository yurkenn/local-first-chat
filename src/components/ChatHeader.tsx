import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Hash, Volume2, Users, Shield } from "lucide-react";
import { memo } from "react";

interface ChatHeaderProps {
    channelName: string;
    channelType: string;
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
    onToggleMemberPanel: () => void;
}

export const ChatHeader = memo(function ChatHeader({
    channelName,
    channelType,
    sidebarOpen,
    channelSidebarOpen,
    memberPanelOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
}: ChatHeaderProps) {
    return (
        <div className="relative flex items-center h-[52px] px-4 gap-1.5 glass-thin shrink-0">
            {/* Bottom border — ultra-thin */}
            <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[rgba(255,255,255,0.06)]" />

            {/* Left controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 rounded-lg text-muted-color hover:text-primary-color hover:bg-[rgba(255,255,255,0.06)] transition-colors",
                    sidebarOpen && "text-[hsl(var(--primary))]"
                )}
                onClick={onToggleSidebar}
                aria-label="Toggle servers"
            >
                <Menu className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 rounded-lg text-muted-color hover:text-primary-color hover:bg-[rgba(255,255,255,0.06)] transition-colors",
                    channelSidebarOpen && "text-[hsl(var(--primary))]"
                )}
                onClick={onToggleChannelSidebar}
                aria-label="Toggle channels"
            >
                <Hash className="h-4 w-4" />
            </Button>

            {/* Channel info */}
            <div className="flex items-center gap-1.5 ml-1">
                {channelType === "voice" ? (
                    <Volume2 className="h-4 w-4 text-muted-color" />
                ) : (
                    <Hash className="h-4 w-4 text-muted-color" />
                )}
                <span className="text-[15px] font-semibold tracking-[-0.01em] truncate">
                    {channelName}
                </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* E2EE badge — Apple pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(48,209,88,0.1)] border border-[rgba(48,209,88,0.12)] mr-1">
                <Shield className="h-3 w-3 text-[var(--organic-green)]" />
                <span className="text-[11px] font-medium text-[var(--organic-green)]">E2EE</span>
            </div>

            {/* Right controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 rounded-lg text-muted-color hover:text-primary-color hover:bg-[rgba(255,255,255,0.06)] transition-colors",
                    memberPanelOpen && "text-[hsl(var(--primary))]"
                )}
                onClick={onToggleMemberPanel}
                aria-label="Toggle members"
            >
                <Users className="h-4 w-4" />
            </Button>
        </div>
    );
});
