import { useState } from "react";

interface ServerSettingsModalProps {
    server: any;
    onClose: () => void;
    onDeleteServer: () => void;
}

/** Common server emojis for picker */
const SERVER_EMOJIS = ["🎮", "💻", "🎵", "📚", "🎨", "🏠", "🚀", "⚡", "🌟", "🔥", "💬", "🤖"];

/**
 * ServerSettingsModal — Edit server name/icon or delete the server.
 */
export function ServerSettingsModal({ server, onClose, onDeleteServer }: ServerSettingsModalProps) {
    const [name, setName] = useState(server?.name || "");
    const [emoji, setEmoji] = useState(server?.iconEmoji || "📁");
    const [saved, setSaved] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        try {
            (server as any).$jazz.set("name", name.trim());
            (server as any).$jazz.set("iconEmoji", emoji);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("[ServerSettings] Save failed:", err);
        }
    };

    const handleDelete = () => {
        onDeleteServer();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Server Settings</h2>

                <div className="settings-section">
                    <h3 className="settings-section-title">Server Info</h3>

                    <div className="form-group">
                        <label className="form-label">Server Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Server name"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Server Icon</label>
                        <div className="emoji-selector">
                            {SERVER_EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    className={`emoji-select-btn ${emoji === e ? "selected" : ""}`}
                                    onClick={() => setEmoji(e)}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {saved && (
                        <div className="settings-saved">✅ Server updated!</div>
                    )}
                </div>

                <div className="settings-section settings-danger">
                    <h3 className="settings-section-title danger-title">Danger Zone</h3>
                    {!confirmDelete ? (
                        <button
                            className="settings-delete-btn"
                            onClick={() => setConfirmDelete(true)}
                        >
                            🗑️ Delete Server
                        </button>
                    ) : (
                        <div className="settings-confirm-delete">
                            <p className="settings-warning">
                                Are you sure? This will remove the server from your list. Other members may still have access.
                            </p>
                            <div className="settings-confirm-actions">
                                <button className="modal-cancel" onClick={() => setConfirmDelete(false)}>
                                    Cancel
                                </button>
                                <button className="settings-confirm-delete-btn" onClick={handleDelete}>
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    )}
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
