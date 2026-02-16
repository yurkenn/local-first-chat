import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Hash, Volume2, Lock, X } from "lucide-react";
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
            <DialogContent className="bg-[#313338] border-none text-[#dbdee1] sm:max-w-[460px] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-4 pt-5 relative">
                    <DialogTitle className="text-xl font-bold text-white text-left">Create Channel</DialogTitle>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-5 text-[#b5bac1] hover:text-[#dbdee1] transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </DialogHeader>

                <div className="px-4 pb-4 space-y-6">
                    {/* Channel type selector */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">
                            Channel Type
                        </label>
                        <div className="space-y-2">
                            {/* Text Channel Option */}
                            <button
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-[4px] transition-colors group text-left",
                                    type === "text"
                                        ? "bg-[#3f4147]"
                                        : "bg-[#2b2d31] hover:bg-[#35373c]"
                                )}
                                onClick={() => setType("text")}
                                type="button"
                            >
                                <Hash className="h-6 w-6 text-[#80848e] shrink-0" />
                                <div className="flex-1">
                                    <div className="text-base font-medium text-white">Text</div>
                                    <div className="text-[12px] text-[#b5bac1]">Send messages, images, GIFs, emoji, opinions and puns</div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    type === "text"
                                        ? "border-[#E8789A] bg-[#E8789A]"
                                        : "border-[#b5bac1] group-hover:border-[#dbdee1]"
                                )}>
                                    {type === "text" && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>
                            </button>

                            {/* Voice Channel Option */}
                            <button
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-[4px] transition-colors group text-left",
                                    type === "voice"
                                        ? "bg-[#3f4147]"
                                        : "bg-[#2b2d31] hover:bg-[#35373c]"
                                )}
                                onClick={() => setType("voice")}
                                type="button"
                            >
                                <Volume2 className="h-6 w-6 text-[#80848e] shrink-0" />
                                <div className="flex-1">
                                    <div className="text-base font-medium text-white">Voice</div>
                                    <div className="text-[12px] text-[#b5bac1]">Hang out together with voice, video and screen share</div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    type === "voice"
                                        ? "border-[#E8789A] bg-[#E8789A]"
                                        : "border-[#b5bac1] group-hover:border-[#dbdee1]"
                                )}>
                                    {type === "voice" && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Channel Name */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-[#b5bac1]">
                            Channel Name
                        </label>
                        <div className="relative">
                            {type === "text" && (
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#80848e]" />
                            )}
                            <input
                                type="text"
                                placeholder="new-channel"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                autoFocus
                                maxLength={30}
                                className={cn(
                                    "w-full bg-[#1e1f22] text-[#dbdee1] border-none rounded-[3px] py-2 px-3 text-sm focus:outline-none placeholder-[#80848e]",
                                    type === "text" && "pl-8"
                                )}
                            />
                        </div>
                    </div>

                    {/* Private Channel Toggle */}
                    <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-[#b5bac1]" />
                            <span className="text-base font-medium text-white">Private Channel</span>
                        </div>
                        <div
                            className="w-10 h-[22px] rounded-full bg-[#72767d] relative cursor-not-allowed opacity-50"
                            title="Coming soon"
                        >
                            <div className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                        </div>
                    </div>
                    <p className="text-[12px] text-[#b5bac1] -mt-1">
                        Only selected members and roles will be able to view this channel.
                    </p>
                </div>

                <DialogFooter className="bg-[#2b2d31] p-4 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="text-sm font-medium text-white hover:underline px-4 py-2 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        className={cn(
                            "px-7 py-2.5 rounded-[3px] text-sm font-medium transition-all",
                            !name.trim()
                                ? "bg-[#E8789A] opacity-50 cursor-not-allowed text-white"
                                : "bg-[#E8789A] hover:bg-[#C4566F] text-white"
                        )}
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Create Channel
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
