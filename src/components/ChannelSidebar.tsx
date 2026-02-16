import React, { memo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Hash, Volume2, Plus, Settings, LogOut, ChevronDown,
    Mic, MicOff, PhoneOff, UserPlus, SlidersHorizontal, Loader2, Headphones,
    Trash2, Copy
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VoiceStateReturn } from "@/hooks/useVoiceState";
import type { LoadedServer, LoadedChannel } from "@/lib/jazz-types";
import type { AudioSettings } from "@/hooks/useAudioSettings";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { coSplice } from "@/lib/jazz-helpers";

interface ChannelSidebarProps {
    server: LoadedServer | null;
    channels: LoadedChannel[];
    activeChannelId: string | null;
    onSelectChannel: (id: string) => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    userName: string;
    onUserSettings?: () => void;
    onServerSettings?: () => void;
    onAudioSettings?: () => void;
    /** App-level voice state for Discord-like voice UX */
    voice: VoiceStateReturn;
    /** Get unread count for a channel */
    getUnreadCount?: (channelId: string) => number;
    audio?: AudioSettings;
}

export const ChannelSidebar = memo(function ChannelSidebar({
    server,
    channels,
    activeChannelId,
    onSelectChannel,
    onCreateChannel,
    onInvite,
    userName,
    onUserSettings: _onUserSettings,
    onServerSettings,
    onAudioSettings,
    voice,
    getUnreadCount,
    audio,
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
                <UserPanel
                    userName={userName}
                    isMuted={voice.isMuted}
                    isDeafened={audio?.isDeafened ?? false}
                    onToggleMute={voice.toggleMute}
                    onToggleDeafen={audio?.toggleDeafen ?? (() => { })}
                    onAudioSettings={onAudioSettings}
                />
            </div >
        );
    }


    const [peerVolumes, setPeerVolumes] = React.useState<Record<string, number>>({});
    const [peerMutes, setPeerMutes] = React.useState<Record<string, boolean>>({});

    const handleVolumeChange = React.useCallback((peerId: string, volume: number) => {
        setPeerVolumes((prev) => ({ ...prev, [peerId]: volume }));
    }, []);

    const handleMuteToggle = React.useCallback((peerId: string) => {
        setPeerMutes((prev) => ({ ...prev, [peerId]: !prev[peerId] }));
    }, []);

    const handleKick = React.useCallback(async (channel: LoadedChannel, peerId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vs = channel?.voiceState as any;
        if (!vs?.peers) return;
        try {
            const peersList = vs.peers;
            const items = Array.from(peersList).filter(Boolean);
            const index = items.findIndex((p: any) => p.peerId === peerId);
            if (index !== -1) {
                console.log("[ChannelSidebar] Kicking peer:", peerId);
                coSplice(peersList, index, 1);
            }
        } catch (err) {
            console.error("[ChannelSidebar] Failed to kick peer:", err);
            // Could add toast here
        }
    }, []);


    const textChannels = channels.filter((c) => c?.channelType === "text");
    const voiceChannels = channels.filter((c) => c?.channelType === "voice");

    const connectedChannelId = voice.connectedChannel?.$jazz?.id;

    // Render Audio elements for remote streams
    const audioElements = voice.remoteStreams
        ? Array.from(voice.remoteStreams.entries()).map(([peerId, stream]) => {
            const localVol = peerVolumes[peerId] ?? 100;
            const isLocalMuted = peerMutes[peerId] ?? false;
            // Combined volume: (local slider / 100) * (global output / 100)
            // If muted locally, volume is 0
            const volume = isLocalMuted ? 0 : (localVol * (audio?.outputVolume ?? 100) / 100);

            return (
                <AudioRef
                    key={peerId}
                    stream={stream}
                    volume={volume} // AudioRef takes 0-100? No wait, let's check definition.
                    // AudioRef definition: volume / 100. So we pass 0-100.
                    // If I pass `volume` calculated above, it might be 0-100 if localVol is 0-100.
                    // localVol is 0-100. outputVolume is 0-200.
                    // So (100 * 100 / 100) = 100. (50 * 100 / 100) = 50.
                    // Wait, AudioRef logic: audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
                    // So passing 100 -> 1.0. Passing 50 -> 0.5.
                    // If outputVolume is 200 (200%), passed volume is 200. Math.min(1, 2) -> 1.
                    // So AudioRef clamps it. That's fine.
                    sinkId={audio?.selectedOutputId}
                />
            );
        })
        : null;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[hsl(var(--card))] border-r border-[rgba(255,255,255,0.06)]">
            {/* Hidden audio elements for voice chat */}
            {audioElements}

            {/* Server name header — Dropdown Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="h-[52px] flex items-center px-4 gap-2 border-b border-[rgba(255,255,255,0.06)] group cursor-pointer hover:bg-[#35373c]/50 transition-colors">
                        <span
                            className="flex-1 font-heading font-semibold text-[15px] tracking-[-0.01em] truncate"
                        >
                            {server.name}
                        </span>
                        <ChevronDown
                            className="h-3.5 w-3.5 text-muted-color transition-transform data-[state=open]:rotate-180"
                        />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-56 bg-[#111214] border-[rgba(255,255,255,0.08)] p-1.5 shadow-xl"
                    align="start"
                    sideOffset={0}
                >
                    <DropdownMenuItem
                        className="flex items-center gap-2 px-2 py-2 rounded-sm text-[13px] text-[#949dfd] hover:text-white cursor-pointer focus:bg-[#5865f2] focus:text-white"
                        onClick={onInvite}
                    >
                        <UserPlus className="h-4 w-4" />
                        <span className="font-medium">Invite People</span>
                    </DropdownMenuItem>

                    {onServerSettings && (
                        <DropdownMenuItem
                            className="flex items-center gap-2 px-2 py-2 rounded-sm text-[13px] text-[#b5bac1] cursor-pointer focus:bg-[#5865f2] focus:text-white"
                            onClick={onServerSettings}
                        >
                            <Settings className="h-4 w-4" />
                            <span>Server Settings</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                        className="flex items-center gap-2 px-2 py-2 rounded-sm text-[13px] text-[#b5bac1] cursor-pointer focus:bg-[#5865f2] focus:text-white"
                        onClick={onCreateChannel}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Channel</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)] my-1" />

                    <DropdownMenuItem
                        className="flex items-center gap-2 px-2 py-2 rounded-sm text-[13px] text-[#f23f42] cursor-pointer focus:bg-[#f23f42] focus:text-white"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Leave Server</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

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
                                // New props
                                peerVolumes={peerVolumes}
                                peerMutes={peerMutes}
                                onVolumeChange={handleVolumeChange}
                                onMuteToggle={handleMuteToggle}
                                onKick={handleKick}
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
            {(voice.isConnected || voice.isJoining) && voice.connectedChannel && (
                <VoiceStatusBar
                    channelName={voice.connectedChannel.name}
                    isMuted={voice.isMuted}
                    isJoining={voice.isJoining && !voice.isConnected}
                    onToggleMute={voice.toggleMute}
                    onLeave={voice.leaveVoice}
                    onAudioSettings={onAudioSettings}
                />
            )}

            {/* User panel */}
            <UserPanel
                userName={userName}
                isMuted={voice.isMuted}
                isDeafened={audio?.isDeafened ?? false}
                onToggleMute={voice.toggleMute}
                onToggleDeafen={audio?.toggleDeafen ?? (() => { })}
                onAudioSettings={onAudioSettings}
            />
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
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div className="relative flex items-center group/channel">
                    {/* Active/Unread pill indicator */}
                    <div className={cn(
                        "absolute -left-[8px] w-[4px] rounded-r-full bg-white transition-all duration-200 origin-left",
                        isActive ? "h-[32px] scale-100" : (unread > 0 ? "h-[8px] scale-100" : "h-[8px] scale-0 group-hover/channel:scale-100")
                    )} />
                    <button
                        className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[15px] cursor-pointer transition-all duration-100",
                            isActive
                                ? "bg-[#3f4147] text-white"
                                : unread > 0
                                    ? "text-white font-semibold hover:bg-[#34373c]"
                                    : "text-[#949ba4] hover:bg-[#34373c] hover:text-[#dbdee1]"
                        )}
                        onClick={onSelect}
                        aria-label={`Text channel: ${channel.name}${unread > 0 ? `, ${unread} unread` : ''}`}
                    >
                        <Hash className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "opacity-60")} />
                        <span className="truncate">{channel.name}</span>
                        {unread > 0 && !isActive && (
                            <span className="ml-auto shrink-0 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[hsl(var(--destructive))] text-white text-[11px] font-bold px-1">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </button>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48 bg-[#111214] border-[rgba(255,255,255,0.08)] p-1 shadow-xl">
                <ContextMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-[13px] text-[#b5bac1] cursor-pointer focus:bg-[#5865f2] focus:text-white"
                    onClick={onSelect}
                >
                    <Hash className="h-4 w-4" />
                    <span>Mark as Read</span>
                </ContextMenuItem>

                <ContextMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-[13px] text-[#b5bac1] cursor-pointer focus:bg-[#5865f2] focus:text-white"
                    onClick={() => {
                        navigator.clipboard.writeText(channel.$jazz.id);
                        import("sonner").then(({ toast }) => toast.success("Channel ID copied"));
                    }}
                >
                    <Copy className="h-4 w-4" />
                    <span>Copy Channel ID</span>
                </ContextMenuItem>

                <ContextMenuSeparator className="bg-[rgba(255,255,255,0.06)] my-1" />

                <ContextMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-[13px] text-[#f23f42] cursor-pointer focus:bg-[#f23f42] focus:text-white"
                >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Channel</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

/** VoiceChannelItem — Extracted voice channel with peers list */
interface VoiceChannelItemProps {
    channel: LoadedChannel;
    isConnected: boolean;
    voice: VoiceStateReturn;
    userName: string;
    peerVolumes: Record<string, number>;
    peerMutes: Record<string, boolean>;
    onVolumeChange: (peerId: string, volume: number) => void;
    onMuteToggle: (peerId: string) => void;
    onKick: (channel: LoadedChannel, peerId: string) => void;
}

function VoiceChannelItem({
    channel,
    isConnected,
    voice,
    userName,
    peerVolumes,
    peerMutes,
    onVolumeChange,
    onMuteToggle,
    onKick,
}: VoiceChannelItemProps) {
    const isJoiningThis = voice.isJoining && voice.connectedChannel?.$jazz?.id === channel.$jazz.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participants = React.useMemo(() => {
        if (isConnected) {
            // If connected to THIS channel, use local high-fidelity state (includes real-time speaking status)
            return [
                // Self
                {
                    peerId: "me",
                    peerName: userName || "You",
                    isMuted: voice.isMuted,
                    isSpeaking: voice.isSpeaking && !voice.isMuted,
                    isSelf: true
                },
                // Remote peers
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...voice.peers.map((p: any) => ({
                    peerId: p.peerId,
                    peerName: p.peerName,
                    isMuted: p.isMuted,
                    isSpeaking: p.isSpeaking,
                    isSelf: false
                }))
            ];
        } else {
            // Synced state from Jazz (no speaking indicator, but shows presence)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vs = channel.voiceState as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = vs?.peers ? Array.from(vs.peers as Iterable<any>).filter(Boolean) : [];
            return raw
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((p: any) => !p.targetPeerId || p.targetPeerId === "") // Filter out signaling packets
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((p: any) => ({
                    peerId: p.peerId,
                    peerName: p.peerName,
                    isMuted: p.isMuted,
                    isSpeaking: false, // Unknown for remote channels
                    isSelf: false
                }));
        }
    }, [isConnected, voice.peers, voice.isMuted, voice.isSpeaking, channel, userName]);

    return (
        <div className="relative group/channel">
            <div className="relative flex items-center">
                {/* Active pill indicator */}
                <div className={cn(
                    "absolute -left-[8px] w-[4px] rounded-r-full bg-white transition-all duration-200 origin-left",
                    isConnected ? "h-[32px] scale-100" : "h-[8px] scale-0 group-hover/channel:scale-100"
                )} />
                <button
                    className={cn(
                        "w-full flex items-center gap-2 px-2 py-[6px] rounded-lg text-[15px] cursor-pointer transition-all duration-100",
                        isConnected
                            ? "bg-[#3f4147] text-white"
                            : isJoiningThis
                                ? "bg-[#34373c] text-[#949ba4] opacity-70 pointer-events-none"
                                : "text-[#949ba4] hover:bg-[#34373c] hover:text-[#dbdee1]"
                    )}
                    onClick={() => voice.joinVoice(channel)}
                    disabled={voice.isJoining}
                    aria-label={`Voice channel: ${channel.name} — ${participants.length} connected`}
                    title="Click to join voice"
                >
                    {isJoiningThis ? (
                        <Loader2 className="h-5 w-5 shrink-0 text-[#23a559] animate-spin" />
                    ) : (
                        <Volume2 className={cn("h-5 w-5 shrink-0", isConnected ? "text-[#23a559]" : "opacity-60")} />
                    )}
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                    {isJoiningThis ? (
                        <span className="text-[10px] text-[#23a559]">Joining…</span>
                    ) : null}
                </button>
            </div>

            {/* Connected users list */}
            {participants.length > 0 && (
                <div className="ml-4 pl-3 border-l border-[hsl(var(--border))] mt-0.5 mb-1 space-y-0.5 animate-fade-in">
                    {participants.map((p) => {
                        const volume = peerVolumes[p.peerId] ?? 100;
                        const isLocallyMuted = peerMutes[p.peerId] ?? false;

                        // Check admin permissions for kick
                        // Simple check: am I the server owner?
                        // Or logic: getOwnerGroup(channel) === me.root... no.
                        // We check if I can write to the channel group.
                        // For now, let's enable kick if I'm not the peer (can't kick self easily via this UI, use leave)
                        const canKick = !p.isSelf;
                        // Real perm check would be: does 'me' have write access to channel.voiceState?
                        // jazz-tools doesn't expose easy sync check.
                        // But if I'm server owner I likely do.
                        // Let's just show it for non-self for now. The action will fail if no perms.

                        return (
                            <ContextMenu key={p.peerId}>
                                <ContextMenuTrigger asChild>
                                    <div className={cn(
                                        "flex items-center gap-2 py-1 px-1.5 rounded text-xs cursor-context-menu hover:bg-[hsl(var(--surface-hover))] group/peer transition-colors",
                                        p.isSelf ? "text-primary-color" : "text-muted-color",
                                        p.isSpeaking && "bg-[hsl(var(--organic-green)/0.05)]"
                                    )}>
                                        <SpeakingAvatar
                                            name={p.peerName || "?"}
                                            isSpeaking={p.isSpeaking}
                                            gradientFrom="var(--organic-sage)"
                                            gradientTo={p.isSelf || isConnected ? "var(--organic-green)" : "#2B7A4B"}
                                        />
                                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                            <span className={cn(
                                                "truncate font-medium transition-colors",
                                                p.isSpeaking ? "text-[var(--organic-green)]" : ""
                                            )}>
                                                {p.peerName || "Unknown"}
                                            </span>
                                            {/* Icons for status */}
                                            <div className="flex items-center gap-1">
                                                {p.isMuted && <MicOff className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                                                {isLocallyMuted && <Volume2 className="h-3 w-3 text-[hsl(var(--destructive))]" />}
                                            </div>
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-64 bg-[hsl(var(--popover))] border-[hsl(var(--border))] shadow-xl p-1.5">
                                    <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-color/60 px-2 pb-1">
                                        Voice Settings: {p.peerName}
                                    </ContextMenuLabel>

                                    <div className="flex items-center px-2 py-2.5 rounded-sm bg-[hsl(var(--accent)/0.2)] mb-1 gap-3 border-b border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-sm font-bold shrink-0 shadow-lg border border-white/10 text-white">
                                            {p.peerName?.charAt(0) || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold truncate text-primary-color mb-0.5">{p.peerName}</div>
                                            {!p.isSelf && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVolumeChange(p.peerId, Math.max(0, volume - 10)); }}
                                                        className="h-6 w-6 flex items-center justify-center rounded bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] transition-colors text-xs font-bold ring-1 ring-white/5 active:scale-95"
                                                        title="Decrease volume"
                                                    >-</button>
                                                    <div className="flex flex-col items-center min-w-[40px]">
                                                        <span className="text-[11px] font-mono font-bold text-[var(--organic-green)]">{volume}%</span>
                                                        <span className="text-[8px] uppercase tracking-tighter text-muted-color/50 font-bold">Volume</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVolumeChange(p.peerId, Math.min(200, volume + 10)); }}
                                                        className="h-6 w-6 flex items-center justify-center rounded bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] transition-colors text-xs font-bold ring-1 ring-white/5 active:scale-95"
                                                        title="Increase volume"
                                                    >+</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <ContextMenuSeparator className="bg-[hsl(var(--border))] my-1.5" />

                                    {!p.isSelf && (
                                        <>
                                            <div className="px-2 py-2 select-none">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="200"
                                                    step="1"
                                                    value={volume}
                                                    onChange={(e) => onVolumeChange(p.peerId, Number(e.target.value))}
                                                    className="w-full h-1.5 bg-[hsl(var(--secondary))] rounded-full appearance-none cursor-pointer transition-all hover:brightness-110 active:brightness-90 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--organic-green)] [&::-webkit-slider-thumb]:shadow-md"
                                                />
                                            </div>

                                            <ContextMenuItem
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-sm focus:bg-[hsl(var(--accent))] transition-colors"
                                                onClick={() => onMuteToggle(p.peerId)}
                                            >
                                                {isLocallyMuted ? (
                                                    <>
                                                        <Volume2 className="h-4 w-4 text-[var(--organic-green)]" />
                                                        <span className="text-sm">Unmute User</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Volume2 className="h-4 w-4 opacity-70" />
                                                        <span className="text-sm">Mute locally</span>
                                                    </>
                                                )}
                                            </ContextMenuItem>

                                            <ContextMenuSeparator className="bg-[hsl(var(--border))] my-1.5" />
                                        </>
                                    )}

                                    <ContextMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-sm focus:bg-[hsl(var(--accent))] transition-colors opacity-50 cursor-not-allowed">
                                        <Plus className="h-4 w-4" />
                                        <span className="text-sm">Mention</span>
                                    </ContextMenuItem>

                                    <ContextMenuItem
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm focus:bg-[hsl(var(--accent))] transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(p.peerId);
                                            // Optional: toast notification
                                        }}
                                    >
                                        <Plus className="h-4 w-4 rotate-45" />
                                        <span className="text-sm">Copy ID</span>
                                    </ContextMenuItem>

                                    {/* Kick Action */}
                                    {canKick && (
                                        <>
                                            <ContextMenuSeparator className="bg-[hsl(var(--border))] my-1.5" />
                                            <ContextMenuItem
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-sm focus:bg-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive-foreground))] transition-all font-semibold"
                                                onClick={() => onKick(channel, p.peerId)}
                                            >
                                                <LogOut className="h-4 w-4 rotate-180" />
                                                <span className="text-sm">Disconnect User</span>
                                            </ContextMenuItem>
                                        </>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** VoiceStatusBar — Persistent voice connection bar */
function VoiceStatusBar({
    channelName,
    isMuted,
    isJoining,
    onToggleMute,
    onLeave,
    onAudioSettings,
}: {
    channelName: string;
    isMuted: boolean;
    isJoining?: boolean;
    onToggleMute: () => void;
    onLeave: () => void;
    onAudioSettings?: () => void;
}) {
    return (
        <div className="flex flex-col gap-2 p-2 bg-[#232428] border-t border-[rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Signal bars indicator */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-end gap-[2px] h-4 cursor-pointer">
                                {[1, 2, 3, 4, 5].map((bar) => (
                                    <div
                                        key={bar}
                                        className={cn(
                                            "w-[3px] rounded-sm transition-all duration-300",
                                            isJoining
                                                ? "bg-[#949ba4] animate-pulse"
                                                : "bg-[#23a559]"
                                        )}
                                        style={{ height: `${bar * 3}px` }}
                                    />
                                ))}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>{isJoining ? "Connecting..." : "Connection: Excellent"}</TooltipContent>
                    </Tooltip>
                    <div className="flex flex-col min-w-0">
                        <div className={cn(
                            "text-[13px] font-bold leading-tight transition-colors duration-200",
                            isJoining ? "text-[#949ba4]" : "text-[#23a559]"
                        )}>
                            {isJoining ? "Connecting..." : "Voice Connected"}
                        </div>
                        <div className="text-[12px] text-[#b5bac1] truncate hover:underline cursor-pointer">
                            {channelName}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#f23f42] hover:bg-[#f23f42]/10"
                                onClick={onLeave}
                            >
                                <PhoneOff className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Disconnect</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex items-center justify-between gap-1 p-1 bg-[#1e1f22] rounded-md">
                <Button
                    variant="ghost"
                    className={cn(
                        "flex-1 h-8 px-2 gap-2 text-[12px] font-medium transition-all duration-200 justify-start",
                        isMuted ? "text-[#f23f42] hover:bg-[#f23f42]/10" : "text-[#dbdee1] hover:bg-[#3f4147]/50"
                    )}
                    onClick={onToggleMute}
                    disabled={isJoining}
                >
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : isMuted ? <MicOff className="h-4 w-4 shrink-0" /> : <Mic className="h-4 w-4 shrink-0" />}
                    <span>{isMuted ? "Unmute" : "Mute"}</span>
                </Button>
                {onAudioSettings && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#3f4147]/50"
                        onClick={onAudioSettings}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

type UserStatus = 'online' | 'idle' | 'dnd' | 'invisible';

const STATUS_CONFIG: Record<UserStatus, { color: string; label: string; emoji: string }> = {
    online: { color: 'bg-[#23a559]', label: 'Online', emoji: '🟢' },
    idle: { color: 'bg-[#f0b232]', label: 'Idle', emoji: '🌙' },
    dnd: { color: 'bg-[#f23f42]', label: 'Do Not Disturb', emoji: '⛔' },
    invisible: { color: 'bg-[#80848e]', label: 'Invisible', emoji: '👻' },
};

function UserPanel({
    userName,
    isMuted,
    isDeafened,
    onToggleMute,
    onToggleDeafen,
    onAudioSettings,
}: {
    userName: string;
    isMuted: boolean;
    isDeafened: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onAudioSettings?: () => void;
}) {
    const [status, setStatus] = useState<UserStatus>(() => {
        return (localStorage.getItem('lotus-user-status') as UserStatus) || 'online';
    });

    useEffect(() => {
        localStorage.setItem('lotus-user-status', status);
    }, [status]);

    const statusColor = isDeafened ? 'bg-[#80848e]' : STATUS_CONFIG[status].color;

    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-[#232428] shrink-0">
            <div className="flex items-center gap-2 p-1 rounded-md hover:bg-[#3f4147]/50 transition-colors cursor-pointer flex-1 min-w-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center text-xs font-bold text-white shrink-0 cursor-pointer">
                            {userName.charAt(0).toUpperCase()}
                            <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#232428] transition-colors duration-200",
                                statusColor
                            )} />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-48 bg-[#111214] border-[rgba(255,255,255,0.08)] p-1.5 shadow-xl"
                        side="top"
                        align="start"
                        sideOffset={8}
                    >
                        {(Object.entries(STATUS_CONFIG) as [UserStatus, typeof STATUS_CONFIG.online][]).map(([key, cfg]) => (
                            <DropdownMenuItem
                                key={key}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-2 rounded-sm text-[13px] cursor-pointer",
                                    status === key ? "text-white bg-[#5865f2]/20" : "text-[#b5bac1] focus:bg-[#5865f2] focus:text-white"
                                )}
                                onClick={() => setStatus(key)}
                            >
                                <div className={cn("w-2.5 h-2.5 rounded-full", cfg.color)} />
                                <span>{cfg.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex flex-col min-w-0">
                    <div className="text-[13px] font-bold text-[#f2f3f5] truncate leading-tight">
                        {userName}
                    </div>
                    <div className="text-[12px] text-[#b5bac1] truncate leading-tight">
                        #{userName.slice(0, 4)}
                    </div>
                </div>
            </div>

            <div className="flex items-center">
                {/* Mic toggle — Discord: red + MicOff when muted */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 hover:bg-[#3f4147]/50 transition-colors",
                                isMuted || isDeafened
                                    ? "text-[#f23f42] hover:text-[#f23f42]"
                                    : "text-[#b5bac1] hover:text-[#dbdee1]"
                            )}
                            onClick={onToggleMute}
                        >
                            {isMuted || isDeafened ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                </Tooltip>

                {/* Headphones toggle — Discord: red + slash when deafened */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 hover:bg-[#3f4147]/50 transition-colors relative",
                                isDeafened
                                    ? "text-[#f23f42] hover:text-[#f23f42]"
                                    : "text-[#b5bac1] hover:text-[#dbdee1]"
                            )}
                            onClick={onToggleDeafen}
                        >
                            <Headphones className="h-5 w-5" />
                            {isDeafened && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-[2px] h-6 bg-[#f23f42] rotate-45 rounded-full" />
                                </div>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isDeafened ? "Undeafen" : "Deafen"}</TooltipContent>
                </Tooltip>

                {/* Gear icon — opens Audio Settings */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#3f4147]/50"
                            onClick={onAudioSettings}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>User Settings</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

/**
 * AudioRef — Renders an <audio> element for a remote stream.
 * Handles the srcObject reference and play() call.
 */
function AudioRef({ stream, volume = 100, sinkId }: { stream: MediaStream; volume?: number; sinkId?: string }) {
    const audioRef = React.useRef<HTMLAudioElement>(null);

    React.useEffect(() => {
        if (!stream) return;

        if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.play()
                .catch(err => console.error(`[AudioRef] Playback failed for ${stream.id}:`, err));
        }
    }, [stream]);

    // Apply volume and sinkId
    React.useEffect(() => {
        if (audioRef.current) {
            // Volume in settings is 0-200, we map to 0-1 (cap at 1.0 because HTMLAudioElement volume is 0..1)
            audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));

            // setSinkId (experimental - only in some browsers)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (sinkId && sinkId !== "default" && typeof (audioRef.current as any).setSinkId === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (audioRef.current as any).setSinkId(sinkId)
                    .catch((err: any) => console.warn("[AudioRef] Failed to set sinkId:", err));
            }
        }
    }, [volume, sinkId]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            controls={false}
            className="hidden"
        />
    );
}
