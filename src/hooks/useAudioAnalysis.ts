import { useRef, useCallback } from "react";
import { PeerInfo } from "./useVoiceChatTypes";

/** Threshold for audio level to consider "speaking" (0-255 range) */
const SPEAKING_THRESHOLD = 25;
/** How often to check audio levels (ms) */
const AUDIO_CHECK_INTERVAL = 100;

/**
 * Creates an AnalyserNode for a MediaStream.
 * Returns helpers to check speaking status and cleanup.
 */
export function createAudioAnalyser(stream: MediaStream) {
    try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        return {
            isSpeaking: (): boolean => {
                try {
                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;
                    return average > SPEAKING_THRESHOLD;
                } catch {
                    return false;
                }
            },
            cleanup: () => {
                source.disconnect();
                audioContext.close().catch(() => { });
            },
        };
    } catch {
        // AudioContext not available (SSR, test environments, etc.)
        return {
            isSpeaking: () => false,
            cleanup: () => { },
        };
    }
}

export type AudioAnalyser = ReturnType<typeof createAudioAnalyser>;

/**
 * Hook for managing audio analysis — speaking detection for local and remote peers.
 *
 * Extracted from useVoiceChat to separate audio concerns from WebRTC connection management.
 */
export function useAudioAnalysis() {
    const localAnalyserRef = useRef<AudioAnalyser | null>(null);
    const remoteAnalysersRef = useRef<Map<string, AudioAnalyser>>(new Map());
    const audioCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /** Start monitoring audio levels for speaking detection. */
    const startAudioMonitoring = useCallback(
        (
            onLocalSpeaking: (speaking: boolean) => void,
            onPeersUpdate: (updater: (prev: PeerInfo[]) => PeerInfo[]) => void,
        ) => {
            if (audioCheckIntervalRef.current) return;

            audioCheckIntervalRef.current = setInterval(() => {
                // Check local speaking
                if (localAnalyserRef.current) {
                    onLocalSpeaking(localAnalyserRef.current.isSpeaking());
                }

                // Check remote peers speaking (update peer info)
                onPeersUpdate((prevPeers) => {
                    let changed = false;
                    const updated = prevPeers.map((peer) => {
                        const analyser = remoteAnalysersRef.current.get(peer.peerId);
                        const speaking = analyser ? analyser.isSpeaking() : false;
                        if (speaking !== peer.isSpeaking) {
                            changed = true;
                            return { ...peer, isSpeaking: speaking };
                        }
                        return peer;
                    });
                    return changed ? updated : prevPeers;
                });
            }, AUDIO_CHECK_INTERVAL);
        },
        [],
    );

    /** Stop audio monitoring. */
    const stopAudioMonitoring = useCallback(() => {
        if (audioCheckIntervalRef.current) {
            clearInterval(audioCheckIntervalRef.current);
            audioCheckIntervalRef.current = null;
        }
    }, []);

    /** Setup local audio analyser for a stream. */
    const setupLocalAnalyser = useCallback((stream: MediaStream) => {
        localAnalyserRef.current = createAudioAnalyser(stream);
    }, []);

    /** Add a remote peer analyser. */
    const addRemoteAnalyser = useCallback((peerId: string, stream: MediaStream) => {
        const analyser = createAudioAnalyser(stream);
        remoteAnalysersRef.current.set(peerId, analyser);
    }, []);

    /** Get the analyser for a remote peer. */
    const getRemoteAnalyser = useCallback((peerId: string) => {
        return remoteAnalysersRef.current.get(peerId);
    }, []);

    /** Cleanup all analysers. */
    const cleanupAll = useCallback(() => {
        stopAudioMonitoring();
        if (localAnalyserRef.current) {
            localAnalyserRef.current.cleanup();
            localAnalyserRef.current = null;
        }
        remoteAnalysersRef.current.forEach((analyser) => analyser.cleanup());
        remoteAnalysersRef.current.clear();
    }, [stopAudioMonitoring]);

    /** Remove a single remote analyser. */
    const removeRemoteAnalyser = useCallback((peerId: string) => {
        const analyser = remoteAnalysersRef.current.get(peerId);
        if (analyser) {
            analyser.cleanup();
            remoteAnalysersRef.current.delete(peerId);
        }
    }, []);

    return {
        startAudioMonitoring,
        stopAudioMonitoring,
        setupLocalAnalyser,
        addRemoteAnalyser,
        getRemoteAnalyser,
        removeRemoteAnalyser,
        cleanupAll,
    };
}
