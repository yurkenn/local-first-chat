import { memo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Hash, Volume2, Plus, Settings, LogOut, ChevronDown,
    Mic, MicOff, PhoneOff, UserPlus, SlidersHorizontal, Loader2,
} from "lucide-react";
import type { VoiceStateReturn } from "@/hooks/useVoiceState";
import type { LoadedServer, LoadedChannel } from "@/lib/jazz-types";

interface ChannelSidebarProps {
    server: LoadedServer | null;
    channels: LoadedChannel[];
    activeChannelId: string | null;
    onSelectChannel: (id: string) => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    userName: string;
    onLogout?: () => void;
    onUserSettings?: () => void;
    onServerSettings?: () => void;
    onAudioSettings?: () => void;
    /** App-level voice state for Discord-like voice UX */
    voice: VoiceStateReturn;
    /** Get unread count for a channel */
    getUnreadCount?: (channelId: string) => number;
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
    onAudioSettings,
    voice,
    getUnreadCount,
}: ChannelSidebarProps) {
    if (!server) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-r border-[rgba(255,255,255,0.06)]">
                <div className="h-[52px] flex items-center px-4 gap-2 border-b border-[rgba(255,255,255,0.06)]">
                    <span className="text-lg leading-none">🪷</span>
                    <span className="font-heading font-semibold text-sm brand-title">Lotus</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="text-3xl mb-3">👈</div>
                        <p className="text-xs text-muted-color">
                            Select a server or create one to get started
                        </p>
                    </div>
                </div>
                <UserPanel userName={userName} onLogout={onLogout} onUserSettings={onUserSettings} />
            </div >
        );
    }

    const textChannels = channels.filter((c) => c?.channelType === "text");
    const voiceChannels = channels.filter((c) => c?.channelType === "voice");

    const connectedChannelId = voice.connectedChannel?.$jazz?.id;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-r border-[rgba(255,255,255,0.06)]">
            {/* Server name header */}
            <div className="h-[52px] flex items-center px-4 gap-2 border-b border-[rgba(255,255,255,0.06)] group">
                <span
                    className="flex-1 font-heading font-semibold text-[15px] tracking-[-0.01em] truncate cursor-pointer hover:text-primary-color"
                    onClick={onInvite}
                >
                    {server.name}
                </span>
                <ChevronDown
                    className="h-3.5 w-3.5 text-muted-color cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={onInvite}
                />
                {onServerSettings && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-color hover:text-primary-color"
                        onClick={onServerSettings}
                        aria-label="Server settings"
                    >
                        <Settings className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* ✨ Invite People — always visible CTA */}
            <div className="px-2 pt-2">
                <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium cursor-pointer transition-all
                        bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.14)]
                        text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]
                        border border-[hsl(var(--primary)/0.15)] hover:border-[hsl(var(--primary)/0.3)]
                        hover:shadow-[var(--shadow-sm)]"
                    onClick={onInvite}
                    aria-label="Invite people to this server"
                >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite People</span>
                </button>
            </div>

            {/* Channel list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Text channels */}
                    <div className="px-2 py-1.5 label-section">
                        Text Channels
                    </div>
                    {textChannels.length === 0 && (
                        <p className="px-2 py-2 text-xs text-[hsl(var(--muted-foreground))/0.6] italic">
                            No text channels yet
                        </p>
                    )}
                    {textChannels.map((channel: LoadedChannel) => {
                        if (!channel) return null;
                        return (
                            <TextChannelItem
                                key={channel.$jazz.id}
                                channel={channel}
                                isActive={channel.$jazz.id === activeChannelId}
                                unread={getUnreadCount?.(channel.$jazz.id) || 0}
                                onSelect={() => onSelectChannel(channel.$jazz.id)}
                            />
                        );
                    })}

                    {/* Voice channels */}
                    <div className="px-2 py-1.5 mt-3 label-section">
                        Voice Channels
                    </div>
                    {voiceChannels.length === 0 && (
                        <div className="mx-2 my-1.5 px-3 py-2.5 rounded-[10px] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.5)]">
                            <p className="text-[11px] text-muted-color leading-snug">
                                No voice channels yet.
                            </p>
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))/0.5] mt-0.5">
                                Use <span className="font-medium text-muted-color">+ Add Channel</span> to create one.
                            </p>
                        </div>
                    )}
                    {voiceChannels.map((channel: LoadedChannel) => {
                        if (!channel) return null;
                        return (
                            <VoiceChannelItem
                                key={channel.$jazz.id}
                                channel={channel}
                                isConnected={connectedChannelId === channel.$jazz.id}
                                voice={voice}
                                userName={userName}
                            />
                        );
                    })}

                    {/* Add channel button */}
                    <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md text-sm text-muted-color hover:text-[var(--organic-green)] hover:bg-[hsl(var(--secondary))/0.5] transition-colors cursor-pointer"
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
                    isSpeaking={voice.isSpeaking}
                    onToggleMute={voice.toggleMute}
                    onLeave={voice.leaveVoice}
                    onAudioSettings={onAudioSettings}
                />
            )}

            {/* User panel */}
            <UserPanel userName={userName} onLogout={onLogout} onUserSettings={onUserSettings} />
        </div>
    );
});

