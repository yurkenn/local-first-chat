import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { AudioSettings } from "@/hooks/useAudioSettings";
import type { Theme } from "@/hooks/useTheme";
import type { LoadedAccount } from "@/lib/jazz-types";
import {
    ChevronDown, X, Mic, Volume2,
    Bell, Palette, User, KeyRound, FileText, Key
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioSettingsModalProps {
    onClose: () => void;
    audio: AudioSettings;
    me?: LoadedAccount | null;
    theme?: Theme;
    onThemeChange?: (t: Theme) => void;
}

type SettingsSection = "my-account" | "voice-video" | "appearance" | "notifications" | "keybinds";

export function AudioSettingsModal({ onClose, audio, me, theme = "dark", onThemeChange }: AudioSettingsModalProps) {
    const [activeSection, setActiveSection] = useState<SettingsSection>("voice-video");
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => onClose(), 200);
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleClose]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const sidebarItems: { section: SettingsSection; label: string; icon: React.ReactNode; category: string }[] = [
        { section: "my-account", label: "My Account", icon: <User className="h-4 w-4" />, category: "User Settings" },
        { section: "voice-video", label: "Voice & Video", icon: <Mic className="h-4 w-4" />, category: "App Settings" },
        { section: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" />, category: "App Settings" },
        { section: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, category: "App Settings" },
        { section: "keybinds", label: "Keybinds", icon: <KeyRound className="h-4 w-4" />, category: "App Settings" },
    ];

    // User profile data from Jazz
    const profileName = (me as any)?.profile?.name ?? "User"; // eslint-disable-line @typescript-eslint/no-explicit-any

    const content = createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex transition-opacity duration-200",
                isClosing ? "opacity-0" : "opacity-100"
            )}
            style={{ animation: isClosing ? undefined : "settingsFadeIn 0.15s ease-out" }}
        >
            {/* ── Left sidebar region ── */}
            <div className="flex flex-1">
                <div className="flex-1 bg-[#2b2d31]" />
                <div className="w-[218px] bg-[#2b2d31] flex flex-col py-[60px] pr-1.5 pl-2 overflow-y-auto custom-scrollbar shrink-0">
                    {["User Settings", "App Settings"].map((category) => (
                        <div key={category} className="mb-1">
                            <div className="px-2.5 pt-6 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#949ba4]">
                                {category}
                            </div>
                            {sidebarItems
                                .filter((item) => item.category === category)
                                .map((item) => (
                                    <button
                                        key={item.section}
                                        onClick={() => setActiveSection(item.section)}
                                        className={cn(
                                            "w-full text-left px-2.5 py-[6px] rounded-[4px] text-[15px] font-medium mb-[1px] transition-colors flex items-center gap-2",
                                            activeSection === item.section
                                                ? "bg-[#404249] text-white"
                                                : "text-[#b5bac1] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                                        )}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                        </div>
                    ))}
                    <div className="mx-2.5 my-2 h-px bg-[#3f4147]" />
                    <button className="w-full text-left px-2.5 py-[6px] rounded-[4px] text-[15px] font-medium text-[#ed4245]/40 cursor-not-allowed flex items-center gap-2" disabled title="Coming soon">
                        <FileText className="h-4 w-4" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* ── Right content region ── */}
            <div className="flex flex-[1.5]">
                <div className="w-[660px] bg-[#313338] py-[60px] px-10 overflow-y-auto custom-scrollbar shrink-0">
                    {activeSection === "voice-video" && <VoiceVideoSettings audio={audio} />}
                    {activeSection === "my-account" && <MyAccountSettings profileName={profileName} />}
                    {activeSection === "appearance" && <AppearanceSettings theme={theme} onThemeChange={onThemeChange} />}
                    {activeSection === "notifications" && <NotificationSettings />}
                    {activeSection === "keybinds" && <KeybindSettings />}
                </div>
                <div className="flex-1 bg-[#313338] pt-[60px] pl-4">
                    <button onClick={handleClose} className="group flex flex-col items-center gap-1">
                        <div className="w-9 h-9 rounded-full border-2 border-[#72767d] flex items-center justify-center transition-all group-hover:border-white group-hover:bg-white/5">
                            <X className="h-[18px] w-[18px] text-[#72767d] group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#72767d] group-hover:text-white transition-colors">ESC</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

    return content;
}

/* ═══════════════════════════════════════════════════════════════════
   Voice & Video
   ═══════════════════════════════════════════════════════════════════ */
function VoiceVideoSettings({ audio }: { audio: AudioSettings }) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-5">Voice & Video</h2>

            <SectionHeader>Voice Settings</SectionHeader>
            <div className="grid grid-cols-2 gap-5 mb-6">
                <div className="space-y-2">
                    <label className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">Input Device</label>
                    <StyledSelect
                        value={audio.selectedInputId}
                        onChange={(v) => audio.setSelectedInputId(v)}
                        options={audio.inputDevices.map((d) => ({ value: d.deviceId, label: d.label || "Default" }))}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">Output Device</label>
                    <StyledSelect
                        value={audio.selectedOutputId}
                        onChange={(v) => audio.setSelectedOutputId(v)}
                        options={audio.outputDevices.map((d) => ({ value: d.deviceId, label: d.label || "Default" }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-8">
                <SliderRow label="Input Volume" value={audio.inputVolume} max={200} onChange={audio.setInputVolume} icon={<Mic className="h-3.5 w-3.5 text-[#b5bac1]" />} />
                <SliderRow label="Output Volume" value={audio.outputVolume} max={200} onChange={audio.setOutputVolume} icon={<Volume2 className="h-3.5 w-3.5 text-[#b5bac1]" />} />
            </div>

            <SectionHeader>Mic Test</SectionHeader>
            <div className="bg-[#2b2d31] rounded-lg p-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={audio.isTesting ? audio.stopMicTest : audio.startMicTest}
                        className={cn(
                            "px-5 py-2 rounded text-sm font-medium transition-all min-w-[120px] h-[38px] flex items-center justify-center",
                            audio.isTesting
                                ? "bg-[#da373c] hover:bg-[#a12829] text-white"
                                : "bg-[#5865f2] hover:bg-[#4752c4] text-white"
                        )}
                    >
                        {audio.isTesting ? "Stop Testing" : "Let's Check"}
                    </button>
                    <div className="flex-1 h-2 bg-[#1e1f22] rounded-full overflow-hidden flex gap-[1px]">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 rounded-[1px] transition-all duration-75",
                                    audio.isTesting && (audio.micLevel / 100) * 50 > i
                                        ? i > 40 ? "bg-[#fee75c]" : i > 35 ? "bg-[#57f287]" : "bg-[#23a559]"
                                        : "bg-[#4e5058]"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <SectionHeader>Input Mode</SectionHeader>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <RadioCard active label="Voice Activity" />
                <RadioCard label="Push to Talk" disabled />
            </div>

            <Divider />
            <SectionHeader>Voice Processing</SectionHeader>
            <ToggleRow label="Echo Cancellation" description="Reduces echo from speakers or headphones" checked={audio.echoCancellation} onChange={() => audio.setEchoCancellation(!audio.echoCancellation)} />
            <ToggleRow label="Noise Suppression" description="Removes background noise from your microphone" checked={audio.noiseSuppression} onChange={() => audio.setNoiseSuppression(!audio.noiseSuppression)} />
            <ToggleRow label="Automatic Gain Control" description="Automatically adjusts your microphone volume" checked={audio.autoGainControl} onChange={() => audio.setAutoGainControl(!audio.autoGainControl)} />
            <ToggleRow label="AI Noise Cancellation" description="Uses advanced AI to filter out noise (RNNoise)" checked={audio.aiNoiseCancellation} onChange={() => audio.setAiNoiseCancellation(!audio.aiNoiseCancellation)} badge="BETA" />

            <Divider />
            <SectionHeader>Advanced</SectionHeader>

            <SliderRow
                label="Input Sensitivity"
                value={Math.round(audio.sensitivity * 100)}
                max={100}
                onChange={(v) => audio.setSensitivity(v / 100)}
                icon={<Mic className="h-3.5 w-3.5 text-[#b5bac1]" />}
            />

            <div className="h-16" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   My Account
   ═══════════════════════════════════════════════════════════════════ */
function MyAccountSettings({ profileName }: { profileName: string }) {
    const firstLetter = profileName.charAt(0).toUpperCase();

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-5">My Account</h2>

            {/* Profile card */}
            <div className="rounded-lg overflow-hidden mb-6">
                {/* Banner */}
                <div className="h-[100px] bg-gradient-to-r from-[#5865f2] to-[#eb459e]" />

                {/* Profile row */}
                <div className="bg-[#2b2d31] px-4 pb-4">
                    <div className="flex items-end gap-4 -mt-9">
                        <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-[#5865f2] to-[#eb459e] border-[6px] border-[#2b2d31] flex items-center justify-center text-2xl font-bold text-white shrink-0">
                            {firstLetter}
                        </div>
                        <div className="flex-1 pt-5 pb-1">
                            <p className="text-xl font-semibold text-white">{profileName}</p>
                            <p className="text-sm text-[#b5bac1]">#{profileName.toLowerCase()}</p>
                        </div>
                        <button className="px-4 py-1.5 mb-1 rounded text-sm font-medium bg-[#5865f2]/40 text-white/60 cursor-not-allowed" disabled title="Coming soon">
                            Edit User Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Info card */}
            <div className="bg-[#2b2d31] rounded-lg p-4">
                <InfoRow label="Display Name" value={profileName} />
                <InfoRow label="Username" value={profileName.toLowerCase()} />
                <InfoRow label="Email" value="—" subtitle="Local-first account · No email required" />

                <div className="mt-4 pt-4 border-t border-[#3f4147]/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#5865f2]/10 flex items-center justify-center">
                            <Key className="h-5 w-5 text-[#5865f2]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[15px] text-[#dbdee1] font-medium">End-to-End Encrypted</p>
                            <p className="text-[13px] text-[#949ba4]">Your data is encrypted with Jazz. Only you and your group members can read it.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-16" />
        </div>
    );
}

function InfoRow({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[#3f4147]/30 last:border-b-0">
            <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1] mb-0.5">{label}</p>
                <p className="text-[15px] text-[#dbdee1]">{value}</p>
                {subtitle && <p className="text-[12px] text-[#949ba4] mt-0.5">{subtitle}</p>}
            </div>
            <button className="px-4 py-1.5 rounded text-sm font-medium bg-[#4e5058]/40 text-white/40 cursor-not-allowed" disabled title="Coming soon">
                Edit
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Appearance — real theme switching
   ═══════════════════════════════════════════════════════════════════ */
function AppearanceSettings({ theme, onThemeChange }: { theme?: Theme; onThemeChange?: (t: Theme) => void }) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-5">Appearance</h2>

            <SectionHeader>Theme</SectionHeader>
            <p className="text-[13px] text-[#949ba4] mb-4">Choose how Lotus looks for you. Select a theme below.</p>

            <div className="grid grid-cols-3 gap-3 mb-8">
                <ThemeCard
                    label="Dark"
                    active={theme === "dark"}
                    onClick={() => onThemeChange?.("dark")}
                    colors={{ bg: "#313338", sidebar: "#2b2d31", text: "#dbdee1", accent: "#5865f2" }}
                />
                <ThemeCard
                    label="Light"
                    active={theme === "light"}
                    onClick={() => onThemeChange?.("light")}
                    colors={{ bg: "#ffffff", sidebar: "#f2f3f5", text: "#313338", accent: "#5865f2" }}
                />
                <ThemeCard
                    label="AMOLED"
                    active={theme === "amoled"}
                    onClick={() => onThemeChange?.("amoled")}
                    colors={{ bg: "#000000", sidebar: "#0a0a0a", text: "#dcddde", accent: "#5865f2" }}
                />
            </div>

            <Divider />
            <SectionHeader>Message Display</SectionHeader>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <RadioCard active label="Cozy" />
                <RadioCard label="Compact" disabled />
            </div>

            <Divider />
            <SectionHeader>Accessibility</SectionHeader>
            <ToggleRow label="Reduce Motion" description="Disable animations and motion effects" checked={false} onChange={() => { }} disabled badge="SOON" />
            <ToggleRow label="Sticker Animations" description="Show animated stickers and emojis" checked={true} onChange={() => { }} disabled badge="SOON" />

            <div className="h-16" />
        </div>
    );
}

function ThemeCard({ label, active, onClick, colors }: { label: string; active?: boolean; onClick?: () => void; colors: { bg: string; sidebar: string; text: string; accent: string } }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-3 rounded-lg border-2 cursor-pointer transition-all text-left group",
                active
                    ? "border-[#5865f2] bg-[#5865f2]/10"
                    : "border-[#3f4147] bg-[#2b2d31] hover:border-[#4e5058]"
            )}
        >
            {/* Mini preview */}
            <div className="w-full h-[64px] rounded overflow-hidden mb-3 flex" style={{ background: colors.bg }}>
                <div className="w-[14px] shrink-0" style={{ background: colors.sidebar }} />
                <div className="w-[40px] shrink-0 p-1" style={{ background: colors.sidebar }}>
                    <div className="w-full h-1.5 rounded-sm mt-2 opacity-40" style={{ background: colors.text }} />
                    <div className="w-3/4 h-1.5 rounded-sm mt-1 opacity-30" style={{ background: colors.text }} />
                    <div className="w-full h-1.5 rounded-sm mt-1 opacity-25" style={{ background: colors.text }} />
                </div>
                <div className="flex-1 p-1.5">
                    <div className="flex items-center gap-1 mb-1.5">
                        <div className="w-3 h-3 rounded-full opacity-40" style={{ background: colors.accent }} />
                        <div className="w-8 h-1.5 rounded-sm opacity-40" style={{ background: colors.text }} />
                    </div>
                    <div className="w-full h-1 rounded-sm opacity-20" style={{ background: colors.text }} />
                    <div className="w-2/3 h-1 rounded-sm mt-0.5 opacity-15" style={{ background: colors.text }} />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    active ? "border-[#5865f2]" : "border-[#72767d]"
                )}>
                    {active && <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2]" />}
                </div>
                <span className={cn("text-[14px] font-medium", active ? "text-white" : "text-[#b5bac1]")}>{label}</span>
            </div>
        </button>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Notifications
   ═══════════════════════════════════════════════════════════════════ */
function NotificationSettings() {
    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-5">Notifications</h2>

            <SectionHeader>Desktop Notifications</SectionHeader>
            <div className="bg-[#2b2d31] rounded-lg p-4 mb-6">
                <p className="text-[13px] text-[#949ba4] mb-4">
                    Lotus can send you desktop notifications when you receive new messages. You can customize them below.
                </p>
                <ToggleRow label="Enable Desktop Notifications" description="Show native desktop notifications for new messages" checked={true} onChange={() => { }} disabled badge="SOON" />
                <ToggleRow label="Enable Notification Sound" description="Play a sound when you receive a notification" checked={true} onChange={() => { }} disabled badge="SOON" />
                <ToggleRow label="Unread Badge" description="Show unread message count on the app icon" checked={true} onChange={() => { }} disabled badge="SOON" />
            </div>

            <SectionHeader>In-App Notifications</SectionHeader>
            <ToggleRow label="Show Typing Indicators" description="See when other users are typing in a channel" checked={true} onChange={() => { }} disabled badge="SOON" />
            <ToggleRow label="Flash Taskbar" description="Flash the taskbar when you receive a mention" checked={false} onChange={() => { }} disabled badge="SOON" />

            <div className="h-16" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Keybinds
   ═══════════════════════════════════════════════════════════════════ */
function KeybindSettings() {
    const keybinds = [
        { action: "Toggle Mute", keys: "—", description: "Mute/unmute microphone" },
        { action: "Toggle Deafen", keys: "—", description: "Deafen/undeafen speakers" },
        { action: "Search", keys: "⌘ K", description: "Open search dialog" },
        { action: "Settings", keys: "—", description: "Open settings page" },
        { action: "Close", keys: "Escape", description: "Close current modal or overlay" },
    ];

    return (
        <div>
            <h2 className="text-xl font-semibold text-white mb-5">Keybinds</h2>
            <p className="text-[13px] text-[#949ba4] mb-6">Customize keyboard shortcuts for common actions.</p>

            <div className="bg-[#2b2d31] rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_1.5fr] gap-0 text-[12px] font-bold uppercase tracking-wider text-[#949ba4] px-4 py-3 border-b border-[#3f4147]/50">
                    <span>Action</span>
                    <span>Keybind</span>
                    <span>Description</span>
                </div>
                {keybinds.map((kb, i) => (
                    <div key={i} className={cn(
                        "grid grid-cols-[1fr_120px_1.5fr] gap-0 px-4 py-3 items-center",
                        i < keybinds.length - 1 && "border-b border-[#3f4147]/20"
                    )}>
                        <span className="text-[15px] text-[#dbdee1] font-medium">{kb.action}</span>
                        <span className="text-[13px]">
                            {kb.keys === "—" ? (
                                <span className="text-[#949ba4]">—</span>
                            ) : (
                                <kbd className="px-2 py-0.5 rounded bg-[#1e1f22] text-[#dbdee1] text-[12px] font-mono border border-[#3f4147]">
                                    {kb.keys}
                                </kbd>
                            )}
                        </span>
                        <span className="text-[13px] text-[#949ba4]">{kb.description}</span>
                    </div>
                ))}
            </div>

            <div className="h-16" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared UI Components
   ═══════════════════════════════════════════════════════════════════ */

function SectionHeader({ children }: { children: React.ReactNode }) {
    return <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-[#b5bac1] mb-3">{children}</h3>;
}

function Divider() {
    return <div className="h-px bg-[#3f4147] my-8" />;
}

function SliderRow({ label, value, max, onChange, icon }: { label: string; value: number; max: number; onChange: (v: number) => void; icon?: React.ReactNode }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">{label}</span>
                </div>
                <span className="text-[12px] text-[#949ba4] font-mono tabular-nums">{pct}%</span>
            </div>
            <div className="relative group">
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full h-[6px] bg-[#4e5058] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                    style={{ background: `linear-gradient(to right, #5865f2 ${pct}%, #4e5058 ${pct}%)` }}
                />
            </div>
        </div>
    );
}

function StyledSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[#1e1f22] text-[#dbdee1] border-none rounded py-[10px] px-3 text-sm focus:outline-none appearance-none cursor-pointer hover:bg-[#232428] transition-colors"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1e1f22] text-[#dbdee1]">{opt.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949ba4] pointer-events-none group-hover:text-[#dbdee1] transition-colors" />
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange, badge, disabled }: { label: string; description?: string; checked: boolean; onChange: () => void; badge?: string; disabled?: boolean }) {
    return (
        <div className={cn("flex items-center justify-between py-4 border-b border-[#3f4147]/30 last:border-b-0", disabled && "opacity-50")}>
            <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] text-[#dbdee1] font-medium">{label}</span>
                    {badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">{badge}</span>
                    )}
                </div>
                {description && <p className="text-[13px] text-[#949ba4] mt-0.5">{description}</p>}
            </div>
            <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
        </div>
    );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={disabled ? undefined : onChange}
            disabled={disabled}
            className={cn(
                "relative w-[42px] min-w-[42px] h-[24px] rounded-full transition-colors duration-200 outline-none focus:ring-2 focus:ring-[#5865f2]/50",
                checked ? "bg-[#23a559]" : "bg-[#80848e]",
                disabled && "cursor-not-allowed"
            )}
        >
            <div className={cn(
                "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-200 shadow-md",
                checked ? "left-[21px]" : "left-[3px]"
            )} />
        </button>
    );
}

function RadioCard({ label, active, disabled }: { label: string; active?: boolean; disabled?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 p-3.5 rounded-lg border transition-all",
            active ? "border-[#5865f2] bg-[#5865f2]/5 cursor-default"
                : disabled ? "border-[#3f4147] opacity-50 cursor-not-allowed"
                    : "border-[#3f4147] hover:border-[#4e5058] cursor-pointer"
        )}>
            <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                active ? "border-[#5865f2]" : "border-[#72767d]"
            )}>
                {active && <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2]" />}
            </div>
            <span className={cn("text-[15px] font-medium", active ? "text-white" : disabled ? "text-[#72767d]" : "text-[#b5bac1]")}>{label}</span>
        </div>
    );
}
