import { useState, useRef, useCallback, useEffect } from 'react';
import { Rnnoise, DenoiseState } from '@shiguredo/rnnoise-wasm';

export function useRnnoise() {
    const [isLoaded, setIsLoaded] = useState(false);
    const rnnoiseRef = useRef<Rnnoise | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const denoiseStateRef = useRef<DenoiseState | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    useEffect(() => {
        let mounted = true;
        Rnnoise.load().then((rnnoise) => {
            if (mounted) {
                rnnoiseRef.current = rnnoise;
                setIsLoaded(true);
            }
        }).catch(err => {
            console.error("Failed to load RNNoise WASM:", err);
        });
        return () => { mounted = false; };
    }, []);

    const processStream = useCallback(async (inputStream: MediaStream): Promise<MediaStream> => {
        // Cleanup any previous processing to avoid leaks
        if (audioContextRef.current) {
            try {
                if (sourceRef.current) sourceRef.current.disconnect();
                if (processorRef.current) processorRef.current.disconnect();
                if (destinationRef.current) destinationRef.current.disconnect();
                if (denoiseStateRef.current) denoiseStateRef.current.destroy();
                await audioContextRef.current.close();
            } catch (e) { /* ignore */ }
            sourceRef.current = null;
            processorRef.current = null;
            destinationRef.current = null;
            denoiseStateRef.current = null;
            audioContextRef.current = null;
        }

        if (!rnnoiseRef.current) {
            console.warn("RNNoise not loaded yet, returning original stream");
            return inputStream;
        }

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;

            // Use 4096 buffer size
            const BUFFER_SIZE = 4096;
            const FRAME_SIZE = 480;

            const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            const denoiseState = rnnoiseRef.current.createDenoiseState();
            denoiseStateRef.current = denoiseState;

            let inputRingBuffer = new Float32Array(0);
            let outputRingBuffer = new Float32Array(0);

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const output = e.outputBuffer.getChannelData(0);

                // 1. Add input to ring buffer
                const newInput = new Float32Array(inputRingBuffer.length + input.length);
                newInput.set(inputRingBuffer);
                newInput.set(input, inputRingBuffer.length);
                inputRingBuffer = newInput;

                // 2. Process frames
                while (inputRingBuffer.length >= FRAME_SIZE) {
                    const frame = inputRingBuffer.slice(0, FRAME_SIZE);
                    inputRingBuffer = inputRingBuffer.slice(FRAME_SIZE);

                    // Scale Input: Float32 (-1..1) -> Int16 range (-32768..32767) but as float
                    // RNNoise likely expects this scaled float
                    for (let i = 0; i < FRAME_SIZE; i++) {
                        frame[i] *= 32768;
                    }

                    // Process frame using correct method from analysis
                    try {
                        denoiseState.processFrame(frame);
                    } catch (err) {
                        // ignore
                    }

                    // Scale Output: Int16 range -> Float32 (-1..1)
                    for (let i = 0; i < FRAME_SIZE; i++) {
                        frame[i] /= 32768;
                    }

                    // Add to output buffer
                    const newOutput = new Float32Array(outputRingBuffer.length + frame.length);
                    newOutput.set(outputRingBuffer);
                    newOutput.set(frame, outputRingBuffer.length);
                    outputRingBuffer = newOutput;
                }

                // 3. Write to output
                if (outputRingBuffer.length >= output.length) {
                    output.set(outputRingBuffer.slice(0, output.length));
                    outputRingBuffer = outputRingBuffer.slice(output.length);
                } else {
                    // Underrun handling
                    output.set(outputRingBuffer);
                    output.fill(0, outputRingBuffer.length);
                    outputRingBuffer = new Float32Array(0);
                }
            };

            const source = ctx.createMediaStreamSource(inputStream);
            sourceRef.current = source;
            source.connect(processor);

            const destination = ctx.createMediaStreamDestination();
            destinationRef.current = destination;
            processor.connect(destination);

            return destination.stream;

        } catch (err) {
            console.error("Error setting up RNNoise stream:", err);
            return inputStream;
        }
    }, [isLoaded]);

    const cleanup = useCallback(() => {
        if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch (e) { }
            sourceRef.current = null;
        }
        if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch (e) { }
            processorRef.current = null;
        }
        if (denoiseStateRef.current) {
            try { denoiseStateRef.current.destroy(); } catch (e) { }
            denoiseStateRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        }
    }, [cleanup]);

    return {
        isLoaded,
        processStream,
        cleanup
    };
}
