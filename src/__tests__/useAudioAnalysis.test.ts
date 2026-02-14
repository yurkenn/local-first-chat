/**
 * useAudioAnalysis.test.ts — Tests for audio analysis utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAudioAnalyser } from "@/hooks/useAudioAnalysis";

// Track the most recently created mocks
let sourceNode: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
let audioCtx: {
    createMediaStreamSource: ReturnType<typeof vi.fn>;
    createAnalyser: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
};
let getByteFreqData: ReturnType<typeof vi.fn>;

function createMockMediaStream(): MediaStream {
    return {
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
        clone: vi.fn(),
        active: true,
        id: "mock-stream",
    } as unknown as MediaStream;
}

describe("createAudioAnalyser", () => {
    const originalAudioContext = global.AudioContext;

    beforeEach(() => {
        getByteFreqData = vi.fn();

        sourceNode = {
            connect: vi.fn(),
            disconnect: vi.fn(),
        };

        const analyserNode = {
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 128,
            getByteFrequencyData: getByteFreqData,
        };

        audioCtx = {
            createMediaStreamSource: vi.fn().mockReturnValue(sourceNode),
            createAnalyser: vi.fn().mockReturnValue(analyserNode),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // Use function() syntax so `new AudioContext()` works correctly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).AudioContext = function MockAudioContext() {
            return audioCtx;
        };
    });

    afterEach(() => {
        global.AudioContext = originalAudioContext;
    });

    it("creates an analyser from a MediaStream", () => {
        const stream = createMockMediaStream();
        const result = createAudioAnalyser(stream);
        expect(result).toBeDefined();
        expect(typeof result.isSpeaking).toBe("function");
        expect(typeof result.cleanup).toBe("function");
    });

    it("detects speaking when audio level exceeds threshold", () => {
        getByteFreqData.mockImplementation((arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = 100; // Well above threshold of 25
            }
        });

        const stream = createMockMediaStream();
        const result = createAudioAnalyser(stream);
        expect(result.isSpeaking()).toBe(true);
    });

    it("returns not speaking when audio level is below threshold", () => {
        getByteFreqData.mockImplementation((arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = 0;
            }
        });

        const stream = createMockMediaStream();
        const result = createAudioAnalyser(stream);
        expect(result.isSpeaking()).toBe(false);
    });

    it("cleanup disconnects source and closes context", () => {
        const stream = createMockMediaStream();
        const result = createAudioAnalyser(stream);
        result.cleanup();
        expect(sourceNode.disconnect).toHaveBeenCalled();
        expect(audioCtx.close).toHaveBeenCalled();
    });

    it("returns safe fallback when AudioContext fails", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).AudioContext = function FailingAudioContext() {
            throw new Error("Not supported");
        };

        const stream = createMockMediaStream();
        const result = createAudioAnalyser(stream);
        expect(result.isSpeaking()).toBe(false);
        result.cleanup(); // Should not throw
    });
});
