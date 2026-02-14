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
        <div className="relative flex items-center h-12 px-3 gap-1 surface-elevated shrink-0">
            {/* Bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-[hsl(var(--border))]" />

            {/* Left controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 text-muted-color hover:text-primary-color transition-colors",
                    sidebarOpen && "text-[var(--organic-sage)]"
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
                    "h-8 w-8 text-muted-color hover:text-primary-color transition-colors",
                    channelSidebarOpen && "text-[var(--organic-sage)]"
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
                <span className="text-sm font-medium truncate">{channelName}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* E2EE badge — organic pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--organic-sage)]/8 border border-[var(--organic-sage)]/15 mr-1">
                <Shield className="h-3 w-3 text-[var(--organic-sage)]" />
                <span className="text-[10px] font-medium text-[var(--organic-sage)]">E2EE</span>
            </div>

            {/* Right controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 text-muted-color hover:text-primary-color transition-colors",
                    memberPanelOpen && "text-[var(--organic-sage)]"
                )}
                onClick={onToggleMemberPanel}
                aria-label="Toggle members"
            >
                <Users className="h-4 w-4" />
            </Button>
        </div>
    );
});
