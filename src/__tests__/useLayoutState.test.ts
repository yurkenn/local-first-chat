/**
 * useLayoutState.test.ts — Tests for the layout state management hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayoutState } from "@/hooks/useLayoutState";

// Mock window.matchMedia for controlling mobile/desktop behavior
function createMatchMedia(matches: boolean) {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    return vi.fn().mockImplementation((_query: string) => ({
        matches,
        media: _query,
        onchange: null,
        addEventListener: vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
            listeners.push(listener);
        }),
        removeEventListener: vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
        }),
        dispatchChange: (newMatches: boolean) => {
            listeners.forEach(l => l({ matches: newMatches } as MediaQueryListEvent));
        },
    }));
}

describe("useLayoutState", () => {
    beforeEach(() => {
        // Default: desktop mode
        Object.defineProperty(window, "innerWidth", {
            writable: true,
            configurable: true,
            value: 1024,
        });
        window.matchMedia = createMatchMedia(false);
    });

    it("initializes with sidebar open, others closed", () => {
        const { result } = renderHook(() => useLayoutState());

        expect(result.current.layout.sidebarOpen).toBe(true);
        expect(result.current.layout.channelSidebarOpen).toBe(false);
        expect(result.current.layout.memberPanelOpen).toBe(false);
    });

    it("detects desktop mode when window is wide", () => {
        const { result } = renderHook(() => useLayoutState());
        expect(result.current.isMobile).toBe(false);
    });

    it("detects mobile mode when window is narrow", () => {
        Object.defineProperty(window, "innerWidth", { value: 375 });
        window.matchMedia = createMatchMedia(true);

        const { result } = renderHook(() => useLayoutState());
        expect(result.current.isMobile).toBe(true);
    });

    // Desktop behavior
    describe("desktop mode", () => {
        it("toggles sidebar independently", () => {
            const { result } = renderHook(() => useLayoutState());

            // Starts as true, toggle to false
            act(() => result.current.toggleSidebar());
            expect(result.current.layout.sidebarOpen).toBe(false);

            // Toggle back to true
            act(() => result.current.toggleSidebar());
            expect(result.current.layout.sidebarOpen).toBe(true);
        });

        it("toggles channel sidebar independently", () => {
            const { result } = renderHook(() => useLayoutState());

            act(() => result.current.toggleChannelSidebar());
            expect(result.current.layout.channelSidebarOpen).toBe(true);
        });

        it("toggles member panel independently", () => {
            const { result } = renderHook(() => useLayoutState());

            act(() => result.current.toggleMemberPanel());
            expect(result.current.layout.memberPanelOpen).toBe(true);
        });

        it("allows multiple panels open simultaneously", () => {
            const { result } = renderHook(() => useLayoutState());

            // sidebar starts true; toggle channel + member open
            act(() => {
                result.current.toggleChannelSidebar();
                result.current.toggleMemberPanel();
            });

            expect(result.current.layout.sidebarOpen).toBe(true);
            expect(result.current.layout.channelSidebarOpen).toBe(true);
            expect(result.current.layout.memberPanelOpen).toBe(true);
        });
    });

    // Utility functions
    it("openChannelSidebar forces channel sidebar open", () => {
        const { result } = renderHook(() => useLayoutState());

        act(() => result.current.openChannelSidebar());
        expect(result.current.layout.channelSidebarOpen).toBe(true);
    });

    it("closeAllPanels resets to initial state", () => {
        const { result } = renderHook(() => useLayoutState());

        // Open all panels
        act(() => {
            result.current.toggleChannelSidebar();
            result.current.toggleMemberPanel();
        });

        act(() => result.current.closeAllPanels());

        // Resets to initialState: sidebarOpen=true, rest=false
        expect(result.current.layout.sidebarOpen).toBe(true);
        expect(result.current.layout.channelSidebarOpen).toBe(false);
        expect(result.current.layout.memberPanelOpen).toBe(false);
    });
});
