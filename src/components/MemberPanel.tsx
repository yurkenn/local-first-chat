import { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Wifi, Radio } from "lucide-react";
import type { LoadedServer } from "@/lib/jazz-types";

interface MemberPanelProps {
    server: LoadedServer | null;
    userName: string;
}

export const MemberPanel = memo(function MemberPanel({
    server,
    userName,
}: MemberPanelProps) {
    if (!server) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[rgba(255,255,255,0.06)]">
                <div className="h-[52px] flex items-center px-4 label-section border-b border-[rgba(255,255,255,0.06)]">
                    Members
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-color opacity-50" />
                        </div>
                        <p className="text-[13px] text-muted-color">
                            Select a server to see members
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[rgba(255,255,255,0.06)]">
            <div className="h-[52px] flex items-center px-4 label-section border-b border-[rgba(255,255,255,0.06)]">
                Members
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {/* Online members */}
                    <div className="px-1 py-1.5 label-section">
                        Online — 1
                    </div>
                    <div className="group flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-default">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-xs font-semibold text-white shrink-0 transition-shadow group-hover:shadow-[var(--shadow-md)]">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] truncate flex-1">{userName}</span>
                        <div className="status-dot status-dot--sm" />
                    </div>
                </div>
            </ScrollArea>

            {/* Mesh status — hover card */}
            <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
                <div className="hover-card p-3 space-y-2">
                    <div className="label-section">
                        Mesh Network
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-muted-color">
                        <Wifi className="h-3 w-3 text-[var(--organic-green)]" />
                        <span>P2P Direct — Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-muted-color">
                        <Radio className="h-3 w-3 text-[var(--organic-orange)]" />
                        <span>Relay Fallback — Standby</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
