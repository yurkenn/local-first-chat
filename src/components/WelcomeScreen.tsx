import { memo } from "react";
import { Users, Image, MessageSquare, Download, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    onClick?: () => void;
}

const ActionCard = ({ icon, iconBg, title, onClick }: ActionCardProps) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-4 p-4 rounded-lg bg-[#2b2d31] transition-all group border border-transparent shadow-sm",
            onClick
                ? "hover:bg-[#35373c] hover:border-white/5 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
        )}
    >
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0", iconBg)}>
            {icon}
        </div>
        <span className="flex-1 text-base font-semibold text-[#dbdee1] group-hover:text-white text-left">
            {title}
        </span>
        <ChevronRight className="h-5 w-5 text-[#b5bac1] group-hover:text-[#dbdee1]" />
    </button>
);

interface WelcomeScreenProps {
    serverName: string;
    onInvite?: () => void;
    onPersonalise?: () => void;
    onSendMessage?: () => void;
}

export const WelcomeScreen = memo(function WelcomeScreen({
    serverName,
    onInvite,
    onPersonalise,
    onSendMessage,
}: WelcomeScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center max-w-[480px] mx-auto py-12 px-4 animate-fade-in">
            <div className="text-center mb-10">
                <h1 className="text-[32px] font-bold text-white mb-2 leading-tight">
                    Welcome to {serverName}
                </h1>
                <p className="text-[#b5bac1] text-lg">
                    This is your brand-new, shiny server. Here are some steps to help you get started.
                </p>
            </div>

            <div className="w-full space-y-2">
                <ActionCard
                    icon={<Users className="h-6 w-6" />}
                    iconBg="bg-[#ff73fa]"
                    title="Invite your friends"
                    onClick={onInvite}
                />
                <ActionCard
                    icon={<Image className="h-6 w-6" />}
                    iconBg="bg-[#23a559]"
                    title="Personalise your server with an icon"
                    onClick={onPersonalise}
                />
                <ActionCard
                    icon={<MessageSquare className="h-6 w-6" />}
                    iconBg="bg-[#f1c40f]"
                    title="Send your first message"
                    onClick={onSendMessage}
                />
                <ActionCard
                    icon={<Download className="h-6 w-6" />}
                    iconBg="bg-[#5865f2]"
                    title="Download the App (Coming Soon!)"
                />
            </div>
        </div>
    );
});
