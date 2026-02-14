/**
 * validators.test.ts — Tests for input validation and sanitization utilities.
 */

import { describe, it, expect } from "vitest";
import {
    isValidImageDataUrl,
    sanitizeName,
    isValidName,
    isValidEmoji,
    validateMessageContent,
    isValidSignalData,
    MAX_MESSAGE_LENGTH,
    MAX_NAME_LENGTH,
} from "@/lib/validators";

// ─── isValidImageDataUrl ─────────────────────────────────────────────────────

describe("isValidImageDataUrl", () => {
    it("accepts valid PNG data URL", () => {
        expect(isValidImageDataUrl("data:image/png;base64,abc123")).toBe(true);
    });

    it("accepts valid JPEG data URL", () => {
        expect(isValidImageDataUrl("data:image/jpeg;base64,abc123")).toBe(true);
    });

    it("accepts valid GIF data URL", () => {
        expect(isValidImageDataUrl("data:image/gif;base64,abc123")).toBe(true);
    });

    it("accepts valid WebP data URL", () => {
        expect(isValidImageDataUrl("data:image/webp;base64,abc123")).toBe(true);
    });

    it("accepts valid SVG data URL", () => {
        expect(isValidImageDataUrl("data:image/svg+xml;base64,abc123")).toBe(true);
    });

    it("accepts valid AVIF data URL", () => {
        expect(isValidImageDataUrl("data:image/avif;base64,abc123")).toBe(true);
    });

    it("rejects javascript: URI (XSS prevention)", () => {
        expect(isValidImageDataUrl("javascript:alert(1)")).toBe(false);
    });

    it("rejects data URL with non-image MIME type", () => {
        expect(isValidImageDataUrl("data:text/html;base64,abc")).toBe(false);
    });

    it("rejects data URL with application/pdf", () => {
        expect(isValidImageDataUrl("data:application/pdf;base64,abc")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(isValidImageDataUrl("")).toBe(false);
    });

    it("rejects null/undefined", () => {
        expect(isValidImageDataUrl(null as any)).toBe(false);
        expect(isValidImageDataUrl(undefined as any)).toBe(false);
    });

    it("rejects regular URLs", () => {
        expect(isValidImageDataUrl("https://example.com/image.png")).toBe(false);
    });

    it("rejects malformed data URL without MIME", () => {
        expect(isValidImageDataUrl("data:;base64,abc")).toBe(false);
    });
});

// ─── sanitizeName ────────────────────────────────────────────────────────────

describe("sanitizeName", () => {
    it("trims leading and trailing whitespace", () => {
        expect(sanitizeName("  hello  ")).toBe("hello");
    });

    it("removes control characters", () => {
        expect(sanitizeName("hello\x00world")).toBe("helloworld");
        expect(sanitizeName("test\x1F")).toBe("test");
    });

    it("collapses multiple spaces into one", () => {
        expect(sanitizeName("hello    world")).toBe("hello world");
    });

    it("enforces max length", () => {
        const long = "a".repeat(100);
        expect(sanitizeName(long).length).toBe(MAX_NAME_LENGTH);
    });

    it("enforces custom max length", () => {
        expect(sanitizeName("hello world", 5)).toBe("hello");
    });

    it("returns empty string for empty input", () => {
        expect(sanitizeName("")).toBe("");
    });

    it("returns empty string for null/undefined", () => {
        expect(sanitizeName(null as any)).toBe("");
        expect(sanitizeName(undefined as any)).toBe("");
    });

    it("handles names with only whitespace", () => {
        expect(sanitizeName("   ")).toBe("");
    });
});

// ─── isValidName ─────────────────────────────────────────────────────────────

describe("isValidName", () => {
    it("returns true for valid name", () => {
        expect(isValidName("General")).toBe(true);
    });

    it("returns false for empty string", () => {
        expect(isValidName("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
        expect(isValidName("   ")).toBe(false);
    });

    it("returns false for control characters only", () => {
        expect(isValidName("\x00\x01")).toBe(false);
    });
});

// ─── isValidEmoji ────────────────────────────────────────────────────────────

describe("isValidEmoji", () => {
    it("accepts single emoji", () => {
        expect(isValidEmoji("🎮")).toBe(true);
    });

    it("accepts emoji with variation selector", () => {
        expect(isValidEmoji("❤️")).toBe(true);
    });

    it("rejects regular text", () => {
        expect(isValidEmoji("hello")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(isValidEmoji("")).toBe(false);
    });

    it("rejects null/undefined", () => {
        expect(isValidEmoji(null as any)).toBe(false);
        expect(isValidEmoji(undefined as any)).toBe(false);
    });

    it("rejects string exceeding MAX_EMOJI_LENGTH", () => {
        expect(isValidEmoji("🎮🎮🎮🎮🎮🎮🎮🎮🎮")).toBe(false);
    });
});

// ─── validateMessageContent ──────────────────────────────────────────────────

describe("validateMessageContent", () => {
    it("returns null for valid message", () => {
        expect(validateMessageContent("Hello world!")).toBeNull();
    });

    it("returns error for empty string", () => {
        expect(validateMessageContent("")).toBe("Message cannot be empty");
    });

    it("returns error for whitespace-only", () => {
        expect(validateMessageContent("   ")).toBe("Message cannot be empty");
    });

    it("returns error for message exceeding max length", () => {
        const long = "a".repeat(MAX_MESSAGE_LENGTH + 1);
        const result = validateMessageContent(long);
        expect(result).toContain("Message too long");
        expect(result).toContain(String(MAX_MESSAGE_LENGTH));
    });

    it("accepts message at exact max length", () => {
        const exact = "a".repeat(MAX_MESSAGE_LENGTH);
        expect(validateMessageContent(exact)).toBeNull();
    });
});

// ─── isValidSignalData ───────────────────────────────────────────────────────

describe("isValidSignalData", () => {
    it("accepts valid JSON object", () => {
        expect(isValidSignalData('{"type":"offer","sdp":"..."}')).toBe(true);
    });

    it("rejects JSON array", () => {
        expect(isValidSignalData('[1, 2, 3]')).toBe(false);
    });

    it("rejects JSON primitive", () => {
        expect(isValidSignalData('"hello"')).toBe(false);
        expect(isValidSignalData("42")).toBe(false);
    });

    it("rejects JSON null", () => {
        expect(isValidSignalData("null")).toBe(false);
    });

    it("rejects invalid JSON", () => {
        expect(isValidSignalData("{not json}")).toBe(false);
    });

    it("rejects empty string", () => {
        expect(isValidSignalData("")).toBe(false);
    });

    it("rejects null/undefined", () => {
        expect(isValidSignalData(null as any)).toBe(false);
        expect(isValidSignalData(undefined as any)).toBe(false);
    });
});
