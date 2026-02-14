/**
 * error-utils.test.ts — Tests for error handling utilities
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getErrorMessage, handleError } from "@/lib/error-utils";

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

import { toast } from "sonner";

describe("getErrorMessage", () => {
    it("extracts message from Error instances", () => {
        expect(getErrorMessage(new Error("test error"))).toBe("test error");
    });

    it("returns string errors as-is", () => {
        expect(getErrorMessage("string error")).toBe("string error");
    });

    it("returns fallback for non-string, non-Error values", () => {
        expect(getErrorMessage(42)).toBe("An unexpected error occurred");
        expect(getErrorMessage(null)).toBe("An unexpected error occurred");
        expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
        expect(getErrorMessage({ foo: "bar" })).toBe("An unexpected error occurred");
    });
});

describe("handleError", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    it("logs to console with context tag", () => {
        const err = new Error("test");
        handleError(err, { context: "TestComponent" });
        expect(console.error).toHaveBeenCalledWith(
            "[TestComponent] test",
            err,
        );
    });

    it("shows toast when toast message is provided", () => {
        handleError(new Error("test"), {
            context: "TestComponent",
            toast: "Something went wrong",
        });
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("does not show toast when toast is not provided", () => {
        handleError(new Error("test"), { context: "TestComponent" });
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("rethrows error when rethrow is true", () => {
        const err = new Error("rethrow me");
        expect(() =>
            handleError(err, { context: "Test", rethrow: true }),
        ).toThrow("rethrow me");
    });

    it("does not rethrow by default", () => {
        expect(() =>
            handleError(new Error("safe"), { context: "Test" }),
        ).not.toThrow();
    });

    it("handles string errors", () => {
        handleError("string error", {
            context: "Test",
            toast: "Failed",
        });
        expect(console.error).toHaveBeenCalledWith(
            "[Test] string error",
            "string error",
        );
        expect(toast.error).toHaveBeenCalledWith("Failed");
    });

    it("handles unknown error types", () => {
        handleError(42, { context: "Test" });
        expect(console.error).toHaveBeenCalledWith(
            "[Test] An unexpected error occurred",
            42,
        );
    });
});
