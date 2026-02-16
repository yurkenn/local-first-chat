import { memo, type ReactNode } from "react";
import { ChatArea } from "@/components/ChatArea";
import { cn } from "@/lib/utils";
import { ChevronLeft, Users, X, Plus, Download } from "lucide-react";
import type { MobileScreen } from "@/hooks/useLayoutState";

interface ServerInfo {
    id: string;
    name: string;
    iconEmoji?: string;
}

interface MobileLayoutProps {
    // Navigation
    mobileScreen: MobileScreen;
    onNavigateToServers: () => void;
    onNavigateToChannels: () => void;
    onNavigateToChat: () => void;
    // Member panel
    memberPanelOpen: boolean;
    onToggleMemberPanel: () => void;
    // Data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeChannel: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeServer: any;
    userName: string;
    // Server data for mobile list
    servers: ServerInfo[];
    activeServerId: string | null;
    onSelectServer: (id: string) => void;
    onCreateServer: () => void;
    onJoinServer: () => void;
    // Rendered children
    channelSidebar: ReactNode;
    memberPanel: ReactNode;
    // Legacy (for desktop compat — needed for ChatArea)
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
}

/**
 * MobileLayout — iOS-style page-stack navigation.
 *
 * Three full-screen pages:
 * 1. Servers — full-screen server list with names
 * 2. Channels — full-screen channel list with back button
 * 3. Chat — full-screen chat with back button
 *
 * Member panel appears as a bottom half-sheet overlay.
 */
