import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter, messageRateLimiter, joinRateLimiter } from "@/lib/rate-limiter";

describe("RateLimiter", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({ maxActions: 3, windowMs: 1000 });
    });

    it("allows actions within limit", () => {
        expect(limiter.check().allowed).toBe(true);
        limiter.record();
        expect(limiter.check().allowed).toBe(true);
        limiter.record();
        expect(limiter.check().allowed).toBe(true);
        limiter.record();
        // Now at limit
        expect(limiter.check().allowed).toBe(false);
    });

    it("returns retryAfterMs when blocked", () => {
        limiter.record();
        limiter.record();
        limiter.record();
        const result = limiter.check();
        expect(result.allowed).toBe(false);
        if (!result.allowed) {
            expect(result.retryAfterMs).toBeGreaterThan(0);
            expect(result.retryAfterMs).toBeLessThanOrEqual(1000);
        }
    });

    it("resets after window expires", () => {
        vi.useFakeTimers();

        limiter.record();
        limiter.record();
        limiter.record();
        expect(limiter.check().allowed).toBe(false);

        // Advance past window
        vi.advanceTimersByTime(1100);
        expect(limiter.check().allowed).toBe(true);

        vi.useRealTimers();
    });

    it("sliding window drops old actions", () => {
        vi.useFakeTimers();

        limiter.record();
        vi.advanceTimersByTime(400);
        limiter.record();
        vi.advanceTimersByTime(400);
        limiter.record();
        expect(limiter.check().allowed).toBe(false);

        // First action should have expired
        vi.advanceTimersByTime(300);
        expect(limiter.check().allowed).toBe(true);

        vi.useRealTimers();
    });

    it("reset clears all timestamps", () => {
        limiter.record();
        limiter.record();
        limiter.record();
        expect(limiter.check().allowed).toBe(false);
        limiter.reset();
        expect(limiter.check().allowed).toBe(true);
    });
});

describe("Pre-configured limiters", () => {
    it("messageRateLimiter allows initial action", () => {
        expect(messageRateLimiter.check().allowed).toBe(true);
    });

    it("joinRateLimiter allows initial action", () => {
        expect(joinRateLimiter.check().allowed).toBe(true);
    });
});
