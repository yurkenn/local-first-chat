import { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Wifi, Radio } from "lucide-react";

interface MemberPanelProps {
    server: any;
    userName: string;
}

export const MemberPanel = memo(function MemberPanel({
    server,
    userName,
}: MemberPanelProps) {
    if (!server) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]">
                <div className="h-12 flex items-center px-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                    Members
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <Users className="h-8 w-8 mx-auto mb-3 text-[hsl(var(--muted-foreground))] opacity-40" />
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Select a server to see members
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]">
            <div className="h-12 flex items-center px-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                Members
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {/* Online members */}
                    <div className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Online — 1
                    </div>
                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[hsl(var(--secondary))/0.5] transition-colors">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm truncate flex-1">{userName}</span>
                        <div className="neon-dot" />
                    </div>
                </div>
            </ScrollArea>

            {/* Mesh status */}
            <div className="p-3 glass-strong border-t border-[var(--glass-border)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                    Mesh Network
                </div>
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] mb-1.5">
                    <Wifi className="h-3 w-3 text-[var(--neon-green)]" />
                    <span>P2P Direct — Active</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <Radio className="h-3 w-3 text-[#eab308]" />
                    <span>Relay Fallback — Standby</span>
                </div>
            </div>
        </div>
    );
});
