import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Hash, Volume2, Users } from "lucide-react";

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

export function ChatHeader({
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
        <div className="flex items-center h-12 px-3 gap-1 glass-strong border-b border-[var(--glass-border)] shrink-0">
            {/* Left controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]", sidebarOpen && "text-[var(--neon-violet)]")}
                onClick={onToggleSidebar}
                aria-label="Toggle servers"
            >
                <Menu className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]", channelSidebarOpen && "text-[var(--neon-violet)]")}
                onClick={onToggleChannelSidebar}
                aria-label="Toggle channels"
            >
                <Hash className="h-4 w-4" />
            </Button>

            {/* Channel info */}
            <div className="flex items-center gap-1.5 ml-1">
                {channelType === "voice" ? (
                    <Volume2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                ) : (
                    <Hash className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                )}
                <span className="text-sm font-medium truncate">{channelName}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* E2EE indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] mr-1">
                <div className="neon-dot" style={{ width: 6, height: 6 }} />
                E2EE
            </div>

            {/* Right controls */}
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]", memberPanelOpen && "text-[var(--neon-violet)]")}
                onClick={onToggleMemberPanel}
                aria-label="Toggle members"
            >
                <Users className="h-4 w-4" />
            </Button>
        </div>
    );
}
