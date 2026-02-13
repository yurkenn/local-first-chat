import { useState } from "react";

interface CreateServerModalProps {
    onClose: () => void;
    onCreate: (name: string, emoji: string) => void;
}

const EMOJI_OPTIONS = [
    "🎮", "💻", "🎵", "🎨", "📚", "🏠", "🚀", "⚡",
    "🌍", "☕", "🔥", "❤️", "🌙", "🎯", "🧪", "🛡️",
];

/**
 * CreateServerModal — Modal for creating a new server.
 * User picks a name and an emoji icon.
 * On submit, a new Jazz Group (RBAC) is created along with the ChatServer.
 */
export function CreateServerModal({ onClose, onCreate }: CreateServerModalProps) {
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🎮");

    const handleSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate(trimmed, emoji);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Create a Server</h2>
                <p className="modal-subtitle">
                    Your server is where you and your friends hang out.
                </p>

                <label className="modal-label">Server Name</label>
                <input
                    className="modal-input"
                    type="text"
                    placeholder="My Awesome Server"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
                    maxLength={50}
                />

                <label className="modal-label" style={{ marginTop: 16 }}>
                    Icon
                </label>
                <div className="emoji-picker">
                    {EMOJI_OPTIONS.map((e) => (
                        <button
                            key={e}
                            className={`emoji-option ${emoji === e ? "selected" : ""}`}
                            onClick={() => setEmoji(e)}
                            type="button"
                        >
                            {e}
                        </button>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Create Server
                    </button>
                </div>
            </div>
        </div>
    );
}
