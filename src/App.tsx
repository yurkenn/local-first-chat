import { useState, useCallback, useEffect } from "react";
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
  ChatAccount,
} from "./schema";
import { ServerSidebar } from "./components/ServerSidebar";
import { ChannelSidebar } from "./components/ChannelSidebar";
import { ChatArea } from "./components/ChatArea";
import { CreateServerModal } from "./components/CreateServerModal";
import { CreateChannelModal } from "./components/CreateChannelModal";
import { InviteModal } from "./components/InviteModal";
import { JoinServerModal } from "./components/JoinServerModal";

/**
 * App — Root component.
 * Auth is handled by PasskeyAuthBasicUI in main.tsx.
 * This component handles layout and top-level state (active server/channel).
 *
 * ⚠ All hooks MUST be called before any early return (React rules of hooks).
 */
export default function App() {
  // useAccount returns MaybeLoaded — check $isLoaded before accessing deeply
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

  // ── Modal State ──
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);

  // ── Server creation handler ──
  // NOTE: All useCallback hooks must be declared unconditionally before any early return
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
      const generalChannel = Channel.create(
        {
          name: "general",
          channelType: "text",
          messages: generalMessages,
          voiceState: generalVoiceState,
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
      setShowCreateServer(false);
    },
    [me]
  );

  // ── Channel creation handler ──
  const handleCreateChannel = useCallback(
    (name: string, type: "text" | "voice") => {
      const account = me as any;
      if (!account?.$isLoaded) return;

      // Find active server from the account's server list
      const servers = account.root?.servers;
      const serverArr = servers ? Array.from(servers).filter(Boolean) : [];
      const server = serverArr.find(
        (s: any) => s?.$jazz?.id === activeServerId
      ) as any;
      if (!server?.channels) return;

      const serverGroup = Group.create();
      serverGroup.addMember("everyone", "writer");

      const messages = MessageList.create([], { owner: serverGroup });
      const voiceState = VoiceState.create(
        { peers: VoicePeerList.create([], { owner: serverGroup }) },
        { owner: serverGroup }
      );

      const channel = Channel.create(
        {
          name,
          channelType: type,
          messages,
          voiceState,
        },
        { owner: serverGroup }
      );

      (server.channels as any).$jazz.push(channel);
      setActiveChannelId((channel as any).$jazz.id);
      setShowCreateChannel(false);
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

  // Also set inline for immediate render
  if (!activeChannel && firstChannelId && activeServerId) {
    activeChannel = channelArray[0] as any;
  }

  const profileName = account?.profile?.name || "User";

  // ── Loading gate ──
  if (!isLoaded) {
    return null;
  }

  // ── Render ──
  return (
    <>
      <div className="app-layout">
        {/* Server list bar */}
        <ServerSidebar
          servers={serverArray as any[]}
          activeServerId={activeServerId}
          onSelectServer={(id) => {
            setActiveServerId(id);
            setActiveChannelId(null);
          }}
          onCreateServer={() => setShowCreateServer(true)}
          onJoinServer={() => setShowJoinServer(true)}
        />

        {/* Channel list sidebar */}
        <ChannelSidebar
          server={activeServer}
          channels={channelArray as any[]}
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
          onCreateChannel={() => setShowCreateChannel(true)}
          onInvite={() => setShowInvite(true)}
          userName={profileName}
          onLogout={logOut}
        />

        {/* Main chat area */}
        {activeChannel ? (
          <ChatArea channel={activeChannel} userName={profileName} />
        ) : (
          <div className="chat-container">
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-title">Welcome to LocalChat</div>
              <p className="empty-state-text">
                Select a channel from the sidebar to start chatting,
                <br />
                or create a new server to begin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreateServer && (
        <CreateServerModal
          onClose={() => setShowCreateServer(false)}
          onCreate={handleCreateServer}
        />
      )}

      {showCreateChannel && activeServer && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {showInvite && activeServer && (
        <InviteModal
          server={activeServer}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showJoinServer && (
        <JoinServerModal
          onClose={() => setShowJoinServer(false)}
          onJoined={(serverId) => {
            setShowJoinServer(false);
            setActiveServerId(serverId);
            setActiveChannelId(null);
          }}
        />
      )}
    </>
  );
}
