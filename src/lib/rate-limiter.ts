/**
 * rate-limiter.ts — Sliding window client-side rate limiter.
 *
 * Prevents spam by limiting actions within a configurable time window.
 * Used primarily for message sending — 5 messages per 10 seconds default.
 */

interface RateLimiterOptions {
    /** Maximum number of actions allowed within the window */
    maxActions: number;
    /** Time window in milliseconds */
    windowMs: number;
}

export class RateLimiter {
    private timestamps: number[] = [];
    private maxActions: number;
    private windowMs: number;

    constructor(options: RateLimiterOptions = { maxActions: 5, windowMs: 10_000 }) {
        this.maxActions = options.maxActions;
        this.windowMs = options.windowMs;
    }

    /**
     * Check if an action is allowed.
     * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
     */
    check(): { allowed: true } | { allowed: false; retryAfterMs: number } {
        const now = Date.now();

        // Remove timestamps outside the window
        this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

        if (this.timestamps.length >= this.maxActions) {
            const oldestInWindow = this.timestamps[0];
            const retryAfterMs = this.windowMs - (now - oldestInWindow);
            return { allowed: false, retryAfterMs };
        }

        return { allowed: true };
    }

    /**
     * Record an action. Call this AFTER the action succeeds.
     */
    record(): void {
        this.timestamps.push(Date.now());
    }

    /**
     * Reset the limiter (e.g., on channel switch).
     */
    reset(): void {
        this.timestamps = [];
    }
}

/** Pre-configured rate limiter for message sending */
export const messageRateLimiter = new RateLimiter({
    maxActions: 5,
    windowMs: 10_000,
});

/** Pre-configured rate limiter for server join attempts */
export const joinRateLimiter = new RateLimiter({
    maxActions: 3,
    windowMs: 30_000,
});
