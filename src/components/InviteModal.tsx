import { useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import type { LoadedServer } from "@/lib/jazz-types";
import { getCoId } from "@/lib/jazz-helpers";

interface InviteModalProps {
    server: LoadedServer;
    onClose: () => void;
}

export function InviteModal({ server, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    // Simple approach: just use the server's CoValue ID as the invite code
    const serverId = getCoId(server) || "";
    const inviteLink = serverId ? `${window.location.origin}/#/join/${serverId}` : "";

    const handleCopy = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success("Invite link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Invite People</DialogTitle>
                    <DialogDescription>
                        Share this link with friends to let them join{" "}
                        <strong className="text-primary-color">{server?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {inviteLink ? (
                    <div className="flex items-center gap-2 rounded-lg bg-surface border border-[hsl(var(--border))] p-3">
                        <code
                            className="flex-1 text-xs font-mono text-[var(--organic-sage)] select-all break-all leading-relaxed"
                        >
                            {inviteLink}
                        </code>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopy}
                            className="shrink-0"
                        >
                            {copied ? (
                                <><Check className="h-4 w-4 mr-1 text-[var(--organic-green)]" /> Copied!</>
                            ) : (
                                <><Copy className="h-4 w-4 mr-1" /> Copy</>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="text-sm text-muted-color">
                        Unable to get server ID.
                    </div>
                )}

                <p className="text-xs text-muted-color">
                    Recipients can join by pasting this link in their browser.
                </p>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
