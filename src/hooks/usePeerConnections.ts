import { useRef, useCallback } from "react";
import Peer from "simple-peer";
import { coSet } from "@/lib/jazz-helpers";
import type { PeerInfo } from "./useVoiceChatTypes";
import type { useAudioAnalysis } from "./useAudioAnalysis";

/**
 * Hook for managing WebRTC peer connections in voice chat.
 *
 * Handles:
 * - Creating Peer instances via simple-peer
 * - WebRTC signal exchange through Jazz VoiceState CoValues
 * - Remote audio stream receiving and playback
 * - Peer cleanup on disconnect/close
 *
 * Extracted from useVoiceChat to separate WebRTC connection logic from voice state management.
 */
export function usePeerConnections(
    audioAnalysis: ReturnType<typeof useAudioAnalysis>,
) {
    const peerConnectionsRef = useRef<Map<string, Peer.Instance>>(new Map());

    /**
     * Poll the VoiceState peer list for new peers and establish connections.
     * Called on a 2-second interval by the main voice chat hook.
     */
    const processPeerList = useCallback(
        (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            voicePeers: any,
            myPeerId: string,
            localStream: MediaStream | null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            myPeerCoValue: any,
            setPeers: (peers: PeerInfo[]) => void,
        ) => {
            if (!voicePeers) return;

            const items = Array.from(voicePeers).filter(Boolean);

            // Update peers list for UI
            const peerInfoList: PeerInfo[] = [];
            for (const vp of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vpAny = vp as any;
                if (!vpAny || vpAny.peerId === myPeerId) continue;
                const existingAnalyser = audioAnalysis.getRemoteAnalyser(vpAny.peerId);
                peerInfoList.push({
                    peerId: vpAny.peerId,
                    peerName: vpAny.peerName,
                    isMuted: vpAny.isMuted,
                    isSpeaking: existingAnalyser ? existingAnalyser.isSpeaking() : false,
                });
            }
            setPeers(peerInfoList);

            // Establish WebRTC connections with new peers
            for (const vp of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vpAny = vp as any;
                if (!vpAny || vpAny.peerId === myPeerId) continue;

                if (peerConnectionsRef.current.has(vpAny.peerId)) {
                    const existingPeer = peerConnectionsRef.current.get(vpAny.peerId);
                    if (existingPeer && vpAny.signalData) {
                        try {
                            const signalData = JSON.parse(vpAny.signalData);
                            existingPeer.signal(signalData);
                        } catch {
                            /* signal may have already been processed */
                        }
                    }
                    continue;
                }

                const isInitiator = myPeerId > vpAny.peerId;
                if (!localStream) continue;

                const peer = createPeerConnection(
                    vpAny.peerId,
                    isInitiator,
                    localStream,
                    myPeerCoValue,
                    audioAnalysis,
                    coSet,
                );

                peerConnectionsRef.current.set(vpAny.peerId, peer);

                if (vpAny.signalData) {
                    try {
                        const signalData = JSON.parse(vpAny.signalData);
                        peer.signal(signalData);
                    } catch {
                        /* ignore parse errors */
                    }
                }
            }
        },
        [audioAnalysis],
    );

    /** Destroy all peer connections and clean up. */
    const destroyAll = useCallback(() => {
        peerConnectionsRef.current.forEach((peer) => {
            try {
                peer.destroy();
            } catch {
                /* ignore cleanup errors */
            }
        });
        peerConnectionsRef.current.clear();
    }, []);

    return { processPeerList, destroyAll };
}

/**
 * Create a single WebRTC peer connection via simple-peer.
 */
function createPeerConnection(
    remotePeerId: string,
    isInitiator: boolean,
    localStream: MediaStream,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    myPeerCoValue: any,
    audioAnalysis: ReturnType<typeof useAudioAnalysis>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coSetFn: (target: any, key: string, value: any) => void,
): Peer.Instance {
    const peer = new Peer({
        initiator: isInitiator,
        stream: localStream,
        trickle: true,
        config: {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                // Free TURN servers (OpenRelay) for NAT traversal
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443?transport=tcp",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        },
    });

    peer.on("signal", (data: Peer.SignalData) => {
        if (myPeerCoValue) {
            coSetFn(myPeerCoValue, "signalData", JSON.stringify(data));
        }
    });

    peer.on("stream", (remoteStream: MediaStream) => {
        // Play remote audio
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(() => {
            /* autoplay may be blocked */
        });

        // Create analyser for this remote peer's audio
        audioAnalysis.addRemoteAnalyser(remotePeerId, remoteStream);
    });

    peer.on("error", (err: Error) => {
        console.error(`[usePeerConnections] Peer error with ${remotePeerId}:`, err);
    });

    peer.on("close", () => {
        audioAnalysis.removeRemoteAnalyser(remotePeerId);
    });

    return peer;
}
