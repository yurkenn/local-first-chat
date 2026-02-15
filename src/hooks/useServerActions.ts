import { useCallback } from "react";
import { Group } from "jazz-tools";
import { toast } from "sonner";
import {
    ChatServer,
    ChannelList,
    Channel,
    MessageList,
    VoiceState,
    VoicePeerList,
    TypingState,
    TypingUserList,
} from "@/schema";
import {
    getCoId,
    coPush,
    isAccountLoaded,
    getServerArray,
    findServerById,
} from "@/lib/jazz-helpers";
import type { ModalName } from "@/hooks/useModalState";

// ── Shared channel scaffolding ──────────────────────────────────────────────
// Both server and channel creation need the same MessageList + VoiceState +
// TypingState + Channel pipeline. This helper eliminates that duplication.

function createChannelCoValues(
    name: string,
    type: "text" | "voice",
    owner: Group
): Channel {
    const messages = MessageList.create([], { owner });
    const voiceState = VoiceState.create(
        { peers: VoicePeerList.create([], { owner }) },
        { owner }
    );
    const typingState = TypingState.create(
        { typingUsers: TypingUserList.create([], { owner }) },
        { owner }
    );

    return Channel.create(
        { name, channelType: type, messages, voiceState, typingState },
        { owner }
    );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseServerActionsParams {
    me: unknown;
    activeServerId: string | null;
    setActiveServerId: (id: string | null) => void;
    setActiveChannelId: (id: string | null) => void;
    closeModal: (key: ModalName) => void;
}

export function useServerActions({
    me,
    activeServerId,
    setActiveServerId,
    setActiveChannelId,
    closeModal,
}: UseServerActionsParams) {
    const createServer = useCallback(
        (name: string, emoji: string) => {
            if (!isAccountLoaded(me)) return;
            const account = me as { root: { servers: unknown } };
            if (!account?.root?.servers) return;

            const serverGroup = Group.create();
            serverGroup.addMember("everyone", "writer");

            const generalChannel = createChannelCoValues("general", "text", serverGroup);
            const channelList = ChannelList.create([generalChannel], { owner: serverGroup });

            const server = ChatServer.create(
                { name, iconEmoji: emoji, channels: channelList },
                { owner: serverGroup }
            );

            coPush(account.root.servers, server);

            setActiveServerId(getCoId(server) ?? null);
            setActiveChannelId(getCoId(generalChannel) ?? null);
            closeModal("createServer");
            toast.success(`Server "${name}" created`);
        },
        [me, setActiveServerId, setActiveChannelId, closeModal]
    );

    const createChannel = useCallback(
        (name: string, type: "text" | "voice") => {
            if (!isAccountLoaded(me)) return;

            const serverArr = getServerArray(me);
            const server = findServerById(serverArr, activeServerId);
            if (!server) return;

            const channelsRef = server.channels;
            if (!channelsRef) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverGroup = (server as any).$jazz.owner as Group;

            const channel = createChannelCoValues(name, type, serverGroup);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (channelsRef as any).$jazz.push(channel);
            setActiveChannelId(getCoId(channel) ?? null);
            closeModal("createChannel");
            toast.success(`Channel "#${name}" created`);
        },
        [me, activeServerId, setActiveChannelId, closeModal]
    );

    return { createServer, createChannel };
}
