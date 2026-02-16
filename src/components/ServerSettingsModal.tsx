import { useState } from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Check, AlertTriangle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { coSet } from "@/lib/jazz-helpers";
import type { LoadedServer } from "@/lib/jazz-types";
import { handleError } from "@/lib/error-utils";

interface ServerSettingsModalProps {
    server: LoadedServer;
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
            handleError(err, { context: "ServerSettings" });
        }
    };

    const handleDelete = () => {
        onDeleteServer();
        onClose();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-[#313338] border-none text-[#dbdee1] sm:max-w-[720px] p-0 overflow-hidden shadow-2xl h-[540px]">
                <div className="flex h-full w-full">
                    {/* Sidebar */}
                    <div className="w-[200px] bg-[#2b2d31] p-4 flex flex-col pt-12">
                        <div className="px-2 mb-2 text-[12px] font-bold uppercase tracking-wider text-[#949ba4] truncate">
                            {server?.name || "Server"}
                        </div>
                        <nav className="space-y-0.5">
                            <button className="w-full text-left px-2 py-1.5 rounded-[4px] bg-[#3f4147] text-white text-sm font-medium">
                                Overview
                            </button>
                            {["Roles", "Emoji", "Stickers", "Soundboard", "Widget", "Server Template"].map((item) => (
                                <button key={item} className="w-full text-left px-2 py-1.5 rounded-[4px] text-[#b5bac1]/40 text-sm font-medium cursor-not-allowed" title="Coming soon" disabled>
                                    {item}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 px-2 mb-2 text-[12px] font-bold uppercase tracking-wider text-[#949ba4]">
                            User Management
                        </div>
                        <nav className="space-y-0.5 text-sm font-medium text-[#b5bac1]">
                            {["Members", "Invites", "Bans"].map((item) => (
                                <button key={item} className="w-full text-left px-2 py-1.5 rounded-[4px] text-[#b5bac1]/40 text-sm font-medium cursor-not-allowed" title="Coming soon" disabled>
                                    {item}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-auto pt-4 border-t border-white/5">
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="w-full text-left px-2 py-1.5 rounded-[4px] text-[#fa777c] hover:bg-[#fa777c]/10 text-sm font-medium transition-colors"
                            >
                                Delete Server
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="p-8 flex-1 overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-6">Server Overview</h2>

                            <div className="flex gap-8 mb-8">
                                {/* Icon Upload Section */}
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full bg-[#E8789A] flex items-center justify-center text-4xl shadow-lg border-2 border-transparent group-hover:border-white/10 transition-all cursor-pointer overflow-hidden">
                                            {emoji}
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-6 w-6 text-white mb-1" />
                                                <span className="text-[10px] font-bold text-white text-center leading-tight">UPLOAD<br />IMAGE</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-[#b5bac1] text-center leading-snug">
                                        Minimum Size:<br />
                                        <span className="font-bold text-[#dbdee1]">512x512</span>
                                    </p>
                                </div>

                                {/* Server Name Section */}
                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">
                                            Server Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Server name"
                                            className="w-full bg-[#1e1f22] text-[#dbdee1] border-none rounded-[3px] py-2.5 px-3 text-base focus:outline-none focus:ring-1 focus:ring-[#E8789A] transition-shadow shadow-inner"
                                        />
                                    </div>

                                    <div className="text-[12px] text-[#b5bac1] leading-relaxed">
                                        We recommend an image of at least 512x512 for the server. You can also pick an emoji as your icon.
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {SERVER_EMOJIS.map((e) => (
                                            <button
                                                key={e}
                                                className={cn(
                                                    "w-10 h-10 rounded-[8px] flex items-center justify-center text-xl transition-all cursor-pointer",
                                                    emoji === e
                                                        ? "bg-[#E8789A] text-white shadow-lg"
                                                        : "bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c] hover:text-white"
                                                )}
                                                onClick={() => setEmoji(e)}
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {confirmDelete && (
                                <div className="mt-6 p-4 rounded-lg bg-[#da373c]/10 border border-[#da373c]/30 space-y-4 animate-fade-in">
                                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-[#f1c40f]" />
                                        Delete '{server?.name}'
                                    </h3>
                                    <p className="text-[#dbdee1] text-sm leading-relaxed">
                                        Are you sure you want to delete <span className="font-bold">{server?.name}</span>? This action cannot be undone.
                                        Members will lose access to all channels and messages.
                                    </p>
                                    <div className="flex items-center gap-4 justify-end">
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="text-white text-sm hover:underline"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="bg-[#da373c] hover:bg-[#a12829] text-white px-6 py-2 rounded-[3px] text-sm font-medium transition-colors"
                                        >
                                            Delete Server
                                        </button>
                                    </div>
                                </div>
                            )}

                            {saved && (
                                <div className="mt-4 flex items-center gap-2 text-[#5D8A3C] text-sm font-medium animate-fade-in">
                                    <Check className="h-4 w-4" /> Changes saved successfully!
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer for saving */}
                        <div className="bg-[#2b2d31] p-4 flex items-center justify-end gap-4 border-t border-white/5">
                            <button
                                onClick={onClose}
                                className="text-white text-sm font-medium hover:underline"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || (name === server?.name && emoji === server?.iconEmoji)}
                                className={cn(
                                    "px-8 py-2.5 rounded-[3px] text-sm font-medium transition-all",
                                    (!name.trim() || (name === server?.name && emoji === server?.iconEmoji))
                                        ? "bg-[#5D8A3C] opacity-50 cursor-not-allowed text-white"
                                        : "bg-[#5D8A3C] hover:bg-[#4A7030] text-white"
                                )}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Exit button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 w-9 h-9 border-2 border-[#b5bac1] rounded-full flex flex-col items-center justify-center text-[#b5bac1] group hover:border-white hover:text-white transition-all z-50 focus:outline-none"
                    >
                        <X className="h-5 w-5" />
                        <span className="text-[10px] font-bold mt-0.5 group-hover:scale-105 transition-transform leading-none shadow-sm">ESC</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
