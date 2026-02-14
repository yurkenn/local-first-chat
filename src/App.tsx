import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useModalState } from "@/hooks/useModalState";
import { useLayoutState } from "@/hooks/useLayoutState";
import { useVoiceState } from "@/hooks/useVoiceState";
import { useLogOut } from "jazz-tools/react";
import { useAccount } from "jazz-tools/react";
import { Group } from "jazz-tools";
import {
  ChatServer,
  ChannelList,
  Channel,
  MessageList,
  VoiceState,
  VoicePeerList,
  TypingState,
  TypingUserList,
  ChatAccount,
} from "@/schema";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { ChatArea } from "@/components/ChatArea";
import { MemberPanel } from "@/components/MemberPanel";
import { CreateServerModal } from "@/components/CreateServerModal";
import { CreateChannelModal } from "@/components/CreateChannelModal";
import { InviteModal } from "@/components/InviteModal";
import { JoinServerModal } from "@/components/JoinServerModal";
import { UserSettingsModal } from "@/components/UserSettingsModal";
import { ServerSettingsModal } from "@/components/ServerSettingsModal";
import { AudioSettingsModal } from "@/components/AudioSettingsModal";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App — Root component.
 * Auth is handled by PasskeyAuthBasicUI in main.tsx.
 * This component handles layout and top-level state (active server/channel).
 *
 * ⚠ All hooks MUST be called before any early return (React rules of hooks).
 */
