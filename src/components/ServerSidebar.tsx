/**
 * ServerSidebar — Vertical bar on the far left showing server icons.
 * Mimics Discord's server bar with hover tooltips and active indicators.
 */

interface ServerSidebarProps {
    servers: any[];
    activeServerId: string | null;
    onSelectServer: (id: string) => void;
    onCreateServer: () => void;
    onJoinServer: () => void;
}

export function ServerSidebar({
    servers,
    activeServerId,
    onSelectServer,
    onCreateServer,
    onJoinServer,
}: ServerSidebarProps) {
    return (
        <nav className="server-sidebar" aria-label="Servers">
            {/* Home / DM icon */}
            <div className="tooltip-wrapper">
                <div
                    className={`server-icon ${!activeServerId ? "active" : ""}`}
                    onClick={() => onSelectServer("")}
                    role="button"
                    tabIndex={0}
                >
                    💬
                </div>
                <span className="tooltip">Direct Messages</span>
            </div>

            <div className="server-divider" />

            {/* Server list */}
            {servers.map((server) => {
                if (!server) return null;
                const isActive = server.$jazz.id === activeServerId;
                return (
                    <div className="tooltip-wrapper" key={server.$jazz.id}>
                        <div
                            className={`server-icon ${isActive ? "active" : ""}`}
                            onClick={() => onSelectServer(server.$jazz.id)}
                            role="button"
                            tabIndex={0}
                        >
                            {server.iconEmoji || "📁"}
                        </div>
                        <span className="tooltip">{server.name}</span>
                    </div>
                );
            })}

            <div className="server-divider" />

            {/* Create server button */}
            <div className="tooltip-wrapper">
                <button
                    className="server-add-btn"
                    onClick={onCreateServer}
                    aria-label="Create a server"
                >
                    +
                </button>
                <span className="tooltip">Add a Server</span>
            </div>

            {/* Join server button */}
            <div className="tooltip-wrapper">
                <button
                    className="server-add-btn join-server-btn"
                    onClick={onJoinServer}
                    aria-label="Join a server"
                >
                    📥
                </button>
                <span className="tooltip">Join a Server</span>
            </div>
        </nav>
    );
}
