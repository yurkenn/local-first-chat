import { memo, type ReactNode } from "react";
import { ChatArea } from "@/components/ChatArea";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesktopLayoutProps {
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
    onToggleMemberPanel: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeChannel: any;
    userName: string;
    serverSidebar: ReactNode;
    channelSidebar: ReactNode;
    memberPanel: ReactNode;
}

/**
 * DesktopLayout — CSS Grid layout with collapsible sidebar panels.
 * Extracted from App.tsx for readability and to enable React.memo.
 */
export const DesktopLayout = memo(function DesktopLayout({
    sidebarOpen,
    channelSidebarOpen,
    memberPanelOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
    activeChannel,
    userName,
    serverSidebar,
    channelSidebar,
    memberPanel,
}: DesktopLayoutProps) {
    return (
        <div
            className="grid h-screen w-screen overflow-hidden transition-all duration-300"
            style={{
                gridTemplateColumns: `${sidebarOpen ? "56px" : "0px"} ${channelSidebarOpen ? "240px" : "0px"} 1fr ${memberPanelOpen ? "240px" : "0px"}`,
            }}
        >
            {serverSidebar}
            {channelSidebar}

            {/* Main chat area */}
            {activeChannel ? (
                <ChatArea
                    channel={activeChannel}
                    userName={userName}
                    sidebarOpen={sidebarOpen}
                    channelSidebarOpen={channelSidebarOpen}
                    memberPanelOpen={memberPanelOpen}
                    onToggleSidebar={onToggleSidebar}
                    onToggleChannelSidebar={onToggleChannelSidebar}
                    onToggleMemberPanel={onToggleMemberPanel}
                />
            ) : (
                <EmptyState
                    sidebarOpen={sidebarOpen}
                    onToggleSidebar={onToggleSidebar}
                />
            )}

            {memberPanel}
        </div>
    );
});

/** Empty state shown when no channel is selected (desktop) */
const EmptyState = memo(function EmptyState({
    sidebarOpen,
    onToggleSidebar,
}: {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
}) {
    return (
        <div className="flex flex-col min-w-0">
            <div className="flex items-center h-12 px-3 gap-2 surface-elevated border-b border-[hsl(var(--border))]">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                        sidebarOpen && "text-[var(--organic-sage)]"
                    )}
                    onClick={onToggleSidebar}
                    aria-label="Toggle servers"
                >
                    <Menu className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="status-dot status-dot--xs" />
                    E2EE
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="brand-logo brand-logo--lg">🪷</div>
                    <h1 className="text-3xl brand-title">Lotus</h1>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center leading-relaxed">
                        Select a channel to start chatting,
                        <br />
                        or create a new server.
                    </p>
                </div>
            </div>
        </div>
    );
});
