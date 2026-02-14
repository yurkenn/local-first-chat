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
import { Hash, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeName } from "@/lib/validators";

interface CreateChannelModalProps {
    onClose: () => void;
    onCreate: (name: string, type: "text" | "voice") => void;
}

export function CreateChannelModal({ onClose, onCreate }: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"text" | "voice">("text");

    const handleSubmit = () => {
        const sanitized = sanitizeName(name.toLowerCase().replace(/\s+/g, "-"), 30);
        if (!sanitized) return;
        onCreate(sanitized, type);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="dialog-base sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Create Channel</DialogTitle>
                    <DialogDescription>
                        Choose a type and name for your new channel.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Channel type selector */}
                    <div className="space-y-2">
                        <label className="label-section">
                            Channel Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 rounded-lg border transition-all cursor-pointer",
                                    type === "text"
                                        ? "bg-[hsl(var(--primary))/0.1] border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                                        : "input-base text-muted-color hover:border-[hsl(var(--muted-foreground))]"
                                )}
                                onClick={() => setType("text")}
                                type="button"
                            >
                                <Hash className="h-5 w-5" />
                                <span className="text-sm font-medium">Text</span>
                            </button>
                            <button
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 rounded-lg border transition-all cursor-pointer",
                                    type === "voice"
                                        ? "bg-[hsl(var(--primary))/0.1] border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                                        : "input-base text-muted-color hover:border-[hsl(var(--muted-foreground))]"
                                )}
                                onClick={() => setType("voice")}
                                type="button"
                            >
                                <Volume2 className="h-5 w-5" />
                                <span className="text-sm font-medium">Voice</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label-section">
                            Channel Name
                        </label>
                        <Input
                            type="text"
                            placeholder={type === "text" ? "new-channel" : "voice-chat"}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            autoFocus
                            maxLength={30}
                            className="input-base"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] text-white"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Create Channel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