export default function App() {
  const me = useAccount(ChatAccount, {
    resolve: {
      root: {
        servers: {
          $each: {
            channels: {
              $each: true,
            },
          },
        },
      },
    },
  });

  // ── Navigation State ──
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const logOut = useLogOut();

  // ── Layout & Modal State (custom hooks) ──
  const { layout, toggleSidebar, toggleChannelSidebar, toggleMemberPanel, openChannelSidebar } = useLayoutState();
  const { modals, openModal, closeModal } = useModalState();

  // ── Profile name (needed by voice state hook) ──
  const profileName = (me as any)?.profile?.name || "User";

  // ── Voice State (app-level, survives navigation) ──
  const voice = useVoiceState(profileName);

  // ── Server creation handler ──
  const handleCreateServer = useCallback(
    (name: string, emoji: string) => {
      const account = me as any;
      if (!account?.root?.servers) return;

      const serverGroup = Group.create();
      serverGroup.addMember("everyone", "writer");

      const generalMessages = MessageList.create([], { owner: serverGroup });
      const generalVoiceState = VoiceState.create(
        { peers: VoicePeerList.create([], { owner: serverGroup }) },
        { owner: serverGroup }
      );
      const generalTypingState = TypingState.create(
        { typingUsers: TypingUserList.create([], { owner: serverGroup }) },
        { owner: serverGroup }
      );
      const generalChannel = Channel.create(
        {
          name: "general",
          channelType: "text",
          messages: generalMessages,
          voiceState: generalVoiceState,
          typingState: generalTypingState,
        },
        { owner: serverGroup }
      );

      const channelList = ChannelList.create([generalChannel], {
        owner: serverGroup,
      });

      const server = ChatServer.create(
        {
          name,
          iconEmoji: emoji,
          channels: channelList,
        },
        { owner: serverGroup }
      );

      (account.root.servers as any).$jazz.push(server);

      setActiveServerId((server as any).$jazz.id);
      setActiveChannelId((generalChannel as any).$jazz.id);
      closeModal("createServer");
      toast.success(`Server "${name}" created`);
    },
    [me]
  );

  // ── Channel creation handler ──
  const handleCreateChannel = useCallback(
    (name: string, type: "text" | "voice") => {
      const account = me as any;
      if (!account?.$isLoaded) return;

      const servers = account.root?.servers;
      const serverArr = servers ? Array.from(servers).filter(Boolean) : [];
      const server = serverArr.find(
        (s: any) => s?.$jazz?.id === activeServerId
      ) as any;
      if (!server?.channels) return;

      const serverGroup = (server as any)._owner;

      const messages = MessageList.create([], { owner: serverGroup });
      const voiceState = VoiceState.create(
        { peers: VoicePeerList.create([], { owner: serverGroup }) },
        { owner: serverGroup }
      );
      const typingState = TypingState.create(
        { typingUsers: TypingUserList.create([], { owner: serverGroup }) },
        { owner: serverGroup }
      );

      const channel = Channel.create(
        {
          name,
          channelType: type,
          messages,
          voiceState,
          typingState,
        },
        { owner: serverGroup }
      );

      (server.channels as any).$jazz.push(channel);
      setActiveChannelId((channel as any).$jazz.id);
      closeModal("createChannel");
      toast.success(`Channel "#${name}" created`);
    },
    [me, activeServerId]
  );

  // ── Resolve active server & channel from loaded data ──
  const isLoaded = me && (me as any).$isLoaded;
  const account = isLoaded ? (me as any) : null;
  const servers = account?.root?.servers;
  const serverArray = servers ? Array.from(servers).filter(Boolean) : [];

  const activeServer =
    serverArray.find((s: any) => s?.$jazz?.id === activeServerId) || null;

  const channels = (activeServer as any)?.channels;
  const channelArray = channels ? Array.from(channels).filter(Boolean) : [];

  let activeChannel =
    channelArray.find((c: any) => c?.$jazz?.id === activeChannelId) || null;

  // ── Auto-select first channel if none is active ──
  const firstChannelId = channelArray.length > 0 ? (channelArray[0] as any)?.$jazz?.id : null;
  useEffect(() => {
    if (activeServerId && !activeChannelId && firstChannelId) {
      setActiveChannelId(firstChannelId);
    }
  }, [activeServerId, activeChannelId, firstChannelId]);

  if (!activeChannel && firstChannelId && activeServerId) {
    activeChannel = channelArray[0] as any;
  }


  // ── Loading gate ──
  if (!isLoaded) return null;




  return (
    <>
      <div className="grid h-screen w-screen overflow-hidden transition-all duration-300"
        style={{
          gridTemplateColumns: `${layout.sidebarOpen ? "56px" : "0px"} ${layout.channelSidebarOpen ? "240px" : "0px"} 1fr ${layout.memberPanelOpen ? "240px" : "0px"}`,
        }}
      >
        {/* Server list bar */}
        <ServerSidebar
          servers={serverArray as any[]}
          activeServerId={activeServerId}
          onSelectServer={(id) => {
            setActiveServerId(id);
            setActiveChannelId(null);
            openChannelSidebar();
          }}
          onCreateServer={() => openModal("createServer")}
          onJoinServer={() => openModal("joinServer")}
        />

        {/* Channel list sidebar */}
        <ChannelSidebar
          server={activeServer}
          channels={channelArray as any[]}
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
          onCreateChannel={() => openModal("createChannel")}
          onInvite={() => openModal("invite")}
          userName={profileName}
          onLogout={logOut}
          onUserSettings={() => openModal("userSettings")}
          onServerSettings={() => openModal("serverSettings")}
          onAudioSettings={() => openModal("audioSettings")}
          voice={voice}
        />

        {/* Main chat area */}
        {activeChannel ? (
          <ChatArea
            channel={activeChannel}
            userName={profileName}
            sidebarOpen={layout.sidebarOpen}
            channelSidebarOpen={layout.channelSidebarOpen}
            memberPanelOpen={layout.memberPanelOpen}
            onToggleSidebar={toggleSidebar}
            onToggleChannelSidebar={toggleChannelSidebar}
            onToggleMemberPanel={toggleMemberPanel}
          />
        ) : (
          <div className="flex flex-col min-w-0">
            {/* Navigation header even in empty state */}
            <div className="flex items-center h-12 px-3 gap-2 glass-strong border-b border-[var(--glass-border)]">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]", layout.sidebarOpen && "text-[var(--neon-violet)]")}
                onClick={toggleSidebar}
                aria-label="Toggle servers"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                <div className="neon-dot" style={{ width: 6, height: 6 }} />
                E2EE
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="text-6xl drop-shadow-[0_0_24px_rgba(168,85,247,0.3)]">🪷</div>
                <h1 className="text-3xl font-heading font-bold text-gradient">Lotus</h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center leading-relaxed">
                  Select a channel to start chatting,
                  <br />
                  or create a new server.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Member Panel (right sidebar) */}
        <MemberPanel server={activeServer} userName={profileName} />
      </div>

      {/* ── Modals ── */}
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
          onJoined={(serverId) => {
            closeModal("joinServer");
            setActiveServerId(serverId);
            setActiveChannelId(null);
          }}
        />
      )}

      {modals.userSettings && (
        <UserSettingsModal
          onClose={() => closeModal("userSettings")}
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
            const account = me as any;
            const servers = account?.root?.servers;
            const serverName = (activeServer as any)?.name || "Server";
            if (servers) {
              const idx = Array.from(servers).findIndex(
                (s: any) => s?.$jazz?.id === activeServerId
              );
              if (idx >= 0) {
                servers[idx] = null;
              }
            }
            setActiveServerId(null);
            setActiveChannelId(null);
            toast.success(`"${serverName}" deleted`);
          }}
        />
      )}
    </>
  );
}
