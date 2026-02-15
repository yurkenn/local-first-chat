import { useState, useCallback, useEffect, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useModalState } from "@/hooks/useModalState";
import { useLayoutState } from "@/hooks/useLayoutState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useVoiceState } from "@/hooks/useVoiceState";
import { useServerActions } from "@/hooks/useServerActions";
import { useLogOut } from "jazz-tools/react";
import { useAccount } from "jazz-tools/react";
import { ChatAccount } from "@/schema";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { MemberPanel } from "@/components/MemberPanel";
import { ModalLayer } from "@/components/ModalLayer";
import { DesktopLayout } from "@/components/DesktopLayout";
import { MobileLayout } from "@/components/MobileLayout";
import { OfflineBanner } from "@/components/OfflineBanner";
import {
  getCoId, isAccountLoaded,
  getProfileName, getServerArray, findServerById,
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
  const { layout, isMobile, toggleSidebar, toggleChannelSidebar, toggleMemberPanel, openChannelSidebar, mobileScreen, navigateToServers, navigateToChannels, navigateToChat } = useLayoutState();
  const { modals, openModal, closeModal } = useModalState();
  const { theme, setTheme } = useTheme();

  // ── Profile name (needed by voice state hook) ──
  const profileName = getProfileName(me);

  // ── Voice State (app-level, survives navigation) ──
  const voice = useVoiceState(profileName);

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
        onLogout={logOut}
        onUserSettings={() => openModal("userSettings")}
        onServerSettings={() => openModal("serverSettings")}
        onAudioSettings={() => openModal("audioSettings")}
        voice={voice}
        getUnreadCount={getUnreadCount}
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
    userName: profileName,
    serverSidebar: serverSidebarJsx,
    channelSidebar: channelSidebarJsx,
    memberPanel: memberPanelJsx,
  };

  return (
    <>
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
      />
    </>
  );
}
