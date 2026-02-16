import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useModalState } from "@/hooks/useModalState";
import { useLayoutState } from "@/hooks/useLayoutState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useVoiceState } from "@/hooks/useVoiceState";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { useServerActions } from "@/hooks/useServerActions";
import { useAcceptInvite } from "jazz-tools/react";
import { useAccount } from "jazz-tools/react";
import { ChatAccount, ChatServer } from "@/schema";
import { coPush, getCoId, getServerArray } from "@/lib/jazz-helpers";
import { InviteAcceptModal } from "@/components/InviteAcceptModal";
import type { PendingInvite } from "@/components/InviteAcceptModal";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { MemberPanel } from "@/components/MemberPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModalLayer } from "@/components/ModalLayer";
import { DesktopLayout } from "@/components/DesktopLayout";
import { MobileLayout } from "@/components/MobileLayout";
import { OfflineBanner } from "@/components/OfflineBanner";
import {
  isAccountLoaded,
  getProfileName, findServerById,
  getChannelArray, findChannelById, closeAllModals,
} from "@/lib/jazz-helpers";

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
              $each: {
                voiceState: {
                  peers: { $each: true },
                },
              },
            },
          },
        },
      },
    },
  });

  // ── Navigation State ──
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);


  // ── Pending invite (sessionStorage-backed to survive re-renders) ──
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(() => {
    try {
      const stored = sessionStorage.getItem("pendingInvite");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingServerRef = useRef<any>(null);

  // ── Auto-accept invite links from URL hash ──
  useAcceptInvite({
    invitedObjectSchema: ChatServer,
    forValueHint: "server",
    onAccept: useCallback(async (serverId: string) => {
      console.log("[App] 🎉 Invite accepted! Server ID:", serverId);
      // Store in sessionStorage so it survives re-renders/remounts
      sessionStorage.setItem("pendingInviteServerId", serverId);
      toast.info("Loading server info...");
    }, []),
  });

  // ── Load pending invite from sessionStorage ──
  useEffect(() => {
    const serverId = sessionStorage.getItem("pendingInviteServerId");
    if (!serverId || !me || !isAccountLoaded(me)) return;

    // Clear immediately to prevent re-triggering
    sessionStorage.removeItem("pendingInviteServerId");
    console.log("[App] Loading pending invite server:", serverId);

    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let server = await (ChatServer as any).load(serverId, {
          resolve: { channels: { $each: true } },
        });

        if (!server) {
          await new Promise((r) => setTimeout(r, 2000));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          server = await (ChatServer as any).load(serverId, {
            resolve: { channels: { $each: true } },
          });
        }

        if (!server) {
          toast.error("Could not load server.");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serverAny = server as any;
        console.log("[App] ✅ Server loaded for modal:", serverAny?.name);

        pendingServerRef.current = server;
        const invite: PendingInvite = {
          serverId,
          serverName: serverAny?.name || "Unknown Server",
          serverIcon: serverAny?.iconUrl || "",
        };
        sessionStorage.setItem("pendingInvite", JSON.stringify(invite));
        setPendingInvite(invite);
      } catch (err) {
        console.error("[App] ❌ Invite load error:", err);
        toast.error("Failed to load server.");
      }
    })();
  }, [me]);

  // ── Handle invite accept/decline ──
  const handleInviteAccept = useCallback(() => {
    const server = pendingServerRef.current;
    const invite = pendingInvite;
    if (!invite || !me) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meAny = me as any;
    const serverList = meAny?.root?.servers;
    if (serverList && server) {
      const existingServers = getServerArray(me);
      const alreadyJoined = existingServers.some((s) => getCoId(s) === invite.serverId);
      if (!alreadyJoined) {
        coPush(serverList, server);
      }
    }

    setActiveServerId(invite.serverId);
    setActiveChannelId(null);
    toast.success(`Joined "${invite.serverName}" 🎉`);
    setPendingInvite(null);
    pendingServerRef.current = null;
    sessionStorage.removeItem("pendingInvite");
  }, [me, pendingInvite]);

  const handleInviteDecline = useCallback(() => {
    setPendingInvite(null);
    pendingServerRef.current = null;
    sessionStorage.removeItem("pendingInvite");
    toast.info("Invite declined.");
  }, []);

  // ── Layout & Modal State (custom hooks) ──
  const { layout, isMobile, toggleSidebar, toggleChannelSidebar, toggleMemberPanel, openChannelSidebar, mobileScreen, navigateToServers, navigateToChannels, navigateToChat } = useLayoutState();
  const { modals, openModal, closeModal } = useModalState();
  const { theme, setTheme } = useTheme();

  // ── Profile name (needed by voice state hook) ──
  const profileName = getProfileName(me);

  // ── Voice State (app-level, survives navigation) ──
  const audio = useAudioSettings();
  const voice = useVoiceState(profileName, getCoId(me) || "", audio);

  // ── Server & Channel CRUD (extracted hook) ──
  const { createServer, createChannel } = useServerActions({
    me,
    activeServerId,
    setActiveServerId,
    setActiveChannelId,
    closeModal,
  });

  // ── Resolve active server & channel from loaded data ──
  const loaded = isAccountLoaded(me);
  const serverArray = useMemo(() => loaded ? getServerArray(me) : [], [loaded, me]);
  const activeServer = useMemo(() => findServerById(serverArray, activeServerId), [serverArray, activeServerId]);
  const channelArray = useMemo(() => getChannelArray(activeServer), [activeServer]);

  let activeChannel = useMemo(() => findChannelById(channelArray, activeChannelId), [channelArray, activeChannelId]);

  // ── Auto-select first channel if none is active ──
  const firstChannelId = channelArray.length > 0 ? getCoId(channelArray[0]) ?? null : null;
  useEffect(() => {
    if (activeServerId && !activeChannelId && firstChannelId) {
      setActiveChannelId(firstChannelId);
    }
  }, [activeServerId, activeChannelId, firstChannelId]);

  if (!activeChannel && firstChannelId && activeServerId) {
    activeChannel = channelArray[0] ?? null;
  }

  // ── Notification / Unread Tracking ──
  const notificationChannels = useMemo(() => {
    if (!loaded) return [];
    return channelArray.map((c) => ({
      id: getCoId(c) || '',
      name: c?.name || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: c?.messages ? Array.from(c.messages as any).filter(Boolean) : [],
      channelType: c?.channelType || 'text',
    }));
  }, [loaded, channelArray]);

  const { getUnreadCount, totalUnread } = useNotifications({
    channels: notificationChannels,
    activeChannelId,
    userName: profileName,
  });

  // Update document title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Lotus` : 'Lotus';
  }, [totalUnread]);

  // ── Keyboard Shortcuts ──
  const isAnyModalOpen = Object.values(modals).some(Boolean);

  const navigateChannel = useCallback((direction: 'prev' | 'next') => {
    if (channelArray.length === 0) return;
    const currentIndex = channelArray.findIndex((c) => getCoId(c) === activeChannelId);
    const nextIndex = direction === 'next'
      ? Math.min(currentIndex + 1, channelArray.length - 1)
      : Math.max(currentIndex - 1, 0);
    const nextChannel = channelArray[nextIndex];
    const nextId = getCoId(nextChannel);
    if (nextId) {
      setActiveChannelId(nextId);
    }
  }, [channelArray, activeChannelId]);

  useKeyboardShortcuts({
    onToggleMute: voice.toggleMute,
    onLeaveVoice: voice.leaveVoice,
    onOpenSearch: () => openModal("search"),
    onCloseModal: () => {
      // Close any open modal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      closeAllModals(modals as any, closeModal as any);
    },
    onPrevChannel: () => navigateChannel('prev'),
    onNextChannel: () => navigateChannel('next'),
    isModalOpen: isAnyModalOpen,
    isVoiceConnected: voice.isConnected,
  });

  // ── Loading gate ──
  if (!loaded) return null;


  // ── Shared sidebar props ──
  const serverSidebarJsx = (
    <ErrorBoundary section="ServerSidebar">
      <ServerSidebar
        servers={serverArray}
        activeServerId={activeServerId}
        onSelectServer={(id) => {
          setActiveServerId(id);
          setActiveChannelId(null);
          if (isMobile) {
            navigateToChannels();
          } else {
            openChannelSidebar();
          }
        }}
        onCreateServer={() => openModal("createServer")}
        onJoinServer={() => openModal("joinServer")}
      />
    </ErrorBoundary>
  );

  const channelSidebarJsx = (
    <ErrorBoundary section="ChannelSidebar">
      <ChannelSidebar
        server={activeServer}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channels={channelArray as any[]}
        activeChannelId={activeChannelId}
        onSelectChannel={(id) => {
          setActiveChannelId(id);
          if (isMobile) navigateToChat();
        }}
        onCreateChannel={() => openModal("createChannel")}
        onInvite={() => openModal("invite")}
        userName={profileName}
        onUserSettings={() => openModal("userSettings")}
        onServerSettings={() => openModal("serverSettings")}
        onAudioSettings={() => openModal("audioSettings")}
        voice={voice}
        getUnreadCount={getUnreadCount}
        audio={audio}
      />
    </ErrorBoundary>
  );

  const memberPanelJsx = (
    <ErrorBoundary section="MemberPanel">
      <MemberPanel server={activeServer} userName={profileName} />
    </ErrorBoundary>
  );

  const layoutProps = {
    sidebarOpen: layout.sidebarOpen,
    channelSidebarOpen: layout.channelSidebarOpen,
    memberPanelOpen: layout.memberPanelOpen,
    onToggleSidebar: toggleSidebar,
    onToggleChannelSidebar: toggleChannelSidebar,
    onToggleMemberPanel: toggleMemberPanel,
    activeChannel,
    serverName: activeServer?.name || "Server",
    userName: profileName,
    serverSidebar: serverSidebarJsx,
    channelSidebar: channelSidebarJsx,
    memberPanel: memberPanelJsx,
    onSearch: () => openModal("search"),
  };

  return (
    <TooltipProvider>
      <OfflineBanner />

      {isMobile ? (
        <MobileLayout
          mobileScreen={mobileScreen}
          onNavigateToServers={navigateToServers}
          onNavigateToChannels={navigateToChannels}
          onNavigateToChat={navigateToChat}
          memberPanelOpen={layout.memberPanelOpen}
          onToggleMemberPanel={toggleMemberPanel}
          activeChannel={activeChannel}
          activeServer={activeServer}
          userName={profileName}
          servers={serverArray.map((s) => ({ id: s.$jazz.id, name: s.name ?? 'Unnamed', iconEmoji: s.iconEmoji ?? undefined }))}
          activeServerId={activeServerId}
          onSelectServer={(id) => {
            setActiveServerId(id);
            setActiveChannelId(null);
            if (isMobile) {
              navigateToChannels();
            } else {
              openChannelSidebar();
            }
          }}
          onCreateServer={() => openModal("createServer")}
          onJoinServer={() => openModal("joinServer")}
          channelSidebar={channelSidebarJsx}
          memberPanel={memberPanelJsx}
          sidebarOpen={layout.sidebarOpen}
          channelSidebarOpen={layout.channelSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onToggleChannelSidebar={toggleChannelSidebar}
        />
      ) : (
        <DesktopLayout {...layoutProps} />
      )}

      {/* ── Invite Accept Confirmation ── */}
      {pendingInvite && (
        <InviteAcceptModal
          invite={pendingInvite}
          onAccept={handleInviteAccept}
          onDecline={handleInviteDecline}
        />
      )}

      {/* ── Modals ── */}
      <ModalLayer
        modals={modals}
        closeModal={closeModal}
        activeServer={activeServer}
        activeServerId={activeServerId}
        setActiveServerId={setActiveServerId}
        setActiveChannelId={setActiveChannelId}
        serverArray={serverArray}
        theme={theme}
        setTheme={setTheme}
        handleCreateServer={createServer}
        handleCreateChannel={createChannel}
        me={me as any}
        audio={audio}
      />
    </TooltipProvider>
  );
}
