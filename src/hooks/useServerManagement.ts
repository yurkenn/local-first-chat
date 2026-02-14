/**
 * useServerManagement.ts — Server CRUD operations.
 *
 * Extracts server creation, deletion, and join logic from App.tsx.
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { Group } from "jazz-tools";
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
import { coPush, coToArray, coSplice, getCoId } from "@/lib/jazz-helpers";

interface UseServerManagementProps {
    account: any;
    onServerCreated?: (serverId: string, channelId: string) => void;
    onServerDeleted?: () => void;
}

export function useServerManagement({
    account,
    onServerCreated,
    onServerDeleted,
}: UseServerManagementProps) {
    /**
     * Create a new server with a default #general text channel.
     */
    const createServer = useCallback(
        (name: string, emoji: string) => {
            if (!account?.root?.servers) return;

            const serverGroup = Group.create();
            serverGroup.addMember("everyone", "writer");

            const generalMessages = MessageList.create([], { owner: serverGroup });
            const generalVoiceState = VoiceState.create(
                { peers: VoicePeerList.create([], { owner: serverGroup }) },
                { owner: serverGroup }
            );
            const generalTypingState = TypingState.create(
                { typingUsers: TypingUserList.create([], { owner: serverGroup }) },
                { owner: serverGroup }
            );
            const generalChannel = Channel.create(
                {
                    name: "general",
                    channelType: "text",
                    messages: generalMessages,
                    voiceState: generalVoiceState,
                    typingState: generalTypingState,
                },
                { owner: serverGroup }
            );

            const channelList = ChannelList.create([generalChannel], {
                owner: serverGroup,
            });

            const server = ChatServer.create(
                {
                    name,
                    iconEmoji: emoji,
                    channels: channelList,
                },
                { owner: serverGroup }
            );

            coPush(account.root.servers, server);

            const serverId = getCoId(server);
            const channelId = getCoId(generalChannel);
            if (serverId && channelId) {
                onServerCreated?.(serverId, channelId);
            }
            toast.success(`Server "${name}" created`);
        },
        [account, onServerCreated]
    );

    /**
     * Delete a server by removing it from the account's server list.
     */
    const deleteServer = useCallback(
        (serverId: string) => {
            if (!account?.root?.servers) return;

            const servers = coToArray(account.root.servers);
            const index = servers.findIndex((s: any) => getCoId(s) === serverId);
            if (index === -1) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverName = (servers[index] as any)?.name || "Server";

            try {
                coSplice(account.root.servers, index, 1);
                onServerDeleted?.();
                toast.success(`Server "${serverName}" deleted`);
            } catch (err) {
                console.error("[useServerManagement] Delete failed:", err);
                toast.error("Failed to delete server");
            }
        },
        [account, onServerDeleted]
    );

    return { createServer, deleteServer };
}
