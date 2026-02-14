import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useAudioSettings — Manages audio device selection, volume, sensitivity, and deafen state.
 *
 * Provides:
 *   - List of available input (mic) and output (speaker) devices
 *   - Selected device IDs
 *   - Input volume (mic gain)
 *   - Output volume (speaker volume)
 *   - Mic sensitivity threshold (for voice activity detection)
 *   - Deafen toggle (mutes all incoming audio)
 *   - Mic test (plays back your mic audio to yourself)
 */

export interface AudioDevice {
    deviceId: string;
    label: string;
    kind: "audioinput" | "audiooutput";
}

export interface AudioSettings {
    /** Available input devices (microphones) */
    inputDevices: AudioDevice[];
    /** Available output devices (speakers/headphones) */
    outputDevices: AudioDevice[];
    /** Selected input device ID */
    selectedInputId: string;
    /** Selected output device ID */
    selectedOutputId: string;
    /** Input volume / mic gain (0-100) */
    inputVolume: number;
    /** Output volume (0-100) */
    outputVolume: number;
    /** Mic sensitivity threshold (0-100, maps to speaking detection) */
    sensitivity: number;
    /** Whether all incoming audio is deafened */
    isDeafened: boolean;
    /** Whether mic test is active */
    isTesting: boolean;
    /** Current mic input level (0-100) for visual feedback */
    micLevel: number;

    // Actions
    setSelectedInputId: (id: string) => void;
    setSelectedOutputId: (id: string) => void;
    setInputVolume: (v: number) => void;
    setOutputVolume: (v: number) => void;
    setSensitivity: (v: number) => void;
    toggleDeafen: () => void;
    startMicTest: () => void;
    stopMicTest: () => void;
    refreshDevices: () => void;
}

const SETTINGS_KEY = "lotus-audio-settings";

interface PersistedSettings {
    selectedInputId: string;
    selectedOutputId: string;
    inputVolume: number;
    outputVolume: number;
    sensitivity: number;
}

function loadPersistedSettings(): Partial<PersistedSettings> {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function persistSettings(settings: PersistedSettings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        /* ignore */
    }
}

export function useAudioSettings(): AudioSettings {
    const persisted = useRef(loadPersistedSettings());

    const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
    const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
    const [selectedInputId, setSelectedInputId] = useState(persisted.current.selectedInputId || "default");
    const [selectedOutputId, setSelectedOutputId] = useState(persisted.current.selectedOutputId || "default");
    const [inputVolume, setInputVolume] = useState(persisted.current.inputVolume ?? 100);
    const [outputVolume, setOutputVolume] = useState(persisted.current.outputVolume ?? 100);
    const [sensitivity, setSensitivity] = useState(persisted.current.sensitivity ?? 40);
    const [isDeafened, setIsDeafened] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [micLevel, setMicLevel] = useState(0);

    // Mic test refs
    const testStreamRef = useRef<MediaStream | null>(null);
    const testContextRef = useRef<AudioContext | null>(null);
    const testAnalyserRef = useRef<AnalyserNode | null>(null);
    const testAnimFrameRef = useRef<number>(0);
    const testAudioRef = useRef<HTMLAudioElement | null>(null);

    // Persist settings on change
    useEffect(() => {
        persistSettings({ selectedInputId, selectedOutputId, inputVolume, outputVolume, sensitivity });
    }, [selectedInputId, selectedOutputId, inputVolume, outputVolume, sensitivity]);

    // Enumerate audio devices
    const refreshDevices = useCallback(async () => {
        try {
            // Must request permission first to get labels
            await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
                s.getTracks().forEach((t) => t.stop());
            });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs: AudioDevice[] = [];
            const outputs: AudioDevice[] = [];

            devices.forEach((d, i) => {
                if (d.kind === "audioinput") {
                    inputs.push({
                        deviceId: d.deviceId,
                        label: d.label || `Microphone ${i + 1}`,
                        kind: "audioinput",
                    });
                } else if (d.kind === "audiooutput") {
                    outputs.push({
                        deviceId: d.deviceId,
                        label: d.label || `Speaker ${i + 1}`,
                        kind: "audiooutput",
                    });
                }
            });

            setInputDevices(inputs);
            setOutputDevices(outputs);

            // If selected device no longer exists, reset to default
            if (inputs.length > 0 && !inputs.find((d) => d.deviceId === selectedInputId)) {
                setSelectedInputId(inputs[0].deviceId);
            }
            if (outputs.length > 0 && !outputs.find((d) => d.deviceId === selectedOutputId)) {
                setSelectedOutputId(outputs[0].deviceId);
            }
        } catch (err) {
            console.error("[useAudioSettings] Failed to enumerate devices:", err);
        }
    }, [selectedInputId, selectedOutputId]);

    // Initial device enumeration
    useEffect(() => {
        refreshDevices();

        // Listen for device changes (plugging in headset, etc.)
        const handler = () => refreshDevices();
        navigator.mediaDevices.addEventListener("devicechange", handler);
        return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
    }, [refreshDevices]);

    // Mic test — capture local audio, play it back, and show level meter
    const startMicTest = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedInputId !== "default" ? { exact: selectedInputId } : undefined,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            testStreamRef.current = stream;

            // Audio context for level metering
            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);

            // Gain node for input volume adjustment
            const gainNode = ctx.createGain();
            gainNode.gain.value = inputVolume / 100;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;

            source.connect(gainNode);
            gainNode.connect(analyser);

            // Connect to destination for playback (you hear yourself)
            gainNode.connect(ctx.destination);

            testContextRef.current = ctx;
            testAnalyserRef.current = analyser;

            // Animate level meter
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
                testAnimFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            setIsTesting(true);
        } catch (err) {
            console.error("[useAudioSettings] Mic test failed:", err);
        }
    }, [selectedInputId, inputVolume]);

    const stopMicTest = useCallback(() => {
        cancelAnimationFrame(testAnimFrameRef.current);
        testStreamRef.current?.getTracks().forEach((t) => t.stop());
        testStreamRef.current = null;
        testContextRef.current?.close().catch(() => { });
        testContextRef.current = null;
        testAnalyserRef.current = null;
        if (testAudioRef.current) {
            testAudioRef.current.pause();
            testAudioRef.current = null;
        }
        setIsTesting(false);
        setMicLevel(0);
    }, []);

    const toggleDeafen = useCallback(() => {
        setIsDeafened((prev) => !prev);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMicTest();
        };
    }, [stopMicTest]);

    return {
        inputDevices,
        outputDevices,
        selectedInputId,
        selectedOutputId,
        inputVolume,
        outputVolume,
        sensitivity,
        isDeafened,
        isTesting,
        micLevel,

        setSelectedInputId,
        setSelectedOutputId,
        setInputVolume,
        setOutputVolume,
        setSensitivity,
        toggleDeafen,
        startMicTest,
        stopMicTest,
        refreshDevices,
    };
}