export const MobileLayout = memo(function MobileLayout({
    mobileScreen,
    onNavigateToServers,
    onNavigateToChannels,
    onNavigateToChat: _onNavigateToChat,
    memberPanelOpen,
    onToggleMemberPanel,
    activeChannel,
    activeServer,
    userName,
    servers,
    activeServerId,
    onSelectServer,
    onCreateServer,
    onJoinServer,
    channelSidebar,
    memberPanel,
    sidebarOpen,
    channelSidebarOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
}: MobileLayoutProps) {
    return (
        <div className="relative h-[100dvh] w-screen overflow-hidden bg-[hsl(var(--background))]">
            {/* ── Page Stack ── */}
            {/* Server list — visible when mobileScreen === 'servers' */}
            <div
                className={cn(
                    "absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                    mobileScreen === "servers"
                        ? "translate-x-0"
                        : "-translate-x-full"
                )}
            >
                <MobileServerPage
                    servers={servers}
                    activeServerId={activeServerId}
                    onSelectServer={onSelectServer}
                    onCreateServer={onCreateServer}
                    onJoinServer={onJoinServer}
                />
            </div>

            {/* Channel list — visible when mobileScreen === 'channels' */}
            <div
                className={cn(
                    "absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                    mobileScreen === "channels"
                        ? "translate-x-0"
                        : mobileScreen === "servers"
                            ? "translate-x-full"
                            : "-translate-x-full"
                )}
            >
                <MobileChannelPage
                    channelSidebar={channelSidebar}
                    onBack={onNavigateToServers}
                    serverName={activeServer?.name}
                />
            </div>

            {/* Chat — visible when mobileScreen === 'chat' */}
            <div
                className={cn(
                    "absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                    mobileScreen === "chat"
                        ? "translate-x-0"
                        : "translate-x-full"
                )}
            >
                {activeChannel ? (
                    <MobileChatPage
                        channel={activeChannel}
                        userName={userName}
                        activeServer={activeServer}
                        onBack={onNavigateToChannels}
                        onToggleMemberPanel={onToggleMemberPanel}
                        memberPanelOpen={memberPanelOpen}
                        sidebarOpen={sidebarOpen}
                        channelSidebarOpen={channelSidebarOpen}
                        onToggleSidebar={onToggleSidebar}
                        onToggleChannelSidebar={onToggleChannelSidebar}
                    />
                ) : (
                    <MobileEmptyChat onBack={onNavigateToChannels} />
                )}
            </div>

            {/* ── Member Panel: Bottom Half-Sheet ── */}
            {memberPanelOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] animate-fade-in"
                        onClick={onToggleMemberPanel}
                        aria-hidden
                    />
                    {/* Sheet */}
                    <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[70dvh] rounded-t-[20px] bg-[hsl(var(--card))] border-t border-[hsl(var(--border)/0.5)] shadow-[var(--shadow-xl)] overflow-hidden" style={{ animation: 'slide-up-sheet 0.35s cubic-bezier(0.2, 0, 0, 1)' }}>
                        {/* Handle bar */}
                        <div className="flex items-center justify-center pt-2.5 pb-1">
                            <div className="w-9 h-1 rounded-full bg-[hsl(var(--muted-foreground)/0.3)]" />
                        </div>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pb-2.5">
                            <h3 className="text-sm font-semibold">Members</h3>
                            <button
                                className="h-7 w-7 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                                onClick={onToggleMemberPanel}
                                aria-label="Close members"
                            >
                                <X className="h-3.5 w-3.5 text-muted-color" />
                            </button>
                        </div>
                        {/* Panel content — scrollable */}
                        <div className="overflow-y-auto max-h-[calc(70dvh-60px)] overscroll-contain">
                            {memberPanel}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Sub-pages                                                     */
/* ═══════════════════════════════════════════════════════════════ */

/** Server page — full-screen server list with names */
const MobileServerPage = memo(function MobileServerPage({
    servers,
    activeServerId,
    onSelectServer,
    onCreateServer,
    onJoinServer,
}: {
    servers: ServerInfo[];
    activeServerId: string | null;
    onSelectServer: (id: string) => void;
    onCreateServer: () => void;
    onJoinServer: () => void;
}) {
    return (
        <div className="h-full flex flex-col bg-[hsl(var(--background))]">
            {/* Header */}
            <div className="flex items-center h-[56px] px-4 shrink-0 border-b border-[hsl(var(--border)/0.5)]">
                <div className="flex items-center gap-2.5">
                    <img src="/lotus-logo.png" alt="Lotus" className="w-6 h-6 rounded" />
                    <h1 className="text-lg font-semibold tracking-[-0.02em]">Lotus</h1>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 text-[10px] text-muted-color px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.1)] border border-[rgba(48,209,88,0.12)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--organic-green)]" />
                    E2EE
                </div>
            </div>

            {/* Server list — full-width cards */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-3 space-y-1">
                    {/* Direct Messages */}
                    <button
                        className={cn(
                            "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]",
                            !activeServerId
                                ? "bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.2)]"
                                : "hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                        )}
                        onClick={() => onSelectServer("")}
                    >
                        <div className={cn(
                            "w-11 h-11 rounded-[14px] flex items-center justify-center text-lg shrink-0 transition-colors",
                            !activeServerId
                                ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                                : "bg-[rgba(255,255,255,0.06)]"
                        )}>
                            💬
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-[15px] font-medium truncate">Direct Messages</p>
                            <p className="text-[12px] text-muted-color">Private conversations</p>
                        </div>
                    </button>

                    {/* Separator */}
                    <div className="h-[0.5px] bg-[hsl(var(--border)/0.3)] mx-2 my-1.5" />

                    {/* Servers */}
                    {servers.map((server) => {
                        const isActive = server.id === activeServerId;
                        return (
                            <button
                                key={server.id}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]",
                                    isActive
                                        ? "bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.2)]"
                                        : "hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                                )}
                                onClick={() => onSelectServer(server.id)}
                            >
                                <div className={cn(
                                    "w-11 h-11 rounded-[14px] flex items-center justify-center text-lg shrink-0 transition-colors",
                                    isActive
                                        ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                                        : "bg-[rgba(255,255,255,0.06)]"
                                )}>
                                    {server.iconEmoji || "📁"}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-[15px] font-medium truncate">{server.name}</p>
                                </div>
                                {isActive && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-[hsl(var(--primary))] shrink-0" />
                                )}
                            </button>
                        );
                    })}

                    {/* Separator */}
                    <div className="h-[0.5px] bg-[hsl(var(--border)/0.3)] mx-2 my-1.5" />

                    {/* Actions */}
                    <button
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200 active:scale-[0.98] border border-transparent"
                        onClick={onCreateServer}
                    >
                        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center bg-[rgba(48,209,88,0.1)] border border-[rgba(48,209,88,0.15)] shrink-0">
                            <Plus className="h-5 w-5 text-[var(--organic-green)]" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-[15px] font-medium text-[var(--organic-green)]">Create Server</p>
                        </div>
                    </button>

                    <button
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200 active:scale-[0.98] border border-transparent"
                        onClick={onJoinServer}
                    >
                        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center bg-[rgba(255,255,255,0.04)] border border-[hsl(var(--border)/0.3)] shrink-0">
                            <Download className="h-5 w-5 text-muted-color" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-[15px] font-medium text-muted-color">Join Server</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
});

/** Channel page — full-screen channel list with back button */
const MobileChannelPage = memo(function MobileChannelPage({
    channelSidebar,
    onBack,
    serverName,
}: {
    channelSidebar: ReactNode;
    onBack: () => void;
    serverName?: string;
}) {
    return (
        <div className="h-full flex flex-col bg-[hsl(var(--background))]">
            {/* Header with back button */}
            <div className="flex items-center h-[56px] px-2 shrink-0 border-b border-[hsl(var(--border)/0.5)]">
                <button
                    className="flex items-center gap-0.5 px-2 py-1.5 -ml-1 rounded-lg text-[hsl(var(--primary))] hover:bg-[rgba(255,255,255,0.06)] transition-colors active:scale-95"
                    onClick={onBack}
                    aria-label="Back to servers"
                >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-[15px] font-medium">Servers</span>
                </button>
                <div className="flex-1" />
                {serverName && (
                    <span className="text-sm font-semibold text-primary-color mr-3 truncate max-w-[180px]">
                        {serverName}
                    </span>
                )}
            </div>

            {/* Channel sidebar content — full-width */}
            <div className="flex-1 overflow-y-auto">
                {channelSidebar}
            </div>
        </div>
    );
});

/** Chat page — full-screen chat with back button */
const MobileChatPage = memo(function MobileChatPage({
    channel,
    activeServer,
    userName,
    onBack,
    onToggleMemberPanel,
    memberPanelOpen,
    sidebarOpen,
    channelSidebarOpen,
    onToggleSidebar,
    onToggleChannelSidebar,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: any;
    activeServer: any;
    userName: string;
    onBack: () => void;
    onToggleMemberPanel: () => void;
    memberPanelOpen: boolean;
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelSidebar: () => void;
}) {
    return (
        <div className="h-full flex flex-col bg-[hsl(var(--background))]">
            {/* Mobile chat header */}
            <div className="flex items-center h-[56px] px-2 shrink-0 border-b border-[hsl(var(--border)/0.5)]">
                {/* Back button */}
                <button
                    className="flex items-center gap-0.5 px-2 py-1.5 -ml-1 rounded-lg text-[hsl(var(--primary))] hover:bg-[rgba(255,255,255,0.06)] transition-colors active:scale-95"
                    onClick={onBack}
                    aria-label="Back to channels"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Channel name */}
                <div className="flex items-center gap-1.5 ml-1 min-w-0 flex-1">
                    <span className="text-[15px] font-semibold tracking-[-0.01em] truncate">
                        #{channel?.name || "channel"}
                    </span>
                </div>

                {/* Right controls */}
                <button
                    className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
                        memberPanelOpen
                            ? "text-[hsl(var(--primary))] bg-[rgba(59,155,104,0.1)]"
                            : "text-muted-color hover:text-primary-color hover:bg-[rgba(255,255,255,0.06)]"
                    )}
                    onClick={onToggleMemberPanel}
                    aria-label="Toggle members"
                >
                    <Users className="h-4 w-4" />
                </button>
            </div>

            {/* Chat area — full screen */}
            <div className="flex-1 min-h-0">
                <ChatArea
                    channel={channel}
                    serverName={activeServer?.name || "Server"}
                    userName={userName}
                    sidebarOpen={sidebarOpen}
                    channelSidebarOpen={channelSidebarOpen}
                    memberPanelOpen={memberPanelOpen}
                    onToggleSidebar={onToggleSidebar}
                    onToggleChannelSidebar={onToggleChannelSidebar}
                    onToggleMemberPanel={onToggleMemberPanel}
                    hideHeader
                />
            </div>
        </div>
    );
});

/** Empty chat state for when no channel is selected */
const MobileEmptyChat = memo(function MobileEmptyChat({
    onBack,
}: {
    onBack: () => void;
}) {
    return (
        <div className="h-full flex flex-col bg-[hsl(var(--background))]">
            <div className="flex items-center h-[56px] px-2 shrink-0 border-b border-[hsl(var(--border)/0.5)]">
                <button
                    className="flex items-center gap-0.5 px-2 py-1.5 -ml-1 rounded-lg text-[hsl(var(--primary))] hover:bg-[rgba(255,255,255,0.06)] transition-colors active:scale-95"
                    onClick={onBack}
                    aria-label="Back to channels"
                >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-[15px] font-medium">Channels</span>
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-5 animate-fade-in max-w-[280px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[hsl(var(--primary)/0.15)] rounded-full blur-2xl scale-150" />
                        <div className="relative w-16 h-16 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.5)] flex items-center justify-center shadow-[var(--shadow-md)]">
                            <img src="/lotus-logo.png" alt="Lotus" className="w-8 h-8 rounded-lg" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl brand-title mb-1.5">Lotus</h1>
                        <p className="text-xs text-muted-color leading-relaxed">
                            Select a channel to start chatting.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});
