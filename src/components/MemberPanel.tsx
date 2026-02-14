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
                <div className="h-12 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                    Members
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-center">
                            <Users className="h-5 w-5 text-[hsl(var(--muted-foreground))] opacity-50" />
                        </div>
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
            <div className="h-12 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                Members
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {/* Online members */}
                    <div className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Online — 1
                    </div>
                    <div className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--secondary))/0.5] transition-colors cursor-default">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[var(--organic-blue)] flex items-center justify-center text-xs font-bold text-white shrink-0 transition-shadow group-hover:shadow-[var(--shadow-md)]">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm truncate flex-1">{userName}</span>
                        <div className="status-dot status-dot--sm" />
                    </div>
                </div>
            </ScrollArea>

            {/* Mesh status — hover card */}
            <div className="p-3 border-t border-[hsl(var(--border))]">
                <div className="hover-card p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Mesh Network
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <Wifi className="h-3 w-3 text-[var(--organic-green)]" />
                        <span>P2P Direct — Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <Radio className="h-3 w-3 text-[var(--organic-orange)]" />
                        <span>Relay Fallback — Standby</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