/**
 * SpeakingAvatar — Avatar with a visible animated green border ring when speaking.
 */
function SpeakingAvatar({
    name,
    isSpeaking,
    gradientFrom,
    gradientTo,
    size = "sm",
}: {
    name: string;
    isSpeaking: boolean;
    gradientFrom: string;
    gradientTo: string;
    size?: "sm" | "md";
}) {
    const sizeClasses = size === "sm" ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]";
    return (
        <div
            className={cn(
                "relative rounded-full shrink-0 transition-all duration-200",
                isSpeaking
                    ? "ring-2 ring-[var(--organic-green)] shadow-[0_0_8px_var(--organic-green)] animate-[speaking-pulse_1.5s_ease-in-out_infinite]"
                    : "ring-2 ring-transparent"
            )}
        >
            <div
                className={cn(
                    sizeClasses,
                    "rounded-full flex items-center justify-center font-bold text-white"
                )}
                style={{
                    background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                }}
            >
                {name.charAt(0).toUpperCase()}
            </div>
        </div>
    );
}

/** TextChannelItem — Extracted text channel button */
function TextChannelItem({
    channel,
    isActive,
    unread,
    onSelect,
}: {
    channel: LoadedChannel;
    isActive: boolean;
    unread: number;
    onSelect: () => void;
}) {
    return (
        <button
            className={cn(
                "w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all duration-200",
                isActive
                    ? "bg-surface text-primary-color active-channel-bar"
                    : unread > 0
                        ? "text-primary-color font-semibold hover:bg-[hsl(var(--secondary))/0.5]"
                        : "text-muted-color hover:bg-[hsl(var(--secondary))/0.5] hover:text-primary-color"
            )}
            onClick={onSelect}
            aria-label={`Text channel: ${channel.name}${unread > 0 ? `, ${unread} unread` : ''}`}
        >
            <Hash className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--organic-sage)] opacity-100" : "opacity-60")} />
            <span className="truncate">{channel.name}</span>
            {unread > 0 && !isActive && (
                <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold px-1">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </button>
    );
}

