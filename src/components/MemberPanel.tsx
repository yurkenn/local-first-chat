import { memo, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Wifi, Radio, Crown, Shield, Pen } from "lucide-react";
import { getOwnerGroup } from "@/lib/jazz-helpers";
import type { LoadedServer } from "@/lib/jazz-types";

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

    // Separate admins from regular members
    const admins = members.filter((m) => m.role === "admin");
    const writers = members.filter((m) => m.role !== "admin");

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-l border-[rgba(255,255,255,0.06)]">
            <div className="h-[52px] flex items-center px-4 label-section border-b border-[rgba(255,255,255,0.06)]">
                Members — {members.length}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {/* Admins section */}
                    {admins.length > 0 && (
                        <>
                            <div className="px-1 py-1.5 label-section">
                                Admin — {admins.length}
                            </div>
                            {admins.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    name={member.name}
                                    role={member.role}
                                    isCurrentUser={member.name === userName}
                                />
                            ))}
                        </>
                    )}

                    {/* Members section */}
                    {writers.length > 0 && (
                        <>
                            <div className="px-1 py-1.5 label-section mt-2">
                                Members — {writers.length}
                            </div>
                            {writers.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    name={member.name}
                                    role={member.role}
                                    isCurrentUser={member.name === userName}
                                />
                            ))}
                        </>
                    )}

                    {/* Fallback: show current user if no members loaded */}
                    {members.length === 0 && (
                        <>
                            <div className="px-1 py-1.5 label-section">
                                Online — 1
                            </div>
                            <MemberRow
                                name={userName}
                                role="writer"
                                isCurrentUser={true}
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
        </div>
    );
});

/** Single member row */
function MemberRow({
    name,
    role,
    isCurrentUser,
}: {
    name: string;
    role: string;
    isCurrentUser: boolean;
}) {
    const badge = getRoleBadge(role);
    const BadgeIcon = badge?.icon;

    return (
        <div className="group flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-default">
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-xs font-semibold text-white shrink-0 transition-shadow group-hover:shadow-[var(--shadow-md)]">
                {(name || "?").charAt(0).toUpperCase()}
                {isCurrentUser && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--organic-green)] border-2 border-[hsl(var(--card))]" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[13px] truncate block">
                    {name}
                    {isCurrentUser && <span className="text-[11px] text-muted-color ml-1">(you)</span>}
                </span>
            </div>
            {BadgeIcon && (
                <BadgeIcon className={`h-3 w-3 ${badge.color} opacity-60`} />
            )}
        </div>
    );
}
