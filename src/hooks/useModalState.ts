import { useState, useCallback } from "react";

type ModalName =
    | "createServer"
    | "createChannel"
    | "invite"
    | "joinServer"
    | "userSettings"
    | "serverSettings";

type ModalState = Record<ModalName, boolean>;

const initialState: ModalState = {
    createServer: false,
    createChannel: false,
    invite: false,
    joinServer: false,
    userSettings: false,
    serverSettings: false,
};

/**
 * useModalState — Manages visibility state of all modal dialogs.
 *
 * Replaces 6 separate useState calls in App.tsx with a single hook.
 * Returns a stable `modals` object + `openModal`/`closeModal` functions.
 */
export function useModalState() {
    const [modals, setModals] = useState<ModalState>(initialState);

    const openModal = useCallback((name: ModalName) => {
        setModals((prev) => ({ ...prev, [name]: true }));
    }, []);

    const closeModal = useCallback((name: ModalName) => {
        setModals((prev) => ({ ...prev, [name]: false }));
    }, []);

    return { modals, openModal, closeModal };
}
