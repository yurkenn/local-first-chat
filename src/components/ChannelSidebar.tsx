import { memo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Hash, Volume2, Plus, Settings, LogOut, ChevronDown, Mic, MicOff, PhoneOff } from "lucide-react";
import type { VoiceStateReturn } from "@/hooks/useVoiceState";

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
    /** App-level voice state for Discord-like voice UX */
    voice: VoiceStateReturn;
}

export const ChannelSidebar = memo(function ChannelSidebar({
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
    voice,
}: ChannelSidebarProps) {
    if (!server) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
                <div className="h-12 flex items-center px-4 font-heading font-semibold text-sm border-b border-[hsl(var(--border))]">
                    Lotus
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="text-3xl mb-3">👈</div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Select a server or create one to get started
                        </p>
                    </div>
                </div>
                <UserPanel userName={userName} onLogout={onLogout} onUserSettings={onUserSettings} />
            </div>
        );
    }

    const textChannels = channels.filter((c) => c?.channelType === "text");
    const voiceChannels = channels.filter((c) => c?.channelType === "voice");

    const connectedChannelId = voice.connectedChannel?.$jazz?.id;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
            {/* Server name header */}
            <div className="h-12 flex items-center px-4 gap-2 border-b border-[hsl(var(--border))] group">
                <span
                    className="flex-1 font-heading font-semibold text-sm truncate cursor-pointer hover:text-[hsl(var(--foreground))]"
                    onClick={onInvite}
                >
                    {server.name}
                </span>
                <ChevronDown
                    className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={onInvite}
                />
                {onServerSettings && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        onClick={onServerSettings}
                        aria-label="Server settings"
                    >
                        <Settings className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Channel list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Text channels */}
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Text Channels
                    </div>
                    {textChannels.map((channel: any) => {
                        if (!channel) return null;
                        const isActive = channel.$jazz.id === activeChannelId;
                        return (
                            <button
                                key={channel.$jazz.id}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                                    isActive
                                        ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))/0.5] hover:text-[hsl(var(--foreground))]"
                                )}
                                onClick={() => onSelectChannel(channel.$jazz.id)}
                                aria-label={`Text channel: ${channel.name}`}
                            >
                                <Hash className="h-4 w-4 shrink-0 opacity-60" />
                                <span className="truncate">{channel.name}</span>
                            </button>
                        );
                    })}

                    {/* Voice channels */}
                    <div className="px-2 py-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Voice Channels
                    </div>
                    {voiceChannels.map((channel: any) => {
                        if (!channel) return null;
                        const isConnectedToThis = connectedChannelId === channel.$jazz.id;
                        return (
                            <div key={channel.$jazz.id}>
                                {/* Voice channel button */}
                                <button
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                                        isConnectedToThis
                                            ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))/0.5] hover:text-[hsl(var(--foreground))]"
                                    )}
                                    onClick={() => voice.joinVoice(channel)}
                                    aria-label={`Voice channel: ${channel.name} — click to join`}
                                >
                                    <Volume2 className={cn("h-4 w-4 shrink-0", isConnectedToThis ? "text-[var(--neon-green)]" : "opacity-60")} />
                                    <span className="truncate">{channel.name}</span>
                                </button>

                                {/* Connected peers list (Discord-style, indented under voice channel) */}
                                {isConnectedToThis && voice.peers.length > 0 && (
                                    <div className="ml-4 pl-3 border-l border-[hsl(var(--border))] mt-0.5 mb-1 space-y-0.5 animate-fade-in">
                                        {voice.peers.map((peer) => (
                                            <div
                                                key={peer.peerId}
                                                className="flex items-center gap-2 py-1 px-1.5 rounded text-xs text-[hsl(var(--muted-foreground))]"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                                                    {(peer.peerName || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate flex-1">{peer.peerName || "Unknown"}</span>
                                                {peer.isMuted && <MicOff className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Show self as connected user */}
                                {isConnectedToThis && voice.isConnected && (
                                    <div className="ml-4 pl-3 border-l border-[hsl(var(--border))] mb-1 space-y-0.5">
                                        <div className="flex items-center gap-2 py-1 px-1.5 rounded text-xs text-[hsl(var(--foreground))]">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                                                {(userName || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <span className="truncate flex-1">{userName || "You"}</span>
                                            {voice.isMuted && <MicOff className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add channel button */}
                    <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:text-[var(--neon-green)] hover:bg-[hsl(var(--secondary))/0.5] transition-colors cursor-pointer"
                        onClick={onCreateChannel}
                        aria-label="Add channel"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Channel</span>
                    </button>
                </div>
            </ScrollArea>

            {/* Voice Status Bar — persistent connection indicator (above UserPanel) */}
            {voice.isConnected && voice.connectedChannel && (
                <VoiceStatusBar
                    channelName={voice.connectedChannel.name}
                    isMuted={voice.isMuted}
                    onToggleMute={voice.toggleMute}
                    onLeave={voice.leaveVoice}
                />
            )}

            {/* User panel */}
            <UserPanel userName={userName} onLogout={onLogout} onUserSettings={onUserSettings} />
        </div>
    );
});

/** VoiceStatusBar — Persistent voice connection bar, Discord-style */
function VoiceStatusBar({
    channelName,
    isMuted,
    onToggleMute,
    onLeave,
}: {
    channelName: string;
    isMuted: boolean;
    onToggleMute: () => void;
    onLeave: () => void;
}) {
    return (
        <div className="px-2 py-2 glass-strong border-t border-[var(--glass-border)] animate-fade-in">
            {/* Connection status */}
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)] animate-pulse" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--neon-green)]">Voice Connected</div>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        🔊 {channelName}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-full",
                        isMuted
                            ? "bg-[hsl(var(--destructive))/0.15] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.25]"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                    )}
                    onClick={onToggleMute}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.15]"
                    onClick={onLeave}
                    aria-label="Disconnect from voice"
                >
                    <PhoneOff className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function UserPanel({ userName, onLogout, onUserSettings }: { userName: string; onLogout?: () => void; onUserSettings?: () => void }) {
    return (
        <div className="flex items-center gap-2 px-2 py-2 glass-strong border-t border-[var(--glass-border)]">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-xs font-bold text-white">
                {userName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--neon-green)] border-2 border-[hsl(var(--card))]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{userName}</div>
                <div className="text-[10px] text-[var(--neon-green)]">Online</div>
            </div>
            {onUserSettings && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    onClick={onUserSettings}
                    aria-label="User settings"
                >
                    <Settings className="h-3.5 w-3.5" />
                </Button>
            )}
            {onLogout && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                    onClick={onLogout}
                    aria-label="Log out"
                >
                    <LogOut className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}
