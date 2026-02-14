/**
 * useChannelManagement.ts — Channel CRUD operations.
 *
 * Extracts channel creation logic from App.tsx.
 */

import { useCallback } from "react";
import { toast } from "sonner";
import {
    Channel,
    MessageList,
    VoiceState,
    VoicePeerList,
    TypingState,
    TypingUserList,
} from "@/schema";
import { coPush, coToArray, getCoId, getOwnerGroup } from "@/lib/jazz-helpers";

interface UseChannelManagementProps {
    account: any;
    activeServerId: string | null;
    onChannelCreated?: (channelId: string) => void;
}

export function useChannelManagement({
    account,
    activeServerId,
    onChannelCreated,
}: UseChannelManagementProps) {
    /**
     * Create a new channel in the active server.
     */
    const createChannel = useCallback(
        (name: string, type: "text" | "voice") => {
            if (!account?.$isLoaded) return;

            const servers = account?.root?.servers;
            const serverArr = coToArray(servers);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const server = serverArr.find(
                (s: any) => getCoId(s) === activeServerId
            ) as any;
            if (!server?.channels) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverGroup = getOwnerGroup(server) as any;

            const messages = MessageList.create([], { owner: serverGroup });
            const voiceState = VoiceState.create(
                { peers: VoicePeerList.create([], { owner: serverGroup }) },
                { owner: serverGroup }
            );
            const typingState = TypingState.create(
                { typingUsers: TypingUserList.create([], { owner: serverGroup }) },
                { owner: serverGroup }
            );

            const channel = Channel.create(
                {
                    name,
                    channelType: type,
                    messages,
                    voiceState,
                    typingState,
                },
                { owner: serverGroup }
            );

            coPush(server.channels, channel);

            const channelId = getCoId(channel);
            if (channelId) {
                onChannelCreated?.(channelId);
            }
            toast.success(`Channel "#${name}" created`);
        },
        [account, activeServerId, onChannelCreated]
    );

    return { createChannel };
}
