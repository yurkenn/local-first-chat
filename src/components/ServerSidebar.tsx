import { memo, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Plus, Download } from "lucide-react";
import type { LoadedServer } from "@/lib/jazz-types";

interface ServerSidebarProps {
    servers: LoadedServer[];
    activeServerId: string | null;
    onSelectServer: (id: string) => void;
    onCreateServer: () => void;
    onJoinServer: () => void;
}

function handleButtonKeyDown(e: KeyboardEvent<HTMLDivElement>, action: () => void) {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
    }
}

export const ServerSidebar = memo(function ServerSidebar({
    servers,
    activeServerId,
    onSelectServer,
    onCreateServer,
    onJoinServer,
}: ServerSidebarProps) {
    return (
        <TooltipProvider delayDuration={200}>
            <nav
                className="flex flex-col items-center gap-1.5 py-3 overflow-hidden bg-[hsl(var(--sidebar))] border-r border-[rgba(255,255,255,0.06)]"
                aria-label="Servers"
            >
                {/* Home / Lotus Icon — always visible at the top like Discord */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="relative flex items-center group">
                            {/* Active pill indicator */}
                            <div className={cn(
                                "absolute -left-[4px] w-[8px] rounded-r-full bg-white transition-all duration-200 origin-left",
                                !activeServerId ? "h-10 scale-100" : "h-2 scale-0 group-hover:scale-100"
                            )} />
                            <div
                                className={cn(
                                    "w-[48px] h-[48px] rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden",
                                    !activeServerId
                                        ? "rounded-xl shadow-[var(--shadow-md)] ring-2 ring-[hsl(var(--primary))]"
                                        : "bg-[#313338] hover:rounded-xl hover:ring-2 hover:ring-[hsl(var(--primary)/0.5)]"
                                )}
                                onClick={() => onSelectServer("")}
                                onKeyDown={(e) => handleButtonKeyDown(e, () => onSelectServer(""))}
                                role="button"
                                tabIndex={0}
                                aria-label="Home"
                            >
                                <img src="/lotus-logo.png" alt="Lotus" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Home</TooltipContent>
                </Tooltip>

                <Separator className="w-8 bg-[#35363c] h-[2px] mx-auto rounded-full" />

                {/* Server list */}
                {servers.map((server) => {
                    if (!server) return null;
                    const isActive = server.$jazz.id === activeServerId;
                    return (
                        <Tooltip key={server.$jazz.id}>
                            <TooltipTrigger asChild>
                                <div className="relative flex items-center group">
                                    {/* Active pill indicator */}
                                    <div className={cn(
                                        "absolute -left-[4px] w-[8px] rounded-r-full bg-white transition-all duration-200 origin-left",
                                        isActive ? "h-10 scale-100" : "h-2 scale-0 group-hover:scale-100"
                                    )} />
                                    <div
                                        className={cn(
                                            "w-[48px] h-[48px] rounded-2xl flex items-center justify-center text-lg cursor-pointer transition-all duration-200",
                                            isActive
                                                ? "rounded-xl bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-md)]"
                                                : "bg-[#313338] text-[#dbdee1] hover:rounded-xl hover:bg-[hsl(var(--primary))] hover:text-white"
                                        )}
                                        onClick={() => onSelectServer(server.$jazz.id)}
                                        onKeyDown={(e) => handleButtonKeyDown(e, () => onSelectServer(server.$jazz.id))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={server.name}
                                    >
                                        {server.iconEmoji || "📁"}
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">{server.name}</TooltipContent>
                        </Tooltip>
                    );
                })}

                <Separator className="w-8 bg-[#35363c] h-[2px] mx-auto rounded-full" />

                {/* Create server button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="relative flex items-center group">
                            <div className="absolute -left-[4px] w-[8px] h-2 rounded-r-full bg-white transition-all duration-200 origin-left scale-0 group-hover:scale-100" />
                            <button
                                className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center text-[var(--organic-green)] bg-[#313338] hover:rounded-xl hover:bg-[var(--organic-green)] hover:text-white transition-all duration-200 cursor-pointer"
                                onClick={onCreateServer}
                                aria-label="Create a server"
                            >
                                <Plus className="h-6 w-6" />
                            </button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Add a Server</TooltipContent>
                </Tooltip>

                {/* Join server button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="relative flex items-center group">
                            <div className="absolute -left-[4px] w-[8px] h-2 rounded-r-full bg-white transition-all duration-200 origin-left scale-0 group-hover:scale-100" />
                            <button
                                className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center text-[var(--organic-green)] bg-[#313338] hover:rounded-xl hover:bg-[var(--organic-green)] hover:text-white transition-all duration-200 cursor-pointer"
                                onClick={onJoinServer}
                                aria-label="Join a server"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Join a Server</TooltipContent>
                </Tooltip>
            </nav>
        </TooltipProvider>
    );
});
