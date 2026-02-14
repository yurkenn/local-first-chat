/**
 * error-utils.ts — Standardized error handling utilities
 *
 * Provides consistent error logging and user notification patterns
 * across the entire application. Replaces ad-hoc `console.error` +
 * `toast.error()` patterns with a single, structured API.
 */

import { toast } from "sonner";

/**
 * Extract a human-readable message from an unknown error.
 */
export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "An unexpected error occurred";
}

interface HandleErrorOptions {
    /** Context tag for console logging, e.g. "MessageInput" */
    context: string;
    /** User-facing toast message. If omitted, no toast is shown. */
    toast?: string;
    /** If true, rethrow the error after logging. Default: false */
    rethrow?: boolean;
}

/**
 * Standardized error handler.
 *
 * Logs to console with a structured tag and optionally shows a toast notification.
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   handleError(err, { context: "MessageInput", toast: "Failed to send message" });
 * }
 * ```
 */
export function handleError(err: unknown, options: HandleErrorOptions): void {
    const message = getErrorMessage(err);
    console.error(`[${options.context}] ${message}`, err);

    if (options.toast) {
        toast.error(options.toast);
    }

    if (options.rethrow) {
        throw err;
    }
}
