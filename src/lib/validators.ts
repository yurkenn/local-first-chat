/**
 * validators.ts — Input validation and sanitization utilities.
 *
 * Provides security-focused validation for user inputs across the app.
 * All user-facing inputs should be validated through these functions.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum message content length (characters) */
export const MAX_MESSAGE_LENGTH = 4000;

/** Maximum server/channel name length */
export const MAX_NAME_LENGTH = 50;

/** Maximum emoji field length */
export const MAX_EMOJI_LENGTH = 8;

/** Allowed image MIME types for data URLs */
const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/avif",
] as const;

// ─── Image Validation ────────────────────────────────────────────────────────

/**
 * Validates that a data URL is a safe image format.
 * Prevents XSS via javascript: URIs or non-image MIME types.
 */
export function isValidImageDataUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;

    // Must start with data: protocol
    if (!url.startsWith("data:")) return false;

    // Extract MIME type from data URL
    const mimeMatch = url.match(/^data:([^;,]+)/);
    if (!mimeMatch) return false;

    const mimeType = mimeMatch[1].toLowerCase();
    return ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

// ─── Name Validation ─────────────────────────────────────────────────────────

/**
 * Sanitizes a server or channel name.
 * Trims whitespace, enforces max length, removes control characters.
 */
export function sanitizeName(name: string, maxLength = MAX_NAME_LENGTH): string {
    if (!name || typeof name !== "string") return "";

    return name
        .trim()
        // Remove control characters (U+0000–U+001F, U+007F–U+009F)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        // Collapse multiple whitespace into single space
        .replace(/\s+/g, " ")
        // Enforce max length
        .slice(0, maxLength);
}

/**
 * Validates that a name is non-empty after sanitization.
 */
export function isValidName(name: string): boolean {
    const sanitized = sanitizeName(name);
    return sanitized.length > 0;
}

// ─── Emoji Validation ────────────────────────────────────────────────────────

/**
 * Validates that a string contains only emoji characters.
 * Uses Unicode emoji property (requires ES2018+).
 */
export function isValidEmoji(str: string): boolean {
    if (!str || typeof str !== "string") return false;
    if (str.length > MAX_EMOJI_LENGTH) return false;

    // Match emoji sequences (including compound emoji with ZWJ)
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
    return emojiRegex.test(str.trim());
}

// ─── Message Validation ──────────────────────────────────────────────────────

/**
 * Validates message content length.
 * Returns error message if invalid, null if valid.
 */
export function validateMessageContent(content: string): string | null {
    if (!content || content.trim().length === 0) {
        return "Message cannot be empty";
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
        return `Message too long (${content.length}/${MAX_MESSAGE_LENGTH} characters)`;
    }
    return null;
}

// ─── WebRTC Signal Validation ────────────────────────────────────────────────

/**
 * Validates WebRTC signal data is valid JSON.
 * Basic structural check — does not validate SDP/ICE content deeply.
 */
export function isValidSignalData(data: string): boolean {
    if (!data || typeof data !== "string") return false;

    try {
        const parsed = JSON.parse(data);
        // Must be an object (not null, array, or primitive)
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    } catch {
        return false;
    }
}
