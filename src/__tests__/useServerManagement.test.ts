/**
 * useServerManagement.test.ts — Tests for server CRUD hook.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useServerManagement } from "@/hooks/useServerManagement";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/error-utils", () => ({
    handleError: vi.fn(),
}));

// Track calls to jazz-helpers
const mockCoPush = vi.fn();
const mockCoToArray = vi.fn();
const mockCoSplice = vi.fn();
const mockGetCoId = vi.fn();

vi.mock("@/lib/jazz-helpers", () => ({
    coPush: (...args: unknown[]) => mockCoPush(...args),
    coToArray: (...args: unknown[]) => mockCoToArray(...args),
    coSplice: (...args: unknown[]) => mockCoSplice(...args),
    getCoId: (...args: unknown[]) => mockGetCoId(...args),
}));

// Mock Jazz SDK constructors
vi.mock("jazz-tools", () => ({
    Group: {
        create: vi.fn().mockReturnValue({
            addMember: vi.fn(),
        }),
    },
}));

vi.mock("@/schema", () => ({
    ChatServer: { create: vi.fn().mockReturnValue({ name: "TestServer" }) },
    ChannelList: { create: vi.fn().mockReturnValue([]) },
    Channel: { create: vi.fn().mockReturnValue({ name: "general" }) },
    MessageList: { create: vi.fn().mockReturnValue([]) },
    VoiceState: { create: vi.fn().mockReturnValue({}) },
    VoicePeerList: { create: vi.fn().mockReturnValue([]) },
    TypingState: { create: vi.fn().mockReturnValue({}) },
    TypingUserList: { create: vi.fn().mockReturnValue([]) },
}));

import { toast } from "sonner";
import { handleError } from "@/lib/error-utils";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useServerManagement", () => {
    const makeAccount = () => ({
        root: { servers: [] },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCoId.mockReturnValue("co_test123");
    });

    // ── createServer ─────────────────────────────────────────────────────

    describe("createServer", () => {
        it("creates a server and pushes to account servers", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.createServer("My Server", "🎮");
            });

            expect(mockCoPush).toHaveBeenCalled();
        });

        it("calls onServerCreated with server and channel IDs", () => {
            const account = makeAccount();
            const onServerCreated = vi.fn();
            mockGetCoId
                .mockReturnValueOnce("srv_1")
                .mockReturnValueOnce("ch_1");

            const { result } = renderHook(() =>
                useServerManagement({ account, onServerCreated }),
            );

            act(() => {
                result.current.createServer("Test", "🎯");
            });

            expect(onServerCreated).toHaveBeenCalledWith("srv_1", "ch_1");
        });

        it("shows success toast after creation", () => {
            const account = makeAccount();
            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.createServer("Cool Server", "🚀");
            });

            expect(toast.success).toHaveBeenCalledWith(
                'Server "Cool Server" created',
            );
        });

        it("does nothing if account.root.servers is missing", () => {
            const { result } = renderHook(() =>
                useServerManagement({ account: {} }),
            );

            act(() => {
                result.current.createServer("Test", "🎯");
            });

            expect(mockCoPush).not.toHaveBeenCalled();
        });

        it("does not call onServerCreated if getCoId returns falsy", () => {
            const account = makeAccount();
            const onServerCreated = vi.fn();
            mockGetCoId.mockReturnValue(undefined);

            const { result } = renderHook(() =>
                useServerManagement({ account, onServerCreated }),
            );

            act(() => {
                result.current.createServer("Test", "🎯");
            });

            expect(onServerCreated).not.toHaveBeenCalled();
        });
    });

    // ── deleteServer ─────────────────────────────────────────────────────

    describe("deleteServer", () => {
        it("deletes a server by ID", () => {
            const account = makeAccount();
            const server = { name: "Server1" };
            mockCoToArray.mockReturnValue([server]);
            mockGetCoId.mockReturnValue("srv_1");

            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.deleteServer("srv_1");
            });

            expect(mockCoSplice).toHaveBeenCalledWith(
                account.root.servers,
                0,
                1,
            );
        });

        it("calls onServerDeleted after successful deletion", () => {
            const account = makeAccount();
            const onServerDeleted = vi.fn();
            mockCoToArray.mockReturnValue([{ name: "S1" }]);
            mockGetCoId.mockReturnValue("srv_1");

            const { result } = renderHook(() =>
                useServerManagement({ account, onServerDeleted }),
            );

            act(() => {
                result.current.deleteServer("srv_1");
            });

            expect(onServerDeleted).toHaveBeenCalled();
        });

        it("shows success toast with server name", () => {
            const account = makeAccount();
            mockCoToArray.mockReturnValue([{ name: "MyServer" }]);
            mockGetCoId.mockReturnValue("srv_1");

            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.deleteServer("srv_1");
            });

            expect(toast.success).toHaveBeenCalledWith(
                'Server "MyServer" deleted',
            );
        });

        it("does nothing if server not found", () => {
            const account = makeAccount();
            mockCoToArray.mockReturnValue([{ name: "Other" }]);
            mockGetCoId.mockReturnValue("other_id");

            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.deleteServer("nonexistent");
            });

            expect(mockCoSplice).not.toHaveBeenCalled();
        });

        it("does nothing if account.root.servers is missing", () => {
            const { result } = renderHook(() =>
                useServerManagement({ account: {} }),
            );

            act(() => {
                result.current.deleteServer("any_id");
            });

            expect(mockCoToArray).not.toHaveBeenCalled();
        });

        it("calls handleError if coSplice throws", () => {
            const account = makeAccount();
            mockCoToArray.mockReturnValue([{ name: "S1" }]);
            mockGetCoId.mockReturnValue("srv_1");
            mockCoSplice.mockImplementation(() => {
                throw new Error("splice failed");
            });

            const { result } = renderHook(() =>
                useServerManagement({ account }),
            );

            act(() => {
                result.current.deleteServer("srv_1");
            });

            expect(handleError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.objectContaining({
                    context: "useServerManagement",
                    toast: "Failed to delete server",
                }),
            );
        });
    });
});
