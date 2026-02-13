import { useState } from "react";

interface InviteModalProps {
    server: any;
    onClose: () => void;
}

/**
 * InviteModal — Shows the server invite code for sharing.
 * Uses the CoValue ID as a simple invite code mechanism.
 */
export function InviteModal({ server, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    // Use the server's CoValue ID as invite code
    const inviteCode = server?.$jazz?.id || "N/A";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for environments without clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = inviteCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Invite People</h2>
                <p className="modal-description">
                    Share this invite code with friends to let them join{" "}
                    <strong>{server?.name}</strong>.
                </p>

                <div className="invite-code-block">
                    <code className="invite-code">{inviteCode}</code>
                    <button className="invite-copy-btn" onClick={handleCopy}>
                        {copied ? "✓ Copied!" : "Copy"}
                    </button>
                </div>

                <p
                    className="modal-description"
                    style={{ fontSize: "0.8rem", marginTop: "12px" }}
                >
                    Recipients can join by pasting this code in their LocalChat app.
                </p>

                <div className="modal-actions">
                    <button className="modal-cancel" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