/** VoiceChannelItem — Extracted voice channel with peers list */
function VoiceChannelItem({
    channel,
    isConnected,
    voice,
    userName,
}: {
    channel: LoadedChannel;
    isConnected: boolean;
    voice: VoiceStateReturn;
    userName: string;
}) {
    const isJoiningThis = voice.isJoining && voice.connectedChannel?.$jazz?.id === channel.$jazz.id;
    return (
        <div>
            <button
                className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-all duration-200 group/voice",
                    isConnected
                        ? "bg-surface text-primary-color active-channel-bar"
                        : isJoiningThis
                            ? "bg-[hsl(var(--secondary))/0.5] text-muted-color opacity-70 pointer-events-none"
                            : "text-muted-color hover:bg-[hsl(var(--secondary))/0.5] hover:text-primary-color"
                )}
                onClick={() => voice.joinVoice(channel)}
                disabled={voice.isJoining}
                aria-label={`Voice channel: ${channel.name} — click to join`}
                title="Click to join voice"
            >
                {isJoiningThis ? (
                    <Loader2 className="h-4 w-4 shrink-0 text-[var(--organic-sage)] animate-spin" />
                ) : (
                    <Volume2 className={cn("h-4 w-4 shrink-0", isConnected ? "text-[var(--organic-green)]" : "opacity-60")} />
                )}
                <span className="truncate flex-1 text-left">{channel.name}</span>
                {isJoiningThis ? (
                    <span className="text-[10px] text-[var(--organic-sage)]">Joining…</span>
                ) : !isConnected ? (
                    <span className="text-[10px] opacity-0 group-hover/voice:opacity-60 transition-opacity">Join</span>
                ) : null}
            </button>

            {/* Connected users (self + remote peers) */}
            {isConnected && (
                <div className="ml-4 pl-3 border-l border-[hsl(var(--border))] mt-0.5 mb-1 space-y-0.5 animate-fade-in">
                    {/* Self — always shown when connected to this channel */}
                    <div className="flex items-center gap-2 py-1 px-1.5 rounded text-xs text-primary-color">
                        <SpeakingAvatar name={userName || "U"} isSpeaking={voice.isSpeaking && !voice.isMuted} gradientFrom="var(--organic-sage)" gradientTo="var(--organic-green)" />
                        <span className="truncate flex-1">{userName || "You"}</span>
                        {voice.isMuted && <MicOff className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                    </div>
                    {/* Remote peers */}
                    {voice.peers.map((peer: any) => (
                        <div key={peer.peerId} className="flex items-center gap-2 py-1 px-1.5 rounded text-xs text-muted-color">
                            <SpeakingAvatar name={peer.peerName || "?"} isSpeaking={peer.isSpeaking} gradientFrom="var(--organic-sage)" gradientTo="#2B7A4B" />
                            <span className="truncate flex-1">{peer.peerName || "Unknown"}</span>
                            {peer.isMuted && <MicOff className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** VoiceStatusBar — Persistent voice connection bar */
function VoiceStatusBar({
    channelName,
    isMuted,
    isSpeaking,
    onToggleMute,
    onLeave,
    onAudioSettings,
}: {
    channelName: string;
    isMuted: boolean;
    isSpeaking: boolean;
    onToggleMute: () => void;
    onLeave: () => void;
    onAudioSettings?: () => void;
}) {
    return (
        <div className="px-2 py-2 surface-elevated border-t border-[hsl(var(--border))] animate-fade-in gradient-border-top">
            {/* Connection status */}
            <div className="flex items-center gap-2 mb-1.5">
                <div className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-200",
                    isSpeaking && !isMuted
                        ? "bg-[var(--organic-green)] shadow-[0_0_6px_var(--organic-green)] scale-125"
                        : "bg-[var(--organic-green)] shadow-[0_0_4px_rgba(106,176,122,0.3)] animate-pulse"
                )} />
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        "text-xs font-semibold transition-colors duration-200",
                        isSpeaking && !isMuted ? "text-[var(--organic-green)]" : "text-[var(--organic-green)]"
                    )}>
                        {isSpeaking && !isMuted ? "Speaking" : "Voice Connected"}
                    </div>
                    <div className="text-[10px] text-muted-color truncate">
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
                        "h-8 w-8 rounded-full transition-all duration-200",
                        isMuted
                            ? "bg-[hsl(var(--destructive))/0.15] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.25]"
                            : isSpeaking
                                ? "text-[var(--organic-green)] bg-[var(--organic-green)]/10 hover:bg-[var(--organic-green)]/20"
                                : "text-muted-color hover:text-primary-color hover:bg-surface"
                    )}
                    onClick={onToggleMute}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {onAudioSettings && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-color hover:text-primary-color hover:bg-surface"
                        onClick={onAudioSettings}
                        aria-label="Audio settings"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                )}
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
        <div className="flex items-center gap-2.5 px-3 py-2.5 glass-strong border-t border-[rgba(255,255,255,0.06)]">
            <div className="group/avatar relative w-8 h-8 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-xs font-bold text-white transition-shadow hover:shadow-[var(--shadow-md)]">
                {userName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--organic-green)] border-2 border-[hsl(var(--card))]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{userName}</div>
                <div className="text-[10px] text-[var(--organic-green)]">Online</div>
            </div>
            {onUserSettings && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-color hover:text-primary-color"
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
                    className="h-7 w-7 text-muted-color hover:text-[hsl(var(--destructive))]"
                    onClick={onLogout}
                    aria-label="Log out"
                >
                    <LogOut className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}
