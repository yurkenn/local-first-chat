import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Shield, X } from "lucide-react";

interface PendingInvite {
    serverId: string;
    serverName: string;
    serverIcon: string;
}

interface InviteAcceptModalProps {
    invite: PendingInvite;
    onAccept: () => void;
    onDecline: () => void;
}

export function InviteAcceptModal({ invite, onAccept, onDecline }: InviteAcceptModalProps) {
    const [joining, setJoining] = useState(false);

    const handleJoin = () => {
        setJoining(true);
        onAccept();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onDecline()}>
            <DialogContent className="dialog-base sm:max-w-sm">
                <DialogHeader className="items-center text-center">
                    <DialogTitle className="text-xl font-heading">
                        You&apos;ve been invited!
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-color">
                        Someone shared a server invite with you
                    </DialogDescription>
                </DialogHeader>

                {/* Server Preview Card */}
                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Server Icon */}
                    <div className="relative">
                        {invite.serverIcon ? (
                            <img
                                src={invite.serverIcon}
                                alt={invite.serverName}
                                className="w-20 h-20 rounded-2xl object-cover border-2 border-[hsl(var(--border))] shadow-lg"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--organic-green)] to-[var(--organic-sage)] flex items-center justify-center shadow-lg border-2 border-[hsl(var(--border))]">
                                <span className="text-3xl font-bold text-white">
                                    {invite.serverName?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--organic-green)] rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]">
                            <Users className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    {/* Server Name */}
                    <div className="text-center">
                        <h3 className="text-lg font-heading font-semibold text-primary-color">
                            {invite.serverName || "Unknown Server"}
                        </h3>
                    </div>

                    {/* Info Note */}
                    <div className="flex items-center gap-2 text-xs text-muted-color bg-surface rounded-lg px-3 py-2 border border-[hsl(var(--border))]">
                        <Shield className="w-3.5 h-3.5 shrink-0 text-[var(--organic-green)]" />
                        <span>Joining gives you access to all channels in this server</span>
                    </div>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <Button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full bg-[var(--organic-green)] hover:bg-[var(--organic-green)]/90 text-white font-medium"
                    >
                        {joining ? "Joining..." : "Join Server"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onDecline}
                        disabled={joining}
                        className="w-full text-muted-color"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export type { PendingInvite };
