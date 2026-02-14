/**
 * jazz-helpers.test.ts — Tests for type-safe Jazz CoValue wrappers.
 */

import { describe, it, expect, vi } from "vitest";
import {
    getCoId,
    coSet,
    coHas,
    coPush,
    coSplice,
    coToArray,
    getOwnerGroup,
    isAccountLoaded,
    getProfileName,
    getServerList,
    getServerArray,
    findServerById,
    findChannelById,
    getChannelArray,
    getMessageArray,
    isAnyOpen,
    closeAllModals,
} from "@/lib/jazz-helpers";

// ─── getCoId ─────────────────────────────────────────────────────────────────

describe("getCoId", () => {
    it("returns ID from CoValue with $jazz.id", () => {
        const coValue = { $jazz: { id: "co_abc123" } };
        expect(getCoId(coValue)).toBe("co_abc123");
    });

    it("returns undefined for null", () => {
        expect(getCoId(null)).toBeUndefined();
    });

    it("returns undefined for object without $jazz", () => {
        expect(getCoId({ name: "test" })).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
        expect(getCoId(undefined)).toBeUndefined();
    });
});

// ─── coSet ───────────────────────────────────────────────────────────────────

describe("coSet", () => {
    it("calls $jazz.set when available", () => {
        const setFn = vi.fn();
        const coValue = { $jazz: { set: setFn } };

        coSet(coValue, "name", "General");
        expect(setFn).toHaveBeenCalledWith("name", "General");
    });

    it("does nothing when coValue is null", () => {
        expect(() => coSet(null, "name", "test")).not.toThrow();
    });

    it("does nothing when $jazz.set is missing", () => {
        const coValue = { $jazz: {} };
        expect(() => coSet(coValue, "name", "test")).not.toThrow();
    });
});

// ─── coHas ───────────────────────────────────────────────────────────────────

describe("coHas", () => {
    it("returns true when field exists", () => {
        const coValue = { $jazz: { has: vi.fn().mockReturnValue(true) } };
        expect(coHas(coValue, "name")).toBe(true);
    });

    it("returns false when field does not exist", () => {
        const coValue = { $jazz: { has: vi.fn().mockReturnValue(false) } };
        expect(coHas(coValue, "nonexistent")).toBe(false);
    });

    it("returns false for null coValue", () => {
        expect(coHas(null, "field")).toBe(false);
    });
});

// ─── coPush ──────────────────────────────────────────────────────────────────

describe("coPush", () => {
    it("calls $jazz.push when available", () => {
        const pushFn = vi.fn();
        const coList = { $jazz: { push: pushFn } };

        coPush(coList, { content: "Hello" });
        expect(pushFn).toHaveBeenCalledWith({ content: "Hello" });
    });

    it("does nothing when coList is null", () => {
        expect(() => coPush(null, "item")).not.toThrow();
    });
});

// ─── coSplice ────────────────────────────────────────────────────────────────

describe("coSplice", () => {
    it("calls $jazz.splice when available", () => {
        const spliceFn = vi.fn();
        const coList = { $jazz: { splice: spliceFn } };

        coSplice(coList, 2, 1);
        expect(spliceFn).toHaveBeenCalledWith(2, 1);
    });

    it("does nothing when coList is null", () => {
        expect(() => coSplice(null, 0, 1)).not.toThrow();
    });
});

// ─── coToArray ───────────────────────────────────────────────────────────────

describe("coToArray", () => {
    it("converts iterable to array", () => {
        const items = ["a", "b", "c"];
        expect(coToArray(items)).toEqual(["a", "b", "c"]);
    });

    it("filters null and undefined values", () => {
        const items = ["a", null, "b", undefined, "c"];
        expect(coToArray(items)).toEqual(["a", "b", "c"]);
    });

    it("returns empty array for null input", () => {
        expect(coToArray(null)).toEqual([]);
    });

    it("returns empty array for undefined input", () => {
        expect(coToArray(undefined)).toEqual([]);
    });
});

// ─── getOwnerGroup ───────────────────────────────────────────────────────────

describe("getOwnerGroup", () => {
    it("returns _owner from CoValue", () => {
        const group = { id: "group_123" };
        const coValue = { _owner: group };
        expect(getOwnerGroup(coValue)).toBe(group);
    });

    it("returns undefined for null", () => {
        expect(getOwnerGroup(null)).toBeUndefined();
    });
});

// ─── isAccountLoaded ─────────────────────────────────────────────────────────

