import { useVoiceChat } from "../hooks/useVoiceChat";

interface VoicePanelProps {
    channel: any;
    userName: string;
}

/**
 * VoicePanel — Shows connected peers and controls for a voice channel.
 * Integrates with the useVoiceChat hook for WebRTC mesh connections.
 */
export function VoicePanel({ channel, userName }: VoicePanelProps) {
    const { isConnected, peers, isMuted, join, leave, toggleMute } =
        useVoiceChat(channel, userName);

    return (
        <div className="voice-panel">
            {/* Voice status */}
            <div className="voice-status">
                <div
                    className="voice-status-indicator"
                    style={{
                        background: isConnected
                            ? "var(--accent-green)"
                            : "var(--text-muted)",
                    }}
                />
                <span>{isConnected ? "Voice Connected" : "Voice Channel"}</span>
            </div>

            {/* Peers list */}
            <div className="voice-peers">
                {peers.length === 0 && !isConnected && (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔊</div>
                        <p className="empty-state-text">
                            No one is in this voice channel. Click join to start talking!
                        </p>
                    </div>
                )}

                {peers.map((peer) => (
                    <div className="voice-peer" key={peer.peerId}>
                        <div className="voice-peer-avatar">
                            {peer.peerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="voice-peer-info">
                            <span className="voice-peer-name">{peer.peerName}</span>
                            {peer.isMuted && (
                                <span className="voice-peer-muted" title="Muted">
                                    🔇
                                </span>
                            )}
                        </div>
                        <div
                            className="voice-peer-status"
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--accent-green)",
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="voice-controls">
                {!isConnected ? (
                    <button className="voice-join-btn" onClick={join}>
                        <span>🎙️</span>
                        <span>Join Voice</span>
                    </button>
                ) : (
                    <>
                        <button
                            className={`voice-control-btn ${isMuted ? "muted" : ""}`}
                            onClick={toggleMute}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🎙️"}
                        </button>
                        <button
                            className="voice-leave-btn"
                            onClick={leave}
                            title="Leave Voice"
                        >
                            📞
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
