import { Suspense, lazy } from "react";
import type { Theme } from "@/hooks/useTheme";
import type { ModalName } from "@/hooks/useModalState";

// Lazy-loaded modals (named exports → default for React.lazy)
const CreateServerModal = lazy(() => import("@/components/CreateServerModal").then(m => ({ default: m.CreateServerModal })));
const CreateChannelModal = lazy(() => import("@/components/CreateChannelModal").then(m => ({ default: m.CreateChannelModal })));
const InviteModal = lazy(() => import("@/components/InviteModal").then(m => ({ default: m.InviteModal })));
const JoinServerModal = lazy(() => import("@/components/JoinServerModal").then(m => ({ default: m.JoinServerModal })));
const UserSettingsModal = lazy(() => import("@/components/UserSettingsModal").then(m => ({ default: m.UserSettingsModal })));
const AudioSettingsModal = lazy(() => import("@/components/AudioSettingsModal").then(m => ({ default: m.AudioSettingsModal })));
const ServerSettingsModal = lazy(() => import("@/components/ServerSettingsModal").then(m => ({ default: m.ServerSettingsModal })));
const SearchModal = lazy(() => import("@/components/SearchModal").then(m => ({ default: m.SearchModal })));

export interface ModalLayerProps {
    modals: Record<string, boolean>;
    closeModal: (name: ModalName) => void;
    activeServer: any;
    activeServerId: string | null;
    setActiveServerId: (id: string | null) => void;
    setActiveChannelId: (id: string | null) => void;
    serverArray: any[];
    theme: Theme;
    setTheme: (t: Theme) => void;
    handleCreateServer: (name: string, emoji: string) => void;
    handleCreateChannel: (name: string, type: "text" | "voice") => void;
    me: any;
}

/**
 * ModalLayer — renders all app modals in a Suspense boundary.
 * Extracted from App.tsx to reduce its size and improve readability.
 */
export function ModalLayer({
    modals,
    closeModal,
    activeServer,
    activeServerId,
    setActiveServerId,
    setActiveChannelId,
    serverArray,
    theme,
    setTheme,
    handleCreateServer,
    handleCreateChannel,
    me,
}: ModalLayerProps) {
    return (
        <Suspense fallback={null}>
            {modals.createServer && (
                <CreateServerModal
                    onClose={() => closeModal("createServer")}
                    onCreate={handleCreateServer}
                />
            )}

            {modals.createChannel && activeServer && (
                <CreateChannelModal
                    onClose={() => closeModal("createChannel")}
                    onCreate={handleCreateChannel}
                />
            )}

            {modals.invite && activeServer && (
                <InviteModal
                    server={activeServer}
                    onClose={() => closeModal("invite")}
                />
            )}

            {modals.joinServer && (
                <JoinServerModal
                    onClose={() => closeModal("joinServer")}
                    onJoined={(serverId: string) => {
                        closeModal("joinServer");
                        setActiveServerId(serverId);
                        setActiveChannelId(null);
                    }}
                />
            )}

            {modals.userSettings && (
                <UserSettingsModal
                    onClose={() => closeModal("userSettings")}
                    theme={theme}
                    onThemeChange={setTheme}
                />
            )}

            {modals.audioSettings && (
                <AudioSettingsModal
                    onClose={() => closeModal("audioSettings")}
                />
            )}

            {modals.serverSettings && activeServer && (
                <ServerSettingsModal
                    server={activeServer}
                    onClose={() => closeModal("serverSettings")}
                    onDeleteServer={() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const account = me as any;
                        const servers = account?.root?.servers;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const serverName = (activeServer as any)?.name || "Server";
                        if (servers) {
                            const idx = Array.from(servers).findIndex(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (s: any) => (s as any)?.$jazz?.id === activeServerId
                            );
                            if (idx >= 0) {
                                servers[idx] = null;
                            }
                        }
                        setActiveServerId(null);
                        setActiveChannelId(null);
                        // Note: toast is imported in the component that uses it
                        import("sonner").then(({ toast }) => toast.success(`"${serverName}" deleted`));
                    }}
                />
            )}

            {modals.search && (
                <SearchModal
                    isOpen={true}
                    onClose={() => closeModal("search")}
                    servers={serverArray as any[]}  // eslint-disable-line @typescript-eslint/no-explicit-any
                    onNavigate={(channelId: string) => {
                        setActiveChannelId(channelId);
                        closeModal("search");
                    }}
                />
            )}
        </Suspense>
    );
}
