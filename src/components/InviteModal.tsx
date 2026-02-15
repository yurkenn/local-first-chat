import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createInviteLink } from "jazz-tools";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import type { LoadedServer } from "@/lib/jazz-types";

interface InviteModalProps {
    server: LoadedServer;
    onClose: () => void;
}

export function InviteModal({ server, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);

    // Generate invite link asynchronously to prevent blocking the main thread
    useEffect(() => {
        let cancelled = false;
        setIsGenerating(true);

        // Use requestIdleCallback / setTimeout to yield to the browser
        const timer = setTimeout(() => {
            try {
                const baseURL = window.location.origin + "/";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const link = createInviteLink(server as any, "writer", baseURL, "server");
                if (!cancelled) {
                    setInviteLink(link);
                }
            } catch (err) {
                console.error("[InviteModal] Failed to create invite link:", err);
                if (!cancelled) {
                    setInviteLink(null);
                }
            } finally {
                if (!cancelled) {
                    setIsGenerating(false);
                }
            }
        }, 50);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [server]);

    const handleCopy = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success("Invite link copied!");
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
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Invite People</DialogTitle>
                    <DialogDescription>
                        Share this invite link with friends to let them join{" "}
                        <strong className="text-primary-color">{server?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {isGenerating ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-surface border border-[hsl(var(--border))] p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-color" />
                        <span className="text-sm text-muted-color">Generating invite link...</span>
                    </div>
                ) : inviteLink ? (
                    <div className="flex items-center gap-2 rounded-lg bg-surface border border-[hsl(var(--border))] p-3">
                        <code
                            className="flex-1 text-xs font-mono text-[var(--organic-sage)] select-all break-all leading-relaxed"
                            data-invite-code
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
                        Unable to generate invite link. Please try again.
                    </div>
                )}

                <p className="text-xs text-muted-color">
                    Recipients can join by pasting this link in their Lotus app.
                </p>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
