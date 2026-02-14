/**
 * useKeyboardShortcuts.ts — Global keyboard shortcut handler.
 *
 * Provides power-user shortcuts for common actions:
 *   Ctrl/Cmd+K        → Search (future)
 *   Ctrl/Cmd+Shift+M  → Toggle mute
 *   Escape            → Close modal / Leave voice
 *   Alt+↑/↓           → Navigate channels
 */

import { useEffect, useCallback } from "react";

interface KeyboardShortcutActions {
    /** Toggle microphone mute */
    onToggleMute?: () => void;
    /** Leave voice channel */
    onLeaveVoice?: () => void;
    /** Close any open modal */
    onCloseModal?: () => void;
    /** Navigate to previous channel */
    onPrevChannel?: () => void;
    /** Navigate to next channel */
    onNextChannel?: () => void;
    /** Open search overlay */
    onOpenSearch?: () => void;
    /** Whether any modal is currently open */
    isModalOpen?: boolean;
    /** Whether user is connected to voice */
    isVoiceConnected?: boolean;
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
    const {
        onToggleMute,
        onLeaveVoice,
        onCloseModal,
        onPrevChannel,
        onNextChannel,
        onOpenSearch,
        isModalOpen = false,
        isVoiceConnected = false,
    } = actions;

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const isCmd = e.metaKey || e.ctrlKey;
            const isShift = e.shiftKey;
            const isAlt = e.altKey;
            const tag = (e.target as HTMLElement)?.tagName;

            // Don't hijack shortcuts when typing in inputs
            const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

            // Escape — close modal or leave voice
            if (e.key === "Escape") {
                if (isModalOpen && onCloseModal) {
                    onCloseModal();
                    return;
                }
                // Don't steal escape from inputs
                if (!isTyping && isVoiceConnected && onLeaveVoice) {
                    onLeaveVoice();
                    return;
                }
            }

            // Ctrl/Cmd+K — Open search
            if (isCmd && e.key === "k") {
                e.preventDefault();
                onOpenSearch?.();
                return;
            }

            // Ctrl/Cmd+Shift+M — Toggle mute
            if (isCmd && isShift && e.key.toLowerCase() === "m") {
                e.preventDefault();
                if (isVoiceConnected) {
                    onToggleMute?.();
                }
                return;
            }

            // Alt+↑/↓ — Navigate channels (skip when typing)
            if (isAlt && !isTyping) {
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    onPrevChannel?.();
                } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    onNextChannel?.();
                }
            }
        },
        [
            onToggleMute,
            onLeaveVoice,
            onCloseModal,
            onPrevChannel,
            onNextChannel,
            onOpenSearch,
            isModalOpen,
            isVoiceConnected,
        ]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
