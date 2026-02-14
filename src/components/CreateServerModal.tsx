import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeName, MAX_NAME_LENGTH } from "@/lib/validators";

interface CreateServerModalProps {
    onClose: () => void;
    onCreate: (name: string, emoji: string) => void;
}

const EMOJI_OPTIONS = [
    "🎮", "💻", "🎵", "🎨", "📚", "🏠", "🚀", "⚡",
    "🌍", "☕", "🔥", "❤️", "🌙", "🎯", "🧪", "🛡️",
];

export function CreateServerModal({ onClose, onCreate }: CreateServerModalProps) {
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🎮");

    const handleSubmit = () => {
        const sanitized = sanitizeName(name, MAX_NAME_LENGTH);
        if (!sanitized) return;
        onCreate(sanitized, emoji);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Create a Server</DialogTitle>
                    <DialogDescription>
                        Your server is where you and your friends hang out.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="label-section">
                            Server Name
                        </label>
                        <Input
                            type="text"
                            placeholder="My Awesome Server"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            autoFocus
                            maxLength={50}
                            className="input-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="label-section">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {EMOJI_OPTIONS.map((e) => (
                                <button
                                    key={e}
                                    className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer",
                                        emoji === e
                                            ? "bg-[hsl(var(--primary))/0.2] ring-2 ring-[hsl(var(--primary))] scale-110"
                                            : "bg-surface hover:bg-[hsl(var(--secondary))/0.8]"
                                    )}
                                    onClick={() => setEmoji(e)}
                                    type="button"
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] text-white"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Create Server
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
