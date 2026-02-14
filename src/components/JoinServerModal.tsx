import { useState, useCallback } from "react";
import { toast } from "sonner";
import { handleError } from "@/lib/error-utils";
import { consumeInviteLink, parseInviteLink } from "jazz-tools";
import { useCoState } from "jazz-tools/react";
import { ChatServer, ChatAccount } from "@/schema";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert } from "lucide-react";
import { joinRateLimiter } from "@/lib/rate-limiter";
import { coPush, isAccountLoaded, getServerArray, getCoId } from "@/lib/jazz-helpers";

interface JoinServerModalProps {
    onClose: () => void;
    onJoined: (serverId: string) => void;
}

/**
 * Validate that the pasted text looks like a Jazz invite link.
 * Format: https://domain/#/invite/{valueID}/{inviteSecret}
 */
function validateInviteLink(link: string): string | null {
    const trimmed = link.trim();
    if (!trimmed) return "Please paste an invite link.";
    if (trimmed.length < 20) return "Invite link is too short.";

    // Try to parse with Jazz's own parser
    const parsed = parseInviteLink(trimmed);
    if (!parsed) {
        // Check if user pasted a raw CoValue ID instead of a link
        if (trimmed.startsWith("co_")) {
            return "This looks like a raw ID, not an invite link. Please ask for a new invite link from the server owner.";
        }
        return "Invalid invite link format. Please check and try again.";
    }

    return null;
}

export function JoinServerModal({ onClose, onJoined }: JoinServerModalProps) {
    const [inviteLink, setInviteLink] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const me = useCoState(ChatAccount, "me", {
        resolve: { root: { servers: true } },
    });

    const handleJoin = useCallback(async () => {
        // Validate format
        const validationError = validateInviteLink(inviteLink);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Rate limit check
        const rateCheck = joinRateLimiter.check();
        if (!rateCheck.allowed) {
            setError(`Too many join attempts. Wait ${Math.ceil(rateCheck.retryAfterMs / 1000)}s before trying again.`);
            toast.warning("Join rate limited — please wait.");
            return;
        }

        // Check account loaded
        if (!isAccountLoaded(me) || !me) {
            setError("Still loading your account — please wait a moment and try again.");
            return;
        }

        setJoining(true);
        setError(null);
        joinRateLimiter.record();

        try {
            // Use Jazz's consumeInviteLink to properly join the Group
            const result = await consumeInviteLink({
                inviteURL: inviteLink.trim(),
                invitedObjectSchema: ChatServer,
                forValueHint: "server",
            });

            if (!result) {
                setError("Could not process this invite link. It may be invalid or expired.");
                setJoining(false);
                return;
            }

            // Load the server after accepting the invite
            const serverId = result.valueID as string;

            // Check if already joined
            const servers = getServerArray(me);
            const alreadyJoined = servers.some(
                (s) => getCoId(s) === serverId
            );
            if (alreadyJoined) {
                setError("You've already joined this server!");
                setJoining(false);
                return;
            }

            // Load the server and add it to our list
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const server = await (ChatServer as any).load(serverId, {
                resolve: { channels: { $each: true } },
            });

            if (!server) {
                setError("Server loaded but data is unavailable. Please try again.");
                setJoining(false);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverList = (me as any)?.root?.servers;
            coPush(serverList, server);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.success(`Joined "${(server as any)?.name || 'server'}"`);
            onJoined(serverId);
        } catch (err) {
            handleError(err, { context: "JoinServer" });
            setError("Failed to join server. The invite link may be invalid or expired.");
            setJoining(false);
        }
    }, [inviteLink, me, onJoined]);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Join a Server</DialogTitle>
                    <DialogDescription>
                        Paste an invite link to join an existing server.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="label-section">
                            Invite Link
                        </label>
                        <Input
                            type="text"
                            value={inviteLink}
                            onChange={(e) => {
                                setInviteLink(e.target.value);
                                setError(null);
                            }}
                            placeholder="https://lotus.app/#/invite/co_z..."
                            autoFocus
                            className="input-base font-mono text-xs"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] text-[hsl(var(--destructive))] text-sm rounded-lg px-3 py-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] text-white"
                        onClick={handleJoin}
                        disabled={joining || !inviteLink.trim() || !isAccountLoaded(me)}
                    >
                        {joining ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</>
                        ) : (
                            "Join Server"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
