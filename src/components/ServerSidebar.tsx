import { memo, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Plus, Download } from "lucide-react";

interface ServerSidebarProps {
    servers: any[];
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
                className="flex flex-col items-center gap-2 py-3 overflow-hidden bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]"
                aria-label="Servers"
            >
                {/* Home / DM icon */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="relative flex items-center">
                            {/* Active pill indicator */}
                            {!activeServerId && (
                                <div className="absolute -left-1 w-[3px] h-5 rounded-r-full bg-[var(--organic-sage)] transition-all duration-200" />
                            )}
                            <div
                                className={cn(
                                    "w-11 h-11 rounded-2xl flex items-center justify-center text-lg cursor-pointer transition-all duration-300",
                                    "hover:rounded-xl hover:scale-105 hover:shadow-[var(--shadow-md)]",
                                    !activeServerId
                                        ? "rounded-xl bg-[hsl(var(--primary))] shadow-[var(--shadow-md)]"
                                        : "bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--primary))]"
                                )}
                                onClick={() => onSelectServer("")}
                                onKeyDown={(e) => handleButtonKeyDown(e, () => onSelectServer(""))}
                                role="button"
                                tabIndex={0}
                                aria-label="Direct Messages"
                            >
                                💬
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Direct Messages</TooltipContent>
                </Tooltip>

                <Separator className="w-8 bg-[hsl(var(--border))]" />

                {/* Server list */}
                {servers.map((server) => {
                    if (!server) return null;
                    const isActive = server.$jazz.id === activeServerId;
                    return (
                        <Tooltip key={server.$jazz.id}>
                            <TooltipTrigger asChild>
                                <div className="relative flex items-center">
                                    {/* Active pill indicator */}
                                    {isActive && (
                                        <div className="absolute -left-1 w-[3px] h-5 rounded-r-full bg-[var(--organic-sage)] transition-all duration-200" />
                                    )}
                                    <div
                                        className={cn(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center text-lg cursor-pointer transition-all duration-300",
                                            "hover:rounded-xl hover:scale-105 hover:shadow-[var(--shadow-md)]",
                                            isActive
                                                ? "rounded-xl bg-[hsl(var(--primary))] shadow-[var(--shadow-md)]"
                                                : "bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--primary))]"
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

                <Separator className="w-8 bg-[hsl(var(--border))]" />

                {/* Create server button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[var(--organic-green)] bg-[hsl(var(--secondary))] hover:rounded-xl hover:bg-[var(--organic-green)] hover:text-black hover:scale-105 hover:shadow-[var(--shadow-md)] transition-all duration-300 cursor-pointer"
                            onClick={onCreateServer}
                            aria-label="Create a server"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Add a Server</TooltipContent>
                </Tooltip>

                {/* Join server button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] hover:rounded-xl hover:bg-[hsl(var(--primary))] hover:text-white hover:scale-105 hover:shadow-[var(--shadow-md)] transition-all duration-300 cursor-pointer"
                            onClick={onJoinServer}
                            aria-label="Join a server"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Join a Server</TooltipContent>
                </Tooltip>
            </nav>
        </TooltipProvider>
    );
});
