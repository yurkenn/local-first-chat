import { useState } from "react";

interface CreateChannelModalProps {
    onClose: () => void;
    onCreate: (name: string, type: "text" | "voice") => void;
}

/**
 * CreateChannelModal — Modal for adding a channel to a server.
 * Supports both text and voice channel types.
 */
export function CreateChannelModal({
    onClose,
    onCreate,
}: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"text" | "voice">("text");

    const handleSubmit = () => {
        const trimmed = name.trim().toLowerCase().replace(/\s+/g, "-");
        if (!trimmed) return;
        onCreate(trimmed, type);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Create Channel</h2>
                <p className="modal-subtitle">
                    Choose a type and name for your new channel.
                </p>

                {/* Channel type selector */}
                <label className="modal-label">Channel Type</label>
                <div className="channel-type-toggle">
                    <button
                        className={`channel-type-option ${type === "text" ? "selected" : ""}`}
                        onClick={() => setType("text")}
                        type="button"
                    >
                        <span className="channel-type-icon">#</span>
                        <span className="channel-type-label">Text</span>
                    </button>
                    <button
                        className={`channel-type-option ${type === "voice" ? "selected" : ""}`}
                        onClick={() => setType("voice")}
                        type="button"
                    >
                        <span className="channel-type-icon">🔊</span>
                        <span className="channel-type-label">Voice</span>
                    </button>
                </div>

                <label className="modal-label">Channel Name</label>
                <input
                    className="modal-input"
                    type="text"
                    placeholder={type === "text" ? "new-channel" : "voice-chat"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
                    maxLength={30}
                />

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Create Channel
                    </button>
                </div>
            </div>
        </div>
    );
}
