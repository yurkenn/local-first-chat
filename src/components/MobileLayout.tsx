import { memo, type ReactNode } from "react";
import { ChatArea } from "@/components/ChatArea";
import { cn } from "@/lib/utils";
import { Menu, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileLayoutProps {
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
    onToggleMemberPanel: () => void;
    onCloseAllPanels: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeChannel: any;
    userName: string;
    serverSidebar: ReactNode;
    channelSidebar: ReactNode;
    memberPanel: ReactNode;
}

/**
 * MobileLayout — Full-screen chat with overlay panels.
 * Extracted from App.tsx for readability and to enable React.memo.
 */
export const MobileLayout = memo(function MobileLayout({
    sidebarOpen,
    channelSidebarOpen,
    memberPanelOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
    onToggleMemberPanel,
    onCloseAllPanels,
    activeChannel,
    userName,
    serverSidebar,
    channelSidebar,
    memberPanel,
}: MobileLayoutProps) {
    const anyOverlayOpen =
        sidebarOpen || channelSidebarOpen || memberPanelOpen;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Main chat area fills the screen */}
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
                <MobileEmptyState
                    sidebarOpen={sidebarOpen}
                    channelSidebarOpen={channelSidebarOpen}
                    onToggleSidebar={onToggleSidebar}
                    onToggleChannelSidebar={onToggleChannelSidebar}
                />
            )}

            {/* Backdrop overlay */}
            {anyOverlayOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 animate-fade-in"
                    onClick={onCloseAllPanels}
                    aria-hidden
                />
            )}

            {/* Server sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-y-0 left-0 z-40 w-[56px] animate-slide-in-left">
                    {serverSidebar}
                </div>
            )}

            {/* Channel sidebar overlay */}
            {channelSidebarOpen && (
                <div className="fixed inset-y-0 left-0 z-40 w-[280px] animate-slide-in-left">
                    {channelSidebar}
                </div>
            )}

            {/* Member panel overlay */}
            {memberPanelOpen && (
                <div className="fixed inset-y-0 right-0 z-40 w-[280px] animate-slide-in-right">
                    {memberPanel}
                </div>
            )}
        </div>
    );
});

/** Empty state shown when no channel is selected (mobile) */
const MobileEmptyState = memo(function MobileEmptyState({
    sidebarOpen,
    channelSidebarOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
}: {
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
}) {
    return (
        <div className="flex flex-col min-w-0 h-full">
            <div className="flex items-center h-12 px-3 gap-2 surface-elevated border-b border-[hsl(var(--border))]">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 text-muted-color hover:text-primary-color",
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
                        "h-8 w-8 text-muted-color hover:text-primary-color",
                        channelSidebarOpen && "text-[var(--organic-sage)]"
                    )}
                    onClick={onToggleChannelSidebar}
                    aria-label="Toggle channels"
                >
                    <Hash className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 text-xs text-muted-color">
                    <div className="status-dot status-dot--xs" />
                    E2EE
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="brand-logo brand-logo--lg">🪷</div>
                    <h1 className="text-3xl brand-title">Lotus</h1>
                    <p className="text-sm text-muted-color text-center leading-relaxed px-6">
                        Select a channel to start chatting,
                        <br />
                        or create a new server.
                    </p>
                </div>
            </div>
        </div>
    );
});
