/**
 * schema.ts — Jazz CoValue Definitions
 *
 * This is the single source of truth for all collaborative data structures.
 * Jazz schemas are immutable once deployed — design changes require migration.
 *
 * Hierarchy: Account → ServerList → ChatServer → ChannelList → Channel → MessageList → ChatMessage
 * Security:  Each ChatServer is owned by a Jazz Group with RBAC roles (admin/writer/reader)
 * Voice:     VoiceState/VoicePeer CoValues serve as WebRTC signaling layer
 */

import { co, z } from "jazz-tools";

// ─────────────────────────────────────────────
// Message Layer
// ─────────────────────────────────────────────

/** A single chat message in a channel */
export const ChatMessage = co.map({
  /** Message text content */
  content: z.string(),
  /** Unix timestamp of when the message was created */
  createdAt: z.number(),
  /** Display name of the sender (denormalized for performance) */
  senderName: z.string(),
  /** Unix timestamp of last edit (undefined if never edited) */
  editedAt: z.optional(z.number()),
  /** Soft-delete flag */
  isDeleted: z.optional(z.boolean()),
  /** JSON-encoded reactions: Record<emoji, senderName[]> */
  reactions: z.optional(z.string()),
});
export type ChatMessage = co.loaded<typeof ChatMessage>;

/** Ordered list of messages in a channel */
export const MessageList = co.list(ChatMessage);
export type MessageList = co.loaded<typeof MessageList>;

// ─────────────────────────────────────────────
// Voice / WebRTC Signaling Layer
// ─────────────────────────────────────────────

/**
 * Represents a single peer in a voice channel.
 * The `signalData` field carries serialized WebRTC signaling (SDP offers/answers, ICE candidates)
 * exchanged via Jazz sync — no separate signaling server needed.
 */
export const VoicePeer = co.map({
  /** Unique identifier for the simple-peer instance */
  peerId: z.string(),
  /** Serialized WebRTC signal data (SDP/ICE) — JSON-stringified */
  signalData: z.string(),
  /** Display name of the peer */
  peerName: z.string(),
  /** Whether the peer's microphone is muted */
  isMuted: z.boolean(),
});
export type VoicePeer = co.loaded<typeof VoicePeer>;

/** List of active peers in a voice channel */
export const VoicePeerList = co.list(VoicePeer);
export type VoicePeerList = co.loaded<typeof VoicePeerList>;

/** Represents the voice state of a voice-type channel */
export const VoiceState = co.map({
  /** List of currently connected voice peers */
  peers: VoicePeerList,
});
export type VoiceState = co.loaded<typeof VoiceState>;

// ─────────────────────────────────────────────
// Channel Layer
// ─────────────────────────────────────────────

/** A channel within a server (text or voice) */
export const Channel = co.map({
  /** Channel display name */
  name: z.string(),
  /** Channel type: "text" for messaging, "voice" for WebRTC calls */
  channelType: z.literal("text").or(z.literal("voice")),
  /** Messages in this channel (only for text channels) */
  messages: MessageList,
  /** Voice state with peer list (only for voice channels) */
  voiceState: VoiceState,
});
export type Channel = co.loaded<typeof Channel>;

/** Ordered list of channels in a server */
export const ChannelList = co.list(Channel);
export type ChannelList = co.loaded<typeof ChannelList>;

// ─────────────────────────────────────────────
// Server Layer
// ─────────────────────────────────────────────

/**
 * A chat server (equivalent to a Discord "guild").
 * Each server is owned by a Jazz Group for RBAC:
 *  - "admin" role → full control
 *  - "writer" role → send messages, join voice
 *  - "reader" role → read-only
 */
export const ChatServer = co.map({
  /** Server display name */
  name: z.string(),
  /** Emoji used as the server icon */
  iconEmoji: z.string(),
  /** Ordered list of channels */
  channels: ChannelList,
});
export type ChatServer = co.loaded<typeof ChatServer>;

/** List of servers a user has joined */
export const ServerList = co.list(ChatServer);
export type ServerList = co.loaded<typeof ServerList>;

// ─────────────────────────────────────────────
// Account Layer
// ─────────────────────────────────────────────

/** Root data node for each user account — stores their server list */
export const ChatAccountRoot = co.map({
  servers: ServerList,
});
export type ChatAccountRoot = co.loaded<typeof ChatAccountRoot>;

/**
 * Custom Jazz Account schema with:
 *  - `root`: private per-user data (server list)
 *  - `profile`: public profile (name, avatar — managed by Jazz)
 *
 * The migration runs on every sign-up and log-in.
 * It initializes `root` with an empty server list if it doesn't exist yet.
 */
export const ChatAccount = co
  .account({
    root: ChatAccountRoot,
    profile: co.profile(),
  })
  .withMigration((account) => {
    if (!account.$jazz.has("root")) {
      account.$jazz.set("root", {
        servers: [],
      });
    }
  });
export type ChatAccount = co.loaded<typeof ChatAccount>;

