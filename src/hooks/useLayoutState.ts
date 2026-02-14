import { useState, useCallback, useEffect } from "react";

interface LayoutState {
    sidebarOpen: boolean;
    channelSidebarOpen: boolean;
    memberPanelOpen: boolean;
}

const initialState: LayoutState = {
    sidebarOpen: false,
    channelSidebarOpen: false,
    memberPanelOpen: false,
};

/**
 * useLayoutState — Manages visibility of the 3 app panels.
 *
 * On mobile (≤768px): panels become overlays, only one can be open at a time.
 * On desktop: panels are inline and can all be open simultaneously.
 */
export function useLayoutState() {
    const [layout, setLayout] = useState<LayoutState>(initialState);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth <= 768 : false
    );

    // Listen for resize to update isMobile
    useEffect(() => {
        const mql = window.matchMedia("(max-width: 768px)");
        const handler = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
            // Close all panels when switching to mobile to avoid visual glitches
            if (e.matches) {
                setLayout(initialState);
            }
        };
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    const toggleSidebar = useCallback(() => {
        setLayout((prev) => {
            const next = !prev.sidebarOpen;
            if (isMobile) {
                // On mobile: close others when opening this
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

    return {
        layout,
        isMobile,
        toggleSidebar,
        toggleChannelSidebar,
        toggleMemberPanel,
        openChannelSidebar,
        closeAllPanels,
    };
}
