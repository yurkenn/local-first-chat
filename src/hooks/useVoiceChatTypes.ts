/** Peer information for voice chat UI rendering */
export interface PeerInfo {
    peerId: string;
    peerName: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
}
