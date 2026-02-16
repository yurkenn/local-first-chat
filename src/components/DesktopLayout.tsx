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
    serverName: string;
    onSearch?: () => void;
}

/**
 * DesktopLayout — CSS Grid layout with collapsible sidebar panels.
 * Apple-style: clean transitions, no borders on outer edges.
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
    serverName,
    onSearch,
}: DesktopLayoutProps) {
    return (
        <div
            className="grid h-screen w-screen overflow-hidden bg-[hsl(var(--background))]"
            style={{
                gridTemplateColumns: `${sidebarOpen ? "64px" : "0px"} ${channelSidebarOpen ? "280px" : "0px"} 1fr ${memberPanelOpen ? "260px" : "0px"}`,
                transition: "grid-template-columns 0.35s cubic-bezier(0.2, 0, 0, 1)",
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
                    serverName={serverName}
                    onSearch={onSearch}
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
            {/* Top bar */}
            <div className="flex items-center h-[52px] px-4 gap-2 border-b border-[rgba(255,255,255,0.06)]">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-lg text-muted-color hover:text-primary-color hover:bg-[rgba(255,255,255,0.06)]",
                        sidebarOpen && "text-[hsl(var(--primary))]"
                    )}
                    onClick={onToggleSidebar}
                    aria-label="Toggle servers"
                >
                    <Menu className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(48,209,88,0.1)] text-[11px] font-medium text-[var(--organic-green)]">
                    <div className="w-[5px] h-[5px] rounded-full bg-[var(--organic-green)]" />
                    E2EE
                </div>
            </div>

            {/* Center content */}
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 animate-fade-in max-w-[320px]">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-[22px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                            <span className="text-4xl">🪷</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--organic-green)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                            <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">Welcome to Lotus</h1>
                        <p className="text-[14px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                            Select a channel to start chatting, or create a new server to begin your encrypted conversation.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <div className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded-md font-mono border border-[rgba(255,255,255,0.06)]">⌘</kbd>
                            <kbd className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded-md font-mono border border-[rgba(255,255,255,0.06)]">K</kbd>
                            <span>Search</span>
                        </div>
                        <div className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(48,209,88,0.08)] text-[var(--organic-green)] font-medium">
                            <div className="w-[5px] h-[5px] rounded-full bg-[var(--organic-green)]" />
                            E2EE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
