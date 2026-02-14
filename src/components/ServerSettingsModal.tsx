import { useState } from "react";
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
import { Check, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { coSet } from "@/lib/jazz-helpers";

interface ServerSettingsModalProps {
    server: any;
    onClose: () => void;
    onDeleteServer: () => void;
}

const SERVER_EMOJIS = ["🎮", "💻", "🎵", "📚", "🎨", "🏠", "🚀", "⚡", "🌟", "🔥", "💬", "🤖"];

export function ServerSettingsModal({ server, onClose, onDeleteServer }: ServerSettingsModalProps) {
    const [name, setName] = useState(server?.name || "");
    const [emoji, setEmoji] = useState(server?.iconEmoji || "📁");
    const [saved, setSaved] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        try {
            coSet(server, "name", name.trim());
            coSet(server, "iconEmoji", emoji);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("[ServerSettings] Save failed:", err);
        }
    };

    const handleDelete = () => {
        onDeleteServer();
        onClose();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-heading">Server Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Server Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Server Info
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                Server Name
                            </label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Server name"
                                className="bg-[hsl(var(--secondary))] border-[hsl(var(--border))]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                Server Icon
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {SERVER_EMOJIS.map((e) => (
                                    <button
                                        key={e}
                                        className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer",
                                            emoji === e
                                                ? "bg-[hsl(var(--primary))/0.2] ring-2 ring-[hsl(var(--primary))] scale-110"
                                                : "bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))/0.8]"
                                        )}
                                        onClick={() => setEmoji(e)}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {saved && (
                            <div className="flex items-center gap-1.5 text-sm text-[var(--organic-green)] animate-fade-in">
                                <Check className="h-4 w-4" /> Server updated!
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Danger Zone */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--destructive))]">
                            Danger Zone
                        </h3>
                        {!confirmDelete ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirmDelete(true)}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" /> Delete Server
                            </Button>
                        ) : (
                            <div className="rounded-lg bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] p-3 space-y-3 animate-fade-in">
                                <p className="text-sm text-[hsl(var(--destructive))] flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    Are you sure? This will remove the server from your list. Other members may still have access.
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                                    <Button variant="destructive" size="sm" onClick={handleDelete}>Yes, Delete</Button>
                                </div>
                            </div>
                        )}
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
