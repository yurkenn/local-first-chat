/**
 * useModalState.test.ts — Tests for the modal state management hook.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalState, type ModalName } from "@/hooks/useModalState";

describe("useModalState", () => {
    it("initializes all modals as closed", () => {
        const { result } = renderHook(() => useModalState());
        const { modals } = result.current;

        expect(modals.createServer).toBe(false);
        expect(modals.createChannel).toBe(false);
        expect(modals.invite).toBe(false);
        expect(modals.joinServer).toBe(false);
        expect(modals.userSettings).toBe(false);
        expect(modals.serverSettings).toBe(false);
        expect(modals.audioSettings).toBe(false);
        expect(modals.search).toBe(false);
    });

    it("opens a specific modal", () => {
        const { result } = renderHook(() => useModalState());

        act(() => {
            result.current.openModal("createServer");
        });

        expect(result.current.modals.createServer).toBe(true);
        // Others remain closed
        expect(result.current.modals.createChannel).toBe(false);
        expect(result.current.modals.invite).toBe(false);
    });

    it("closes a specific modal", () => {
        const { result } = renderHook(() => useModalState());

        act(() => {
            result.current.openModal("invite");
        });
        expect(result.current.modals.invite).toBe(true);

        act(() => {
            result.current.closeModal("invite");
        });
        expect(result.current.modals.invite).toBe(false);
    });

    it("can open multiple modals simultaneously", () => {
        const { result } = renderHook(() => useModalState());

        act(() => {
            result.current.openModal("createServer");
            result.current.openModal("userSettings");
        });

        expect(result.current.modals.createServer).toBe(true);
        expect(result.current.modals.userSettings).toBe(true);
    });

    it("closing one modal does not affect others", () => {
        const { result } = renderHook(() => useModalState());

        act(() => {
            result.current.openModal("createServer");
            result.current.openModal("invite");
        });

        act(() => {
            result.current.closeModal("createServer");
        });

        expect(result.current.modals.createServer).toBe(false);
        expect(result.current.modals.invite).toBe(true);
    });

    it("handles all modal names", () => {
        const { result } = renderHook(() => useModalState());
        const allModals: ModalName[] = [
            "createServer",
            "createChannel",
            "invite",
            "joinServer",
            "userSettings",
            "serverSettings",
            "audioSettings",
            "search",
        ];

        for (const name of allModals) {
            act(() => {
                result.current.openModal(name);
            });
            expect(result.current.modals[name]).toBe(true);

            act(() => {
                result.current.closeModal(name);
            });
            expect(result.current.modals[name]).toBe(false);
        }
    });

    it("returns stable function references across renders", () => {
        const { result, rerender } = renderHook(() => useModalState());

        const openRef1 = result.current.openModal;
        const closeRef1 = result.current.closeModal;

        rerender();

        expect(result.current.openModal).toBe(openRef1);
        expect(result.current.closeModal).toBe(closeRef1);
    });
});
