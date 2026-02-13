import { useState, useCallback } from "react";

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
 * Replaces 3 separate useState calls + 3 toggle callbacks in App.tsx.
 */
export function useLayoutState() {
    const [layout, setLayout] = useState<LayoutState>(initialState);

    const toggleSidebar = useCallback(() => {
        setLayout((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    }, []);

    const toggleChannelSidebar = useCallback(() => {
        setLayout((prev) => ({
            ...prev,
            channelSidebarOpen: !prev.channelSidebarOpen,
        }));
    }, []);

    const toggleMemberPanel = useCallback(() => {
        setLayout((prev) => ({
            ...prev,
            memberPanelOpen: !prev.memberPanelOpen,
        }));
    }, []);

    const openChannelSidebar = useCallback(() => {
        setLayout((prev) => ({ ...prev, channelSidebarOpen: true }));
    }, []);

    return {
        layout,
        toggleSidebar,
        toggleChannelSidebar,
        toggleMemberPanel,
        openChannelSidebar,
    };
}
