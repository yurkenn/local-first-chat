import { memo, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Wifi, Radio, Crown, Shield, Pen } from "lucide-react";
import { getOwnerGroup } from "@/lib/jazz-helpers";
import type { LoadedServer } from "@/lib/jazz-types";
import { cn } from "@/lib/utils";
import { UserPopover } from "@/components/UserPopover";

interface MemberPanelProps {
    server: LoadedServer | null;
    userName: string;
}

/** Map Jazz roles to display info */
function getRoleBadge(role: string) {
    switch (role) {
        case "admin":
            return { icon: Crown, label: "Admin", color: "text-amber-400" };
        case "writer":
            return { icon: Pen, label: "Member", color: "text-[var(--organic-sage)]" };
        case "reader":
            return { icon: Shield, label: "Reader", color: "text-blue-400" };
        default:
            return null;
    }
}

export const MemberPanel = memo(function MemberPanel({
    server,
    userName,
}: MemberPanelProps) {
    // All hooks MUST be called before any early returns (Rules of Hooks)
    const [popover, setPopover] = useState<{ name: string; role: string; rect: DOMRect } | null>(null);

    // Get real members from the server's Jazz Group
    const members = useMemo(() => {
        if (!server) return [];
        try {
            const group = getOwnerGroup(server) as any;
            if (!group?.members) return [];

            return (group.members as Array<{ id: string; role: string; account: any }>)
                .filter((m) => {
                    // Filter out non-account entries (e.g. "everyone") and revoked members
                    if (!m || !m.id || m.role === "revoked") return false;
                    // "everyone" has a special ID format, skip it
                    if (m.id === "everyone") return false;
                    return true;
                })
                .map((m) => ({
                    id: m.id,
                    name: m.account?.profile?.name || m.account?.name || "Unknown",
                    role: m.role,
                }));
        } catch (err) {
            console.warn("[MemberPanel] Error reading group members:", err);
            return [];
        }
    }, [server]);

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

    const admins = members.filter((m) => m.role === "admin");
    const writers = members.filter((m) => m.role !== "admin");

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[rgba(255,255,255,0.06)]">
            <div className="h-[48px] flex items-center px-4 font-bold text-[14px] text-white border-b border-[rgba(255,255,255,0.06)]">
                Members — {members.length}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                    {/* Admins section */}
                    {admins.length > 0 && (
                        <>
                            <div className="px-2 py-3 text-[11px] font-bold uppercase text-[#949ba4] tracking-wide">
                                Admin — {admins.length}
                            </div>
                            {admins.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    name={member.name}
                                    role={member.role}
                                    isCurrentUser={member.name === userName}
                                    onClick={(rect) => setPopover({ name: member.name, role: member.role, rect })}
                                />
                            ))}
                        </>
                    )}

                    {/* Members section */}
                    {writers.length > 0 && (
                        <>
                            <div className="px-2 py-3 text-[11px] font-bold uppercase text-[#949ba4] tracking-wide mt-2">
                                Members — {writers.length}
                            </div>
                            {writers.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    name={member.name}
                                    role={member.role}
                                    isCurrentUser={member.name === userName}
                                    onClick={(rect) => setPopover({ name: member.name, role: member.role, rect })}
                                />
                            ))}
                        </>
                    )}

                    {/* Fallback */}
                    {members.length === 0 && (
                        <>
                            <div className="px-2 py-3 text-[11px] font-bold uppercase text-[#949ba4] tracking-wide">
                                Members — 1
                            </div>
                            <MemberRow
                                name={userName}
                                role="writer"
                                isCurrentUser={true}
                                onClick={(rect) => setPopover({ name: userName, role: "writer", rect })}
                            />
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Mesh status */}
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

            {/* User Popover */}
            {popover && (
                <UserPopover
                    name={popover.name}
                    role={popover.role}
                    anchorRect={popover.rect}
                    onClose={() => setPopover(null)}
                />
            )}
        </div>
    );
});

/** Single member row */
function MemberRow({
    name,
    role,
    isCurrentUser,
    onClick,
}: {
    name: string;
    role: string;
    isCurrentUser: boolean;
    onClick?: (rect: DOMRect) => void;
}) {
    const badge = getRoleBadge(role);
    const BadgeIcon = badge?.icon;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onClick?.(rect);
    };

    return (
        <div
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#34373c]/40 transition-all duration-75 cursor-pointer"
            onClick={handleClick}
        >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-[13px] font-semibold text-white shrink-0">
                {(name || "?").charAt(0).toUpperCase()}
                <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31]",
                    isCurrentUser ? "bg-[#5D8A3C]" : "bg-[#a3a6aa]"
                )} />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[15px] text-[#949ba4] group-hover:text-[#dbdee1] truncate block">
                    {name}
                </span>
            </div>
            {BadgeIcon && (
                <BadgeIcon className={`h-4 w-4 ${badge.color} opacity-90 group-hover:opacity-100`} />
            )}
        </div>
    );
}
