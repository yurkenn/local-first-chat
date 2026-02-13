/**
 * ChannelSidebar — Lists channels for the active server.
 * Separates text and voice channels with category headers.
 */

interface ChannelSidebarProps {
    server: any | null;
    channels: any[];
    activeChannelId: string | null;
    onSelectChannel: (id: string) => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    userName: string;
    onLogout?: () => void;
    onUserSettings?: () => void;
    onServerSettings?: () => void;
}

export function ChannelSidebar({
    server,
    channels,
    activeChannelId,
    onSelectChannel,
    onCreateChannel,
    onInvite,
    userName,
    onLogout,
    onUserSettings,
    onServerSettings,
}: ChannelSidebarProps) {
    if (!server) {
        return (
            <div className="channel-sidebar">
                <div className="channel-sidebar-header">LocalChat</div>
                <div className="channel-list">
                    <div className="empty-state" style={{ padding: "40px 16px" }}>
                        <div className="empty-state-icon">👈</div>
                        <p className="empty-state-text">
                            Select a server or create one to get started
                        </p>
                    </div>
                </div>
                <div className="user-panel">
                    <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{userName}</div>
                        <div className="user-status">Online</div>
                    </div>
                    {onLogout && (
                        <button
                            className="user-panel-btn"
                            onClick={onLogout}
                            title="Log out"
                        >
                            ⏻
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Separate text and voice channels
    const textChannels = channels.filter((c) => c?.channelType === "text");
    const voiceChannels = channels.filter((c) => c?.channelType === "voice");

    return (
        <div className="channel-sidebar">
            {/* Server name header */}
            <div className="channel-sidebar-header">
                <span onClick={onInvite} style={{ cursor: "pointer", flex: 1 }}>{server.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={onInvite}>
                    ▼
                </span>
                {onServerSettings && (
                    <button
                        className="channel-header-settings-btn"
                        onClick={onServerSettings}
                        title="Server settings"
                    >
                        ⚙️
                    </button>
                )}
            </div>

            {/* Channel list */}
            <div className="channel-list">
                {/* Text channels */}
                <div className="channel-category">Text Channels</div>
                {textChannels.map((channel: any) => {
                    if (!channel) return null;
                    return (
                        <div
                            key={channel.$jazz.id}
                            className={`channel-item ${channel.$jazz.id === activeChannelId ? "active" : ""}`}
                            onClick={() => onSelectChannel(channel.$jazz.id)}
                            role="button"
                            tabIndex={0}
                        >
                            <span className="channel-item-icon">#</span>
                            <span className="channel-item-name">{channel.name}</span>
                        </div>
                    );
                })}

                {/* Voice channels */}
                <div className="channel-category">Voice Channels</div>
                {voiceChannels.map((channel: any) => {
                    if (!channel) return null;
                    return (
                        <div
                            key={channel.$jazz.id}
                            className={`channel-item ${channel.$jazz.id === activeChannelId ? "active" : ""}`}
                            onClick={() => onSelectChannel(channel.$jazz.id)}
                            role="button"
                            tabIndex={0}
                        >
                            <span className="channel-item-icon">🔊</span>
                            <span className="channel-item-name">{channel.name}</span>
                        </div>
                    );
                })}

                {/* Add channel button */}
                <button className="channel-add-btn" onClick={onCreateChannel}>
                    <span>+</span>
                    <span>Add Channel</span>
                </button>
            </div>

            {/* User panel */}
            <div className="user-panel">
                <div className="user-avatar" style={{ position: "relative" }}>
                    {userName.charAt(0).toUpperCase()}
                    <span className="presence-dot" />
                </div>
                <div className="user-info">
                    <div className="user-name">{userName}</div>
                    <div className="user-status">Online</div>
                </div>
                {onLogout && (
                    <button
                        className="user-panel-btn"
                        onClick={onLogout}
                        title="Log out"
                    >
                        ⏻
                    </button>
                )}
                {onUserSettings && (
                    <button
                        className="user-panel-btn"
                        onClick={onUserSettings}
                        title="User settings"
                    >
                        ⚙️
                    </button>
                )}
            </div>
        </div>
    );
}
