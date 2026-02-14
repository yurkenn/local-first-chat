import { useState } from "react";
import { useCoState } from "jazz-tools/react";
import { ChatAccount } from "@/schema";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Check, Shield, Sun, Moon, Smartphone } from "lucide-react";
import type { Theme } from "@/hooks/useTheme";
import { coSet } from "@/lib/jazz-helpers";

interface UserSettingsModalProps {
    onClose: () => void;
    theme: Theme;
    onThemeChange: (t: Theme) => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" />, desc: "Organic sage dark" },
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" />, desc: "Clean warm light" },
    { value: "amoled", label: "AMOLED", icon: <Smartphone className="h-4 w-4" />, desc: "True black" },
];

export function UserSettingsModal({ onClose, theme, onThemeChange }: UserSettingsModalProps) {
    const me = useCoState(ChatAccount, "me", {
        resolve: { profile: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = me as any;
    const currentName = account?.profile?.name || "";
    const [name, setName] = useState(currentName);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        try {
            coSet(account.profile, "name", name.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("[UserSettings] Save failed:", err);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">User Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Profile section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Profile
                        </h3>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--organic-sage)] to-[var(--organic-blue)] flex items-center justify-center text-lg font-bold text-white shrink-0">
                                {(currentName || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-semibold">{currentName}</div>
                                <div className="text-xs text-[var(--organic-green)] flex items-center gap-1">
                                    <div className="status-dot status-dot--xs" />
                                    Online
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                Display Name
                            </label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your display name"
                                className="bg-[hsl(var(--secondary))] border-[hsl(var(--border))]"
                            />
                        </div>

                        {saved && (
                            <div className="flex items-center gap-1.5 text-sm text-[var(--organic-green)] animate-fade-in">
                                <Check className="h-4 w-4" /> Name updated!
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Theme section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Appearance
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {THEME_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => onThemeChange(opt.value)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${theme === opt.value
                                        ? "border-[var(--organic-sage)] bg-[var(--organic-sage)]/10 text-[var(--organic-sage)]"
                                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                        }`}
                                >
                                    {opt.icon}
                                    <span className="text-xs font-semibold">{opt.label}</span>
                                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Account section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Account
                        </h3>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[hsl(var(--muted-foreground))]">Auth Method</span>
                            <span className="flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-[var(--organic-sage)]" />
                                Passphrase (BIP39)
                            </span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Your account is secured with a passphrase. Keep it safe — it's the only way to recover your account.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button
                        className="bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] text-white"
                        onClick={handleSave}
                        disabled={!name.trim()}
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
