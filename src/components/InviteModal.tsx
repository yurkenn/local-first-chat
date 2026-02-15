import { useState } from "react";
import { toast } from "sonner";
import { createInviteLink } from "jazz-tools/react";
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

interface InviteModalProps {
    server: LoadedServer;
    onClose: () => void;
}

export function InviteModal({ server, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);
    const [inviteLink, setInviteLink] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleGenerateLink = () => {
        try {
            // Jazz docs: createInviteLink(coValue, role) — synchronous
            const link = createInviteLink(server as any, "writer", {
                valueHint: "server",
            });
            setInviteLink(link);
            setError("");
        } catch (err) {
            console.error("[InviteModal] createInviteLink error:", err);
            setError("Failed to generate invite link. Please try again.");
        }
    };

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

                {!inviteLink && !error && (
                    <Button onClick={handleGenerateLink} className="w-full">
                        Generate Invite Link
                    </Button>
                )}

                {error && (
                    <div className="text-sm text-red-500 text-center">{error}</div>
                )}

                {inviteLink && (
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
