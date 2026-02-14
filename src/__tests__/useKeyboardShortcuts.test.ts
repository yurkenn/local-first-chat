/**
 * useKeyboardShortcuts.test.ts — Tests for global keyboard shortcut handler.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function fireKeyDown(opts: Partial<KeyboardEventInit> & { key: string }) {
    const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ...opts,
    });
    document.dispatchEvent(event);
    return event;
}

describe("useKeyboardShortcuts", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("calls onCloseModal on Escape when modal is open", () => {
        const onCloseModal = vi.fn();
        renderHook(() =>
            useKeyboardShortcuts({
                onCloseModal,
                isModalOpen: true,
            })
        );

        fireKeyDown({ key: "Escape" });
        expect(onCloseModal).toHaveBeenCalledOnce();
    });

    it("does NOT call onLeaveVoice on Escape when modal is open", () => {
        const onCloseModal = vi.fn();
        const onLeaveVoice = vi.fn();
        renderHook(() =>
            useKeyboardShortcuts({
                onCloseModal,
                onLeaveVoice,
                isModalOpen: true,
                isVoiceConnected: true,
            })
        );

        fireKeyDown({ key: "Escape" });
        expect(onCloseModal).toHaveBeenCalledOnce();
        expect(onLeaveVoice).not.toHaveBeenCalled();
    });

    it("calls onLeaveVoice on Escape when no modal is open but voice is connected", () => {
        const onLeaveVoice = vi.fn();
        renderHook(() =>
            useKeyboardShortcuts({
                onLeaveVoice,
                isModalOpen: false,
                isVoiceConnected: true,
            })
        );

        fireKeyDown({ key: "Escape" });
        expect(onLeaveVoice).toHaveBeenCalledOnce();
    });

    it("calls onOpenSearch on Ctrl+K", () => {
        const onOpenSearch = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onOpenSearch }));

        fireKeyDown({ key: "k", ctrlKey: true });
        expect(onOpenSearch).toHaveBeenCalledOnce();
    });

    it("calls onOpenSearch on Cmd+K", () => {
        const onOpenSearch = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onOpenSearch }));

        fireKeyDown({ key: "k", metaKey: true });
        expect(onOpenSearch).toHaveBeenCalledOnce();
    });

    it("calls onToggleMute on Ctrl+Shift+M when voice connected", () => {
        const onToggleMute = vi.fn();
        renderHook(() =>
            useKeyboardShortcuts({
                onToggleMute,
                isVoiceConnected: true,
            })
        );

        fireKeyDown({ key: "m", ctrlKey: true, shiftKey: true });
        expect(onToggleMute).toHaveBeenCalledOnce();
    });

    it("does NOT call onToggleMute when voice is NOT connected", () => {
        const onToggleMute = vi.fn();
        renderHook(() =>
            useKeyboardShortcuts({
                onToggleMute,
                isVoiceConnected: false,
            })
        );

        fireKeyDown({ key: "m", ctrlKey: true, shiftKey: true });
        expect(onToggleMute).not.toHaveBeenCalled();
    });

    it("calls onPrevChannel on Alt+ArrowUp", () => {
        const onPrevChannel = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onPrevChannel }));

        fireKeyDown({ key: "ArrowUp", altKey: true });
        expect(onPrevChannel).toHaveBeenCalledOnce();
    });

    it("calls onNextChannel on Alt+ArrowDown", () => {
        const onNextChannel = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onNextChannel }));

        fireKeyDown({ key: "ArrowDown", altKey: true });
        expect(onNextChannel).toHaveBeenCalledOnce();
    });

    it("does nothing for unregistered key combos", () => {
        const actions = {
            onCloseModal: vi.fn(),
            onLeaveVoice: vi.fn(),
            onOpenSearch: vi.fn(),
            onToggleMute: vi.fn(),
            onPrevChannel: vi.fn(),
            onNextChannel: vi.fn(),
        };
        renderHook(() => useKeyboardShortcuts(actions));

        fireKeyDown({ key: "a" });
        fireKeyDown({ key: "Enter" });

        Object.values(actions).forEach((fn) => {
            expect(fn).not.toHaveBeenCalled();
        });
    });

    it("cleans up event listener on unmount", () => {
        const spy = vi.spyOn(document, "removeEventListener");
        const { unmount } = renderHook(() => useKeyboardShortcuts({}));

        unmount();
        expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
});
