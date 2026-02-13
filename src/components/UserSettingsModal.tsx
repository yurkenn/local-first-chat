import { useState } from "react";
import { useCoState } from "jazz-tools/react";
import { ChatAccount } from "../schema";

interface UserSettingsModalProps {
    onClose: () => void;
}

/**
 * UserSettingsModal — Edit display name and view account info.
 */
export function UserSettingsModal({ onClose }: UserSettingsModalProps) {
    const me = useCoState(ChatAccount, "me", {
        resolve: { profile: true },
    });

    const account = me as any;
    const currentName = account?.profile?.name || "";
    const [name, setName] = useState(currentName);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        try {
            // Update Jazz profile name
            (account.profile as any).$jazz.set("name", name.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("[UserSettings] Save failed:", err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">User Settings</h2>

                <div className="settings-section">
                    <h3 className="settings-section-title">Profile</h3>

                    <div className="settings-avatar-row">
                        <div className="settings-avatar">
                            {(currentName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="settings-avatar-info">
                            <div className="settings-avatar-name">{currentName}</div>
                            <div className="settings-avatar-status">Online</div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your display name"
                        />
                    </div>

                    {saved && (
                        <div className="settings-saved">✅ Name updated!</div>
                    )}
                </div>

                <div className="settings-section">
                    <h3 className="settings-section-title">Account</h3>
                    <div className="settings-info-row">
                        <span className="settings-info-label">Auth Method</span>
                        <span className="settings-info-value">Passphrase (BIP39)</span>
                    </div>
                    <p className="settings-hint">
                        Your account is secured with a passphrase. Keep it safe — it's the only way to recover your account.
                    </p>
                </div>

                <div className="modal-actions">
                    <button className="modal-cancel" onClick={onClose}>
                        Close
                    </button>
                    <button className="modal-confirm" onClick={handleSave} disabled={!name.trim()}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
