import { useState } from "react";
import { toast } from "sonner";
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
import { Loader2, Hash } from "lucide-react";

interface JoinServerModalProps {
    onClose: () => void;
    onJoined: (serverId: string) => void;
}

export function JoinServerModal({ onClose, onJoined }: JoinServerModalProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const me = useCoState(ChatAccount, "me", {
        resolve: { root: { servers: true } },
    });

    const serverPreview = useCoState(
        ChatServer,
        inviteCode.trim().startsWith("co_") ? (inviteCode.trim() as any) : undefined,
        { resolve: { channels: { $each: true } } }
    );

    const handleJoin = () => {
        if (!inviteCode.trim()) {
            setError("Please paste an invite code.");
            return;
        }

        if (!inviteCode.trim().startsWith("co_")) {
            setError("Invalid invite code. It should start with 'co_'.");
            return;
        }

        if (!serverPreview || !(serverPreview as any).$isLoaded) {
            setError("Could not find a server with that invite code. It may still be loading — try again in a moment.");
            return;
        }

        const account = me as any;
        if (!account?.$isLoaded || !account?.root?.servers) {
            setError("Account not loaded yet. Please wait...");
            return;
        }

        const servers = Array.from(account.root.servers).filter(Boolean);
        const alreadyJoined = servers.some(
            (s: any) => s?.$jazz?.id === inviteCode.trim()
        );
        if (alreadyJoined) {
            setError("You've already joined this server!");
            return;
        }

        setJoining(true);
        try {
            (account.root.servers as any).$jazz.push(serverPreview);
            const serverId = (serverPreview as any)?.$jazz?.id;
            toast.success(`Joined "${(serverPreview as any)?.name || 'server'}"`);
            onJoined(serverId);
        } catch (err) {
            console.error("[JoinServer] Failed to join:", err);
            setError("Failed to join server. Please try again.");
            setJoining(false);
        }
    };

    const isLoaded = serverPreview && (serverPreview as any).$isLoaded;
    const serverName = isLoaded ? (serverPreview as any).name : null;
    const serverEmoji = isLoaded ? (serverPreview as any).iconEmoji : null;
    const channelCount = isLoaded
        ? Array.from((serverPreview as any).channels || []).filter(Boolean).length
        : 0;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Join a Server</DialogTitle>
                    <DialogDescription>
                        Paste an invite code to join an existing server.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
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
                            className="bg-[hsl(var(--secondary))] border-[hsl(var(--border))] font-mono"
                        />
                    </div>

                    {/* Server preview card */}
                    {isLoaded && serverName && (
                        <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] p-3 animate-fade-in">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-lg shrink-0">
                                {serverEmoji || "💬"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{serverName}</div>
                                <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {channelCount} channel{channelCount !== 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {inviteCode.trim().startsWith("co_") && !isLoaded && (
                        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Looking for server...
                        </div>
                    )}

                    {error && (
                        <div className="bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] text-[hsl(var(--destructive))] text-sm rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-gradient-to-r from-[var(--neon-violet)] to-[var(--neon-cyan)] hover:opacity-90"
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
