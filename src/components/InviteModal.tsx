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

interface InviteModalProps {
    server: any;
    onClose: () => void;
}

export function InviteModal({ server, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    const inviteCode = server?.$jazz?.id || "N/A";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            toast.success("Invite code copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            try {
                const codeElement = document.querySelector("[data-invite-code]");
                if (codeElement) {
                    const range = document.createRange();
                    range.selectNodeContents(codeElement);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    setCopied(true);
                    setTimeout(() => {
                        setCopied(false);
                        selection?.removeAllRanges();
                    }, 2000);
                }
            } catch {
                console.warn("[InviteModal] Clipboard API unavailable");
            }
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Invite People</DialogTitle>
                    <DialogDescription>
                        Share this invite code with friends to let them join{" "}
                        <strong className="text-[hsl(var(--foreground))]">{server?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] p-3">
                    <code
                        className="flex-1 text-sm font-mono text-[var(--neon-cyan)] select-all break-all"
                        data-invite-code
                    >
                        {inviteCode}
                    </code>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        className="shrink-0"
                    >
                        {copied ? (
                            <><Check className="h-4 w-4 mr-1 text-[var(--neon-green)]" /> Copied!</>
                        ) : (
                            <><Copy className="h-4 w-4 mr-1" /> Copy</>
                        )}
                    </Button>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Recipients can join by pasting this code in their Lotus app.
                </p>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
