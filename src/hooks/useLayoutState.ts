import { useState, useCallback, useEffect } from "react";

export type MobileScreen = "servers" | "channels" | "chat";

interface LayoutState {
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
}

const initialState: LayoutState = {
    sidebarOpen: true,
    channelSidebarOpen: false,
    memberPanelOpen: false,
};

/**
 * useLayoutState — Manages visibility of the 3 app panels.
 *
 * On mobile (≤768px): uses a page-stack navigation (servers → channels → chat).
 * On desktop: panels are inline and can all be open simultaneously.
 */
export function useLayoutState() {
    const [layout, setLayout] = useState<LayoutState>(initialState);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth <= 768 : false
    );

    // ── Mobile page navigation ──
    const [mobileScreen, setMobileScreen] = useState<MobileScreen>("servers");

    // Listen for resize to update isMobile
    useEffect(() => {
        const mql = window.matchMedia("(max-width: 768px)");
        const handler = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
            if (e.matches) {
                setLayout(initialState);
            }
        };
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    // ── Desktop panel toggles (unchanged) ──
    const toggleSidebar = useCallback(() => {
        setLayout((prev) => {
            const next = !prev.sidebarOpen;
            if (isMobile) {
                return {
                    sidebarOpen: next,
                    channelSidebarOpen: next ? false : prev.channelSidebarOpen,
                    memberPanelOpen: false,
                };
            }
            return { ...prev, sidebarOpen: next };
        });
    }, [isMobile]);

    const toggleChannelSidebar = useCallback(() => {
        setLayout((prev) => {
            const next = !prev.channelSidebarOpen;
            if (isMobile) {
                return {
                    sidebarOpen: false,
                    channelSidebarOpen: next,
                    memberPanelOpen: false,
                };
            }
            return { ...prev, channelSidebarOpen: next };
        });
    }, [isMobile]);

    const toggleMemberPanel = useCallback(() => {
        setLayout((prev) => {
            const next = !prev.memberPanelOpen;
            if (isMobile) {
                return {
                    sidebarOpen: false,
                    channelSidebarOpen: false,
                    memberPanelOpen: next,
                };
            }
            return { ...prev, memberPanelOpen: next };
        });
    }, [isMobile]);

    const openChannelSidebar = useCallback(() => {
        setLayout((prev) => {
            if (isMobile) {
                return {
                    sidebarOpen: false,
                    channelSidebarOpen: true,
                    memberPanelOpen: false,
                };
            }
            return { ...prev, channelSidebarOpen: true };
        });
    }, [isMobile]);

    const closeAllPanels = useCallback(() => {
        setLayout(initialState);
    }, []);

    // ── Mobile navigation ──
    const navigateToServers = useCallback(() => {
        setMobileScreen("servers");
    }, []);

    const navigateToChannels = useCallback(() => {
        setMobileScreen("channels");
    }, []);

    const navigateToChat = useCallback(() => {
        setMobileScreen("chat");
    }, []);

    return {
        layout,
        isMobile,
        toggleSidebar,
        toggleChannelSidebar,
        toggleMemberPanel,
        openChannelSidebar,
        closeAllPanels,
        // Mobile navigation
        mobileScreen,
        navigateToServers,
        navigateToChannels,
        navigateToChat,
    };
}
