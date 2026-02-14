/**
 * useChannelManagement.test.ts — Tests for channel CRUD hook.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChannelManagement } from "@/hooks/useChannelManagement";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockCoPush = vi.fn();
const mockCoToArray = vi.fn();
const mockGetCoId = vi.fn();
const mockGetOwnerGroup = vi.fn();

vi.mock("@/lib/jazz-helpers", () => ({
    coPush: (...args: unknown[]) => mockCoPush(...args),
    coToArray: (...args: unknown[]) => mockCoToArray(...args),
    getCoId: (...args: unknown[]) => mockGetCoId(...args),
    getOwnerGroup: (...args: unknown[]) => mockGetOwnerGroup(...args),
}));

vi.mock("@/schema", () => ({
    Channel: { create: vi.fn().mockReturnValue({ name: "new-channel" }) },
    MessageList: { create: vi.fn().mockReturnValue([]) },
    VoiceState: { create: vi.fn().mockReturnValue({}) },
    VoicePeerList: { create: vi.fn().mockReturnValue([]) },
    TypingState: { create: vi.fn().mockReturnValue({}) },
    TypingUserList: { create: vi.fn().mockReturnValue([]) },
}));

import { toast } from "sonner";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useChannelManagement", () => {
    const serverGroup = { id: "group_1" };

    const makeAccount = (serverId = "srv_1") => {
        const server = {
            channels: [],
            $jazz: { id: serverId },
            _owner: serverGroup,
        };
        return {
            $isLoaded: true,
            root: {
                servers: [server],
            },
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCoId.mockImplementation((obj: any) => obj?.$jazz?.id ?? "co_new");
        mockCoToArray.mockImplementation((arr: any) =>
            arr ? Array.from(arr).filter(Boolean) : [],
        );
        mockGetOwnerGroup.mockReturnValue(serverGroup);
    });

    // ── createChannel ────────────────────────────────────────────────────

    describe("createChannel", () => {
        it("creates a text channel and pushes it to the server", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                }),
            );

            act(() => {
                result.current.createChannel("general", "text");
            });

            expect(mockCoPush).toHaveBeenCalled();
        });

        it("creates a voice channel", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                }),
            );

            act(() => {
                result.current.createChannel("voice-1", "voice");
            });

            expect(mockCoPush).toHaveBeenCalled();
        });

        it("calls onChannelCreated with the new channel ID", () => {
            const account = makeAccount();
            const onChannelCreated = vi.fn();

            // First call is for finding server, second is for new channel
            mockGetCoId
                .mockImplementation((obj: any) => {
                    if (obj?.$jazz?.id) return obj.$jazz.id;
                    return "ch_new";
                });

            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                    onChannelCreated,
                }),
            );

            act(() => {
                result.current.createChannel("random", "text");
            });

            expect(onChannelCreated).toHaveBeenCalledWith("ch_new");
        });

        it("shows success toast with channel name", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                }),
            );

            act(() => {
                result.current.createChannel("announcements", "text");
            });

            expect(toast.success).toHaveBeenCalledWith(
                'Channel "#announcements" created',
            );
        });

        it("does nothing if account is not loaded", () => {
            const account = { $isLoaded: false };
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                }),
            );

            act(() => {
                result.current.createChannel("test", "text");
            });

            expect(mockCoPush).not.toHaveBeenCalled();
        });

        it("does nothing if no activeServerId", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: null,
                }),
            );

            act(() => {
                result.current.createChannel("test", "text");
            });

            expect(mockCoPush).not.toHaveBeenCalled();
        });

        it("does nothing if active server is not found in list", () => {
            const account = makeAccount("other_srv");
            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "nonexistent",
                }),
            );

            act(() => {
                result.current.createChannel("test", "text");
            });

            expect(mockCoPush).not.toHaveBeenCalled();
        });

        it("does not call onChannelCreated when getCoId returns falsy", () => {
            const account = makeAccount();
            const onChannelCreated = vi.fn();

            mockGetCoId.mockImplementation((obj: any) => {
                if (obj?.$jazz?.id) return obj.$jazz.id;
                return undefined; // channel has no ID
            });

            const { result } = renderHook(() =>
                useChannelManagement({
                    account,
                    activeServerId: "srv_1",
                    onChannelCreated,
                }),
            );

            act(() => {
                result.current.createChannel("test", "text");
            });

            expect(onChannelCreated).not.toHaveBeenCalled();
        });
    });
});
