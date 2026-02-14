import { useAudioSettings } from "@/hooks/useAudioSettings";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Mic, Volume2, Headphones, RefreshCw, Play, Square,
    VolumeX, Activity, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioSettingsModalProps {
    onClose: () => void;
}

export function AudioSettingsModal({ onClose }: AudioSettingsModalProps) {
    const audio = useAudioSettings();

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="glass-elevated sm:max-w-[480px] max-h-[85vh] overflow-y-auto p-0 gap-0 border-[var(--glass-border-strong)]">
                {/* Header */}
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-base font-heading font-semibold flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-violet)] flex items-center justify-center">
                            <Headphones className="h-4 w-4 text-white" />
                        </div>
                        Voice & Audio
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                    {/* ── Input Device ── */}
                    <div className="segmented-section">
                        <div className="segment-item space-y-3">
                            <SectionLabel icon={<Mic className="h-3.5 w-3.5" />} label="Input Device" />
                            <StyledSelect
                                value={audio.selectedInputId}
                                onChange={(v) => audio.setSelectedInputId(v)}
                                options={audio.inputDevices.map((d) => ({ value: d.deviceId, label: d.label }))}
                            />
                        </div>
                        <div className="segment-item space-y-2">
                            <SliderRow
                                label="Input Volume"
                                value={audio.inputVolume}
                                max={200}
                                color="cyan"
                                onChange={audio.setInputVolume}
                            />
                        </div>
                    </div>

                    {/* ── Output Device ── */}
                    <div className="segmented-section">
                        <div className="segment-item space-y-3">
                            <SectionLabel icon={<Volume2 className="h-3.5 w-3.5" />} label="Output Device" />
                            <StyledSelect
                                value={audio.selectedOutputId}
                                onChange={(v) => audio.setSelectedOutputId(v)}
                                options={audio.outputDevices.map((d) => ({ value: d.deviceId, label: d.label }))}
                            />
                        </div>
                        <div className="segment-item space-y-2">
                            <SliderRow
                                label="Output Volume"
                                value={audio.outputVolume}
                                max={200}
                                color="cyan"
                                onChange={audio.setOutputVolume}
                            />
                        </div>
                    </div>

                    {/* ── Voice Sensitivity ── */}
                    <div className="segmented-section">
                        <div className="segment-item space-y-3">
                            <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} label="Voice Sensitivity" />
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed -mt-1">
                                Adjust when your mic activates. Lower = more sensitive.
                            </p>
                            <SliderRow
                                label="Threshold"
                                value={audio.sensitivity}
                                max={100}
                                color="green"
                                onChange={audio.setSensitivity}
                            />
                        </div>
                    </div>

                    {/* ── Mic Test ── */}
                    <div className="segmented-section">
                        <div className="segment-item space-y-3">
                            <SectionLabel icon={<Mic className="h-3.5 w-3.5" />} label="Mic Test" />
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={audio.isTesting ? audio.stopMicTest : audio.startMicTest}
                                    className={cn(
                                        "gap-2 rounded-lg h-9 px-4 text-xs font-medium transition-all",
                                        audio.isTesting
                                            ? "bg-[hsl(var(--destructive))/0.12] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.2]"
                                            : "bg-[var(--neon-green)]/10 text-[var(--neon-green)] hover:bg-[var(--neon-green)]/20"
                                    )}
                                >
                                    {audio.isTesting ? (
                                        <><Square className="h-3 w-3" /> Stop</>
                                    ) : (
                                        <><Play className="h-3 w-3" /> Test</>
                                    )}
                                </Button>

                                {/* Waveform visualizer */}
                                <div className="flex-1 flex items-center justify-center gap-[3px] h-8">
                                    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((delay, i) => (
                                        <div
                                            key={i}
                                            className="w-[4px] rounded-full transition-all duration-75"
                                            style={{
                                                height: audio.isTesting
                                                    ? `${Math.max(4, (audio.micLevel / 100) * 32 * delay)}px`
                                                    : "4px",
                                                background: audio.isTesting
                                                    ? audio.micLevel > 75
                                                        ? "var(--neon-orange)"
                                                        : audio.micLevel > 40
                                                            ? "var(--neon-green)"
                                                            : "var(--neon-cyan)"
                                                    : "hsl(var(--border))",
                                                animationDelay: audio.isTesting ? `${i * 80}ms` : undefined,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            {audio.isTesting && (
                                <p className="text-[10px] text-[hsl(var(--muted-foreground))] animate-fade-in">
                                    Speak to test your microphone input level.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Deafen ── */}
                    <div className="segmented-section">
                        <div className="segment-item">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        audio.isDeafened
                                            ? "bg-[hsl(var(--destructive))/0.15] text-[hsl(var(--destructive))]"
                                            : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                                    )}>
                                        <VolumeX className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium">Deafen</div>
                                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                            Mute all incoming audio
                                        </div>
                                    </div>
                                </div>
                                <PremiumSwitch
                                    checked={audio.isDeafened}
                                    onChange={audio.toggleDeafen}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex items-center justify-between pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={audio.refreshDevices}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] gap-1.5 text-xs h-8"
                        >
                            <RefreshCw className="h-3 w-3" /> Refresh
                        </Button>

                        <Button
                            onClick={() => {
                                if (audio.isTesting) audio.stopMicTest();
                                onClose();
                            }}
                            className="h-9 px-6 rounded-lg bg-gradient-to-r from-[var(--neon-violet)] to-[hsl(270,60%,48%)] text-white font-medium text-xs hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-shadow"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ─── Sub-components ─── */

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {icon}
            {label}
        </div>
    );
}

function SliderRow({
    label,
    value,
    max,
    color,
    onChange,
}: {
    label: string;
    value: number;
    max: number;
    color: "cyan" | "green";
    onChange: (v: number) => void;
}) {
    const accentColor = color === "green" ? "var(--neon-green)" : "var(--neon-cyan)";
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: accentColor }}>
                    {value}%
                </span>
            </div>
            <input
                type="range"
                min={0}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={cn("w-full", color === "green" && "range-green")}
            />
        </div>
    );
}

function StyledSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <div className="relative">
            <select
                className="w-full appearance-none bg-[hsl(var(--secondary))] border border-[var(--glass-border)] rounded-lg px-3 py-2.5 pr-9 text-sm text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] focus:border-[var(--glass-border-strong)] cursor-pointer transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] pointer-events-none" />
        </div>
    );
}

function PremiumSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <button
            onClick={onChange}
            className={cn(
                "relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer",
                checked
                    ? "bg-[hsl(var(--destructive))] shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                    : "bg-[hsl(var(--secondary))] border border-[var(--glass-border)]"
            )}
            aria-label="Toggle deafen"
        >
            <div
                className={cn(
                    "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-300",
                    checked ? "left-[23px]" : "left-[3px]"
                )}
            />
        </button>
    );
}
