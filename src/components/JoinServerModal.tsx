import { useState } from "react";
import { useCoState } from "jazz-tools/react";
import { ChatServer, ChatAccount } from "../schema";

interface JoinServerModalProps {
    onClose: () => void;
    onJoined: (serverId: string) => void;
}

/**
 * JoinServerModal — Paste an invite code to join an existing server.
 *
 * The invite code is a Jazz CoValue ID (e.g., "co_z...").
 * We use useCoState to load the server, then push it into the user's server list.
 */
export function JoinServerModal({ onClose, onJoined }: JoinServerModalProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    // Load the current user's account to push server to their list
    const me = useCoState(ChatAccount, "me", {
        resolve: { root: { servers: true } },
    });

    // Try to load the server by the invite code (CoValue ID)
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

        // Check if already joined
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
            // Push the loaded server reference into the user's server list
            (account.root.servers as any).$jazz.push(serverPreview);
            const serverId = (serverPreview as any)?.$jazz?.id;
            onJoined(serverId);
        } catch (err) {
            console.error("[JoinServer] Failed to join:", err);
            setError("Failed to join server. Please try again.");
            setJoining(false);
        }
    };

    // Server preview info
    const isLoaded = serverPreview && (serverPreview as any).$isLoaded;
    const serverName = isLoaded ? (serverPreview as any).name : null;
    const serverEmoji = isLoaded ? (serverPreview as any).iconEmoji : null;
    const channelCount = isLoaded
        ? Array.from((serverPreview as any).channels || []).filter(Boolean).length
        : 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Join a Server</h2>
                <p className="modal-description">
                    Paste an invite code to join an existing server.
                </p>

                <div className="form-group">
                    <label className="form-label">Invite Code</label>
                    <input
                        type="text"
                        className="form-input"
                        value={inviteCode}
                        onChange={(e) => {
                            setInviteCode(e.target.value);
                            setError(null);
                        }}
                        placeholder="co_zQZKpq..."
                        autoFocus
                    />
                </div>

                {/* Server preview card */}
                {isLoaded && serverName && (
                    <div className="join-server-preview">
                        <div className="join-server-icon">{serverEmoji || "💬"}</div>
                        <div className="join-server-info">
                            <div className="join-server-name">{serverName}</div>
                            <div className="join-server-channels">
                                {channelCount} channel{channelCount !== 1 ? "s" : ""}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading indicator when code is valid but not yet loaded */}
                {inviteCode.trim().startsWith("co_") && !isLoaded && (
                    <div className="join-server-loading">
                        <span className="loading-spinner">⟳</span>
                        <span>Looking for server...</span>
                    </div>
                )}

                {error && <div className="form-error">{error}</div>}

                <div className="modal-actions">
                    <button className="modal-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="modal-confirm"
                        onClick={handleJoin}
                        disabled={joining || !isLoaded}
                    >
                        {joining ? "Joining..." : "Join Server"}
                    </button>
                </div>
            </div>
        </div>
    );
}
