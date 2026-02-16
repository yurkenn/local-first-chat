import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Menu,
    Hash,
    Volume2,
    Users,
    Shield,
    Bell,
    Pin,
    MessageSquare,
    HelpCircle,
    Inbox
} from "lucide-react";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    channelSidebarOpen: _channelSidebarOpen,
    memberPanelOpen,
    onToggleSidebar,
    onToggleChannelSidebar: _onToggleChannelSidebar,
    onToggleMemberPanel,
}: ChatHeaderProps) {
    return (
        <div className="relative flex items-center h-[48px] px-2 gap-0.5 bg-[var(--background)] shrink-0 shadow-sm z-10">
            {/* Bottom border — ultra-thin */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[rgba(0,0,0,0.2)]" />

            {/* Left controls (Standard Discord Sidebar Toggles) */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 rounded-md text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#3f4147]/50 lg:hidden",
                    sidebarOpen && "text-white bg-[#3f4147]"
                )}
                onClick={onToggleSidebar}
                aria-label="Toggle servers"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Channel info */}
            <div className="flex items-center gap-2 ml-2 min-w-0 flex-1 lg:flex-none">
                {channelType === "voice" ? (
                    <Volume2 className="h-6 w-6 text-[#80848e] shrink-0" />
                ) : (
                    <Hash className="h-6 w-6 text-[#80848e] shrink-0" />
                )}
                <span className="text-[16px] font-bold text-white truncate leading-tight">
                    {channelName}
                </span>
            </div>

            {/* Spacer for desktop header icons */}
            <div className="flex-1" />

            {/* Desktop Action Icons (Discord-accurate stack) */}
            <div className="flex items-center gap-2 pr-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Threads</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                            <Bell className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Notification Settings</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                            <Pin className="h-5 w-5 rotate-[45deg]" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pinned Messages</TooltipContent>
                </Tooltip>

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-6 w-6 rounded-md text-[#b5bac1] hover:text-[#dbdee1] transition-colors",
                        memberPanelOpen && "text-white"
                    )}
                    onClick={onToggleMemberPanel}
                    aria-label="Toggle member list"
                >
                    <Users className="h-6 w-6" />
                </Button>

                {/* E2EE indicator - subtle version */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center justify-center h-6 w-6">
                            <Shield className="h-4 w-4 text-[#23a559]" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>End-to-End Encrypted via Jazz</TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-6 bg-[#3f4147] mx-1 hidden sm:block" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:flex">
                            <Inbox className="h-6 w-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Inbox</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:flex">
                            <HelpCircle className="h-6 w-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Help</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
});