describe("isAccountLoaded", () => {
    it("returns true when $isLoaded is true", () => {
        expect(isAccountLoaded({ $isLoaded: true })).toBe(true);
    });

    it("returns false when $isLoaded is false", () => {
        expect(isAccountLoaded({ $isLoaded: false })).toBe(false);
    });

    it("returns false for null", () => {
        expect(isAccountLoaded(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isAccountLoaded(undefined)).toBe(false);
    });
});

// ─── getProfileName ──────────────────────────────────────────────────────────

describe("getProfileName", () => {
    it("returns profile name when available", () => {
        expect(getProfileName({ profile: { name: "Alice" } })).toBe("Alice");
    });

    it("returns 'Anonymous' when profile is missing", () => {
        expect(getProfileName({})).toBe("Anonymous");
    });

    it("returns 'Anonymous' for null", () => {
        expect(getProfileName(null)).toBe("Anonymous");
    });
});

// ─── getServerList ───────────────────────────────────────────────────────────

describe("getServerList", () => {
    it("returns server list from account", () => {
        const servers = [{ name: "Server1" }];
        expect(getServerList({ root: { servers } })).toBe(servers);
    });

    it("returns undefined when root is missing", () => {
        expect(getServerList({})).toBeUndefined();
    });
});

// ─── getServerArray ──────────────────────────────────────────────────────────

describe("getServerArray", () => {
    it("returns typed array from server list", () => {
        const servers = [{ name: "S1" }, null, { name: "S2" }];
        const account = { root: { servers } };
        const result = getServerArray(account);
        expect(result).toHaveLength(2);
    });

    it("returns empty array for null account", () => {
        expect(getServerArray(null)).toEqual([]);
    });
});

// ─── findServerById ──────────────────────────────────────────────────────────

describe("findServerById", () => {
    const servers = [
        { name: "Server1", $jazz: { id: "s1" } },
        { name: "Server2", $jazz: { id: "s2" } },
    ] as any;

    it("finds server by ID", () => {
        expect(findServerById(servers, "s2")?.name).toBe("Server2");
    });

    it("returns null for unknown ID", () => {
        expect(findServerById(servers, "s99")).toBeNull();
    });

    it("returns null for null ID", () => {
        expect(findServerById(servers, null)).toBeNull();
    });
});

// ─── findChannelById ─────────────────────────────────────────────────────────

describe("findChannelById", () => {
    const channels = [
        { name: "general", $jazz: { id: "c1" } },
        { name: "random", $jazz: { id: "c2" } },
    ] as any;

    it("finds channel by ID", () => {
        expect(findChannelById(channels, "c1")?.name).toBe("general");
    });

    it("returns null for unknown ID", () => {
        expect(findChannelById(channels, "c99")).toBeNull();
    });

    it("returns null for null ID", () => {
        expect(findChannelById(channels, null)).toBeNull();
    });
});

// ─── getChannelArray ─────────────────────────────────────────────────────────

describe("getChannelArray", () => {
    it("returns channels from server", () => {
        const server = { channels: [{ name: "general" }, null] } as any;
        expect(getChannelArray(server)).toHaveLength(1);
    });

    it("returns empty array for null server", () => {
        expect(getChannelArray(null)).toEqual([]);
    });
});

// ─── getMessageArray ─────────────────────────────────────────────────────────

describe("getMessageArray", () => {
    it("returns messages from channel", () => {
        const channel = { messages: [{ content: "hi" }, null, { content: "yo" }] } as any;
        expect(getMessageArray(channel)).toHaveLength(2);
    });

    it("returns empty array for null channel", () => {
        expect(getMessageArray(null)).toEqual([]);
    });
});

// ─── isAnyOpen ───────────────────────────────────────────────────────────────

describe("isAnyOpen", () => {
    it("returns true when at least one is open", () => {
        expect(isAnyOpen({ a: false, b: true, c: false })).toBe(true);
    });

    it("returns false when all are closed", () => {
        expect(isAnyOpen({ a: false, b: false })).toBe(false);
    });

    it("returns false for empty record", () => {
        expect(isAnyOpen({})).toBe(false);
    });
});

// ─── closeAllModals ──────────────────────────────────────────────────────────

describe("closeAllModals", () => {
    it("calls closeModal for each open modal", () => {
        const close = vi.fn();
        closeAllModals({ a: true, b: false, c: true }, close);

        expect(close).toHaveBeenCalledTimes(2);
        expect(close).toHaveBeenCalledWith("a");
        expect(close).toHaveBeenCalledWith("c");
    });

    it("does nothing when all modals are closed", () => {
        const close = vi.fn();
        closeAllModals({ a: false, b: false }, close);
        expect(close).not.toHaveBeenCalled();
    });
});
