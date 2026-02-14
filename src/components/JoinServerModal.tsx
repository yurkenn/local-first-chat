import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { handleError } from "@/lib/error-utils";
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
import { Loader2, Hash, ShieldAlert } from "lucide-react";
import { joinRateLimiter } from "@/lib/rate-limiter";
import { coPush, getCoId, isAccountLoaded, getServerArray } from "@/lib/jazz-helpers";

interface JoinServerModalProps {
    onClose: () => void;
    onJoined: (serverId: string) => void;
}

/**
 * Validate invite code format.
 * Jazz CoValue IDs are `co_z` followed by a base58-like string (alphanumeric, no 0OIl).
 */
const INVITE_CODE_REGEX = /^co_z[A-HJ-NP-Za-km-z1-9]{10,60}$/;

function validateInviteCode(code: string): string | null {
    const trimmed = code.trim();
    if (!trimmed) return "Please paste an invite code.";
    if (trimmed.length < 10) return "Invite code is too short.";
    if (trimmed.length > 80) return "Invite code is too long.";
    if (!trimmed.startsWith("co_")) return "Invalid invite code. It should start with 'co_'.";
    if (!INVITE_CODE_REGEX.test(trimmed)) return "Invalid invite code format. Please check and try again.";
    return null;
}

export function JoinServerModal({ onClose, onJoined }: JoinServerModalProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const me = useCoState(ChatAccount, "me", {
        resolve: { root: { servers: true } },
    });

    const trimmedCode = inviteCode.trim();
    const isValidFormat = INVITE_CODE_REGEX.test(trimmedCode);

    const serverPreview = useCoState(
        ChatServer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isValidFormat ? (trimmedCode as any) : undefined,
        { resolve: { channels: { $each: true } } }
    );

    // Derive loading state from Jazz's internal status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previewAny = serverPreview as any;
    const loadingState: string | undefined = previewAny?.$jazz?.loadingState;
    const isFullyLoaded = previewAny?.$isLoaded === true;

    // Timeout: if still loading after 15 seconds, show a helpful message
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);
    useEffect(() => {
        if (!isValidFormat || isFullyLoaded) {
            setLoadingTimedOut(false);
            return;
        }
        const timer = setTimeout(() => setLoadingTimedOut(true), 15000);
        return () => clearTimeout(timer);
    }, [isValidFormat, isFullyLoaded, trimmedCode]);

    const handleJoin = useCallback(() => {
        // Validate format
        const validationError = validateInviteCode(inviteCode);
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

        // Check server loaded
        if (!serverPreview) {
            setError("Could not find a server with that invite code. It may still be loading — try again in a moment.");
            return;
        }

        // Check account loaded
        if (!isAccountLoaded(me) || !me) {
            setError("Account not loaded yet. Please wait...");
            return;
        }

        // Check duplicate
        const servers = getServerArray(me);
        const alreadyJoined = servers.some(
            (s) => getCoId(s) === trimmedCode
        );
        if (alreadyJoined) {
            setError("You've already joined this server!");
            return;
        }

        setJoining(true);
        joinRateLimiter.record();

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverList = (me as any)?.root?.servers;
            coPush(serverList, serverPreview);
            const serverId = getCoId(serverPreview);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.success(`Joined "${(serverPreview as any)?.name || 'server'}"`);
            onJoined(serverId ?? '');
        } catch (err) {
            handleError(err, { context: "JoinServer" });
            setError("Failed to join server. Please try again.");
            setJoining(false);
        }
    }, [inviteCode, trimmedCode, serverPreview, me, onJoined]);

    const isLoaded = isFullyLoaded && !!serverPreview;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sp = serverPreview as any;
    const serverName = isLoaded ? sp?.name : null;
    const serverEmoji = isLoaded ? sp?.iconEmoji : null;
    const channelCount = isLoaded && sp?.channels
        ? Array.from(sp.channels).filter(Boolean).length
        : 0;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Join a Server</DialogTitle>
                    <DialogDescription>
                        Paste an invite code to join an existing server.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="label-section">
                            Invite Code
                        </label>
                        <Input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => {
                                setInviteCode(e.target.value);
                                setError(null);
                            }}
                            placeholder="co_zQZKpq..."
                            autoFocus
                            className="input-base font-mono"
                        />
                    </div>

                    {/* Server preview card */}
                    {isLoaded && serverName && (
                        <div className="flex items-center gap-3 rounded-lg bg-surface border border-[hsl(var(--border))] p-3 animate-fade-in">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--organic-sage)] to-[var(--organic-green)] flex items-center justify-center text-lg shrink-0">
                                {serverEmoji || "💬"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{serverName}</div>
                                <div className="text-xs text-muted-color flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {channelCount} channel{channelCount !== 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading states */}
                    {isValidFormat && !isLoaded && loadingState === "unauthorized" && (
                        <div className="flex items-start gap-2 bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] text-[hsl(var(--destructive))] text-sm rounded-lg px-3 py-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>You don't have permission to access this server. The invite code may be invalid or expired.</span>
                        </div>
                    )}
                    {isValidFormat && !isLoaded && loadingState === "unavailable" && (
                        <div className="flex items-start gap-2 bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] text-[hsl(var(--destructive))] text-sm rounded-lg px-3 py-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Server not found. The invite code may be incorrect or the server may have been deleted.</span>
                        </div>
                    )}
                    {isValidFormat && !isLoaded && loadingState !== "unauthorized" && loadingState !== "unavailable" && (
                        <div className="flex items-center gap-2 text-sm text-muted-color">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {loadingTimedOut
                                ? "Still looking... The server might be unavailable or the code might be incorrect."
                                : "Looking for server..."}
                        </div>
                    )}

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
                        disabled={joining || !isLoaded}
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
