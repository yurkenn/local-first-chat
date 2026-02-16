import { useState, useRef, useEffect } from "react";
import { Crown, Pen, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPopoverProps {
    name: string;
    role: string;
    /** Anchor element to position relative to */
    anchorRect: DOMRect;
    onClose: () => void;
}

/** Get role badge config */
function getRoleBadge(role: string) {
    switch (role) {
        case "admin":
            return { icon: Crown, label: "Admin", color: "text-amber-400", bg: "bg-amber-400/10" };
        case "writer":
            return { icon: Pen, label: "Member", color: "text-[var(--organic-sage)]", bg: "bg-[var(--organic-sage)]/10" };
        case "reader":
            return { icon: Shield, label: "Reader", color: "text-blue-400", bg: "bg-blue-400/10" };
        default:
            return null;
    }
}

/**
 * UserPopover — Discord-style user card that appears on click.
 * Shows avatar, name, role badge.
 */
export function UserPopover({ name, role, anchorRect, onClose }: UserPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        // Position to the left of the anchor
        const cardWidth = 280;
        const cardHeight = 200;
        let top = anchorRect.top;
        let left = anchorRect.left - cardWidth - 12;

        // If would overflow left, position to right
        if (left < 8) {
            left = anchorRect.right + 12;
        }

        // If would overflow bottom
        if (top + cardHeight > window.innerHeight - 8) {
            top = window.innerHeight - cardHeight - 8;
        }

        setPosition({ top, left });
    }, [anchorRect]);

    // Close on click outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    const badge = getRoleBadge(role);
    const initials = name.slice(0, 2).toUpperCase();

    return (
        <div
            ref={popoverRef}
            className="fixed z-50 w-[280px] rounded-xl bg-[#111214] border border-white/10 shadow-2xl overflow-hidden"
            style={{
                top: position.top,
                left: position.left,
                animation: "lightbox-zoom-in 0.15s cubic-bezier(0.2, 0, 0, 1)",
            }}
        >
            {/* Banner */}
            <div className="h-16 bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B]" />

            {/* Avatar */}
            <div className="px-4 -mt-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-xl font-bold text-white border-[4px] border-[#111214]">
                    {initials}
                </div>
            </div>

            {/* Info */}
            <div className="px-4 pt-2 pb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">{name}</span>
                </div>

                {badge && (
                    <div className={cn("inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium", badge.bg, badge.color)}>
                        <badge.icon className="h-3 w-3" />
                        {badge.label}
                    </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[11px] font-semibold text-[#b5bac1] uppercase tracking-wide mb-1">About Me</p>
                    <p className="text-sm text-[#dbdee1]">No bio yet.</p>
                </div>
            </div>
        </div>
    );
}
