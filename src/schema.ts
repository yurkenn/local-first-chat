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
  /** Reply-to: quoted message content preview */
  replyToContent: z.optional(z.string()),
  /** Reply-to: sender name of the quoted message */
  replyToSender: z.optional(z.string()),
  /** Attached image as data URL (base64-encoded, max ~2MB) */
  imageDataUrl: z.optional(z.string()),
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
// Typing Indicator Layer
// ─────────────────────────────────────────────

/**
 * Represents a user currently typing in a channel.
 * The `lastTypedAt` timestamp is used to determine if the user is still actively typing
 * (within a configurable timeout, typically 3 seconds).
 */
export const TypingUser = co.map({
  /** Display name of the typing user */
  userName: z.string(),
  /** Unix timestamp of last keystroke */
  lastTypedAt: z.number(),
});
export type TypingUser = co.loaded<typeof TypingUser>;

/** List of users currently typing */
export const TypingUserList = co.list(TypingUser);
export type TypingUserList = co.loaded<typeof TypingUserList>;

/** Typing state for a channel */
export const TypingState = co.map({
  typingUsers: TypingUserList,
});
export type TypingState = co.loaded<typeof TypingState>;

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
  /** Typing indicator state */
  typingState: TypingState,
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
// Direct Message Layer
// ─────────────────────────────────────────────

/**
 * A direct message between two users.
 * Structurally identical to ChatMessage but lives in its own Group
 * with only the two participants — ensures E2EE isolation.
 */
export const DirectMessage = co.map({
  /** Message text content */
  content: z.string(),
  /** Unix timestamp of when the message was created */
  createdAt: z.number(),
  /** Display name of the sender */
  senderName: z.string(),
  /** Unix timestamp of last edit (undefined if never edited) */
  editedAt: z.optional(z.number()),
  /** Soft-delete flag */
  isDeleted: z.optional(z.boolean()),
  /** JSON-encoded reactions */
  reactions: z.optional(z.string()),
  /** Attached image as data URL */
  imageDataUrl: z.optional(z.string()),
});
export type DirectMessage = co.loaded<typeof DirectMessage>;

/** Ordered list of DMs in a thread */
export const DMMessageList = co.list(DirectMessage);
export type DMMessageList = co.loaded<typeof DMMessageList>;

/**
 * A 1-on-1 DM thread between two users.
 * Each DMThread is owned by a Jazz Group containing only the two participants.
 * The `peerName` field stores the other user's display name for quick lookup.
 */
export const DMThread = co.map({
  /** Display name of the other participant */
  peerName: z.string(),
  /** Unix timestamp of last activity (for sorting) */
  lastActivityAt: z.number(),
  /** Messages in this DM thread */
  messages: DMMessageList,
});
export type DMThread = co.loaded<typeof DMThread>;

/** List of DM threads for a user */
export const DMList = co.list(DMThread);
export type DMList = co.loaded<typeof DMList>;

// ─────────────────────────────────────────────
// Read-Tracking Layer
// ─────────────────────────────────────────────

/**
 * Tracks the user's last-read position in a channel or DM.
 * Stored per-user (private) — not shared with other users.
 *
 * The `channelId` is the Jazz CoValue ID of the channel.
 * The `lastReadAt` timestamp is compared against message.createdAt
 * to determine unread count.
 */
export const ReadPosition = co.map({
  /** CoValue ID of the channel or DMThread */
  channelId: z.string(),
  /** Unix timestamp of last-read message */
  lastReadAt: z.number(),
});
export type ReadPosition = co.loaded<typeof ReadPosition>;

/** Map of channel/thread IDs → read positions */
export const ReadPositionList = co.list(ReadPosition);
export type ReadPositionList = co.loaded<typeof ReadPositionList>;

// ─────────────────────────────────────────────
// Account Layer
// ─────────────────────────────────────────────

/**
 * Root data node for each user account.
 * - `servers`: list of joined servers
 * - `dmList`: list of DM threads (E2EE, per-pair Groups)
 * - `readPositions`: per-channel read tracking (private)
 */
export const ChatAccountRoot = co.map({
  servers: ServerList,
  /** Direct message threads */
  dmList: DMList,
  /** Per-channel read positions */
  readPositions: ReadPositionList,
});
export type ChatAccountRoot = co.loaded<typeof ChatAccountRoot>;

/**
 * Custom Jazz Account schema with:
 *  - `root`: private per-user data (server list, DMs, read positions)
 *  - `profile`: public profile (name, avatar — managed by Jazz)
 *
 * The migration runs on every sign-up and log-in.
 * It initializes `root` with empty lists if they don't exist yet.
 *
 * NOTE: Future enhancement — migrate `imageDataUrl` (base64 strings)
 * to `co.FileStream` for proper binary blob handling and efficient sync.
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
        dmList: [],
        readPositions: [],
      });
    }
  });
export type ChatAccount = co.loaded<typeof ChatAccount>;

