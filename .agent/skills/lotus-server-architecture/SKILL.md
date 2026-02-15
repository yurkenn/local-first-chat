---
name: lotus-server-architecture
description: Comprehensive reference for the Lotus (LocalChat) server-side architecture. Covers Jazz CoValue schema, data hierarchy, CRUD patterns, voice/WebRTC signaling, typing indicators, notifications, security, and known gotchas. Read this FIRST before making any server-side or state management changes.
---

# Lotus Server Architecture Reference

> **Read this document before making ANY changes to schema, hooks, or Jazz CoValue operations.**
> After completing work, update the [CHANGELOG.md](./CHANGELOG.md) with what you changed.

---

## 1. Project Overview

**Lotus** is a decentralized Discord alternative built with:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | React 19 + Vite 7 | UI framework + dev server |
| **Desktop** | Tauri 2 | Native desktop wrapper |
| **State/Sync** | Jazz.tools (jazz-tools ^0.20.9) | Local-first CRDT sync + E2EE |
| **Voice** | simple-peer (WebRTC) | P2P voice chat |
| **UI** | Tailwind CSS 4 + Radix UI | Styling + accessible primitives |
| **Virtualization** | @tanstack/react-virtual | Large message list rendering |

### Key Architecture Principles
1. **Offline-First**: All data saved locally first, synced via Jazz when online
2. **No Central Server**: Jazz cloud acts only as a sync relay, not a data store
3. **E2EE**: Each server/DM has its own Jazz Group with RBAC
4. **P2P Voice**: WebRTC mesh connections; Jazz CoValues used for signaling (no separate TURN/STUN server except Google's public STUN)

---

## 2. Project Structure

```
src/
├── schema.ts              # 🔴 SINGLE SOURCE OF TRUTH — all Jazz CoValue definitions
├── main.tsx               # Entry point: JazzReactProvider + AuthUI + Suspense
├── App.tsx                # Root component: layout + top-level state
├── globals.css            # Design tokens + Tailwind config
├── wordlist.ts            # BIP39-based invite code word list
│
├── lib/                   # Utility layer
│   ├── jazz-helpers.ts    # Type-safe CoValue wrappers (coSet, coPush, coSplice, etc.)
│   ├── jazz-types.ts      # Loaded CoValue type aliases (LoadedServer, etc.)
│   ├── error-utils.ts     # Standardized error handling (handleError)
│   ├── validators.ts      # Input validation + sanitization
│   ├── rate-limiter.ts    # Sliding window rate limiter (messages, joins)
│   └── utils.ts           # Generic utils (cn for classnames)
│
├── hooks/                 # Business logic layer
│   ├── useServerManagement.ts   # Server CRUD (create, delete)
│   ├── useServerActions.ts      # Server + Channel creation (unified)
│   ├── useChannelManagement.ts  # Channel CRUD
│   ├── useVoiceChat.ts          # WebRTC voice (join, leave, mute)
│   ├── useVoiceState.ts         # App-level voice state manager
│   ├── usePeerConnections.ts    # WebRTC peer connection management
│   ├── useAudioAnalysis.ts      # Speaking detection via AnalyserNode
│   ├── useAudioSettings.ts      # Audio device selection
│   ├── useVoiceChatTypes.ts     # Voice type definitions
│   ├── useTypingIndicator.ts    # Typing "..." indicator via Jazz sync
│   ├── useNotifications.ts      # Unread counts + browser notifications
│   ├── useLayoutState.ts        # Sidebar/panel toggle state
│   ├── useModalState.ts         # Modal open/close state
│   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts
│   └── useTheme.ts              # Light/dark theme toggle
│
└── components/            # UI layer (22 components + ui/ primitives)
```

---

## 3. Schema (CoValue Hierarchy)

> **File:** `src/schema.ts` — NEVER create CoValue definitions outside this file.

```
ChatAccount (co.account)
├── root: ChatAccountRoot (co.map) — PRIVATE per-user
│   ├── servers: ServerList (co.list → ChatServer)
│   │   └── ChatServer (co.map) — owned by Group (RBAC)
│   │       ├── name: string
│   │       ├── iconEmoji: string
│   │       └── channels: ChannelList (co.list → Channel)
│   │           └── Channel (co.map)
│   │               ├── name: string
│   │               ├── channelType: "text" | "voice"
│   │               ├── messages: MessageList (co.list → ChatMessage)
│   │               │   └── ChatMessage (co.map)
│   │               │       ├── content, createdAt, senderName
│   │               │       ├── editedAt?, isDeleted?
│   │               │       ├── reactions? (JSON string)
│   │               │       ├── replyToContent?, replyToSender?
│   │               │       └── imageDataUrl? (base64, max ~2MB)
│   │               ├── voiceState: VoiceState (co.map)
│   │               │   └── peers: VoicePeerList (co.list → VoicePeer)
│   │               │       └── VoicePeer: { peerId, signalData, peerName, isMuted }
│   │               └── typingState: TypingState (co.map)
│   │                   └── typingUsers: TypingUserList (co.list → TypingUser)
│   │                       └── TypingUser: { userName, lastTypedAt }
│   ├── dmList: DMList (co.list → DMThread)
│   │   └── DMThread (co.map) — owned by 2-person Group
│   │       ├── peerName, lastActivityAt
│   │       └── messages: DMMessageList (co.list → DirectMessage)
│   └── readPositions: ReadPositionList (co.list → ReadPosition)
│       └── ReadPosition: { channelId, lastReadAt }
└── profile: co.profile() — PUBLIC (name, avatar)
```

### Critical Schema Rules

> [!CAUTION]
> Jazz schemas are **immutable once deployed**. You cannot change field names or types of existing CoValues. Always add new optional fields instead of modifying existing ones.

1. **All CoValues must be defined in `schema.ts`**
2. **Every Channel gets ALL sub-structures**: `messages`, `voiceState`, `typingState` — regardless of channelType
3. **Ownership**: Use `{ owner: serverGroup }` for all CoValues within a server
4. **Account migration** runs on EVERY sign-up and log-in (see `ChatAccount.withMigration`)

---

## 4. Jazz CoValue Operations

> **File:** `src/lib/jazz-helpers.ts`

### Helper Functions (USE THESE, not raw `$jazz` calls)

| Function | Raw Jazz Equivalent | Purpose |
|----------|-------------------- |---------|
| `coSet(coValue, field, value)` | `(x as any).$jazz.set("field", value)` | Set a CoMap field |
| `coPush(coList, item)` | `(x as any).$jazz.push(item)` | Append to CoList |
| `coSplice(coList, start, n)` | `(x as any).$jazz.splice(start, n)` | Remove from CoList |
| `coToArray(coList)` | `Array.from(coList).filter(Boolean)` | Safe CoList → Array |
| `getCoId(coValue)` | `(x as any).$jazz.id` | Get CoValue ID |
| `getOwnerGroup(coValue)` | `(x as any)._owner` | Get owner Group |
| `coHas(coValue, field)` | `(x as any).$jazz.has("field")` | Check field exists |

### ⚠️ Known Gotcha: CoValue Sync Timing

```typescript
// ❌ WRONG: Re-reading after coSet may return stale data
coSet(channel, "voiceState", newVoiceState);
const vs = channel.voiceState; // May still be null!

// ✅ CORRECT: Use the direct reference
let voiceState = channel.voiceState;
if (!voiceState) {
    voiceState = VoiceState.create({...}, { owner });
    coSet(channel, "voiceState", voiceState);
}
// Use `voiceState` directly, not `channel.voiceState`
```

---

## 5. Server/Channel CRUD Patterns

### Creating a Server

> Reference: `useServerManagement.ts` and `useServerActions.ts`

```typescript
// 1. Create a Group with RBAC
const serverGroup = Group.create();
serverGroup.addMember("everyone", "writer");

// 2. Create sub-structures (ALL of these are required)
const messages = MessageList.create([], { owner: serverGroup });
const voiceState = VoiceState.create(
    { peers: VoicePeerList.create([], { owner: serverGroup }) },
    { owner: serverGroup }
);
const typingState = TypingState.create(
    { typingUsers: TypingUserList.create([], { owner: serverGroup }) },
    { owner: serverGroup }
);

// 3. Create default channel
const channel = Channel.create(
    { name: "general", channelType: "text", messages, voiceState, typingState },
    { owner: serverGroup }
);

// 4. Create server
const channelList = ChannelList.create([channel], { owner: serverGroup });
const server = ChatServer.create(
    { name, iconEmoji: emoji, channels: channelList },
    { owner: serverGroup }
);

// 5. Add to user's server list
coPush(account.root.servers, server);
```

### Creating a Channel

> Same pattern but use the **existing server's owner Group**:

```typescript
const serverGroup = getOwnerGroup(server) as Group;
// Create messages + voiceState + typingState with serverGroup
// Then: coPush(server.channels, newChannel);
```

### Deleting a Server

```typescript
const servers = coToArray(account.root.servers);
const index = servers.findIndex(s => getCoId(s) === serverId);
if (index !== -1) coSplice(account.root.servers, index, 1);
```

---

## 6. Voice Chat Architecture

### Layer Diagram

```
┌─────────────────────────────────────────┐
│  useVoiceState (App-level state)        │ ← Which channel am I connected to?
│  ├── joinVoice(channel)                 │
│  ├── leaveVoice()                       │
│  └── toggleMute()                       │
├─────────────────────────────────────────┤
│  useVoiceChat (Core voice logic)        │ ← WebRTC + Jazz signaling
│  ├── join() → getUserMedia + VoicePeer  │
│  ├── leave() → cleanup streams/peers    │
│  └── startPeerPolling() → 2s interval   │
├─────────────────────────────────────────┤
│  usePeerConnections (WebRTC mesh)       │ ← simple-peer instances
│  ├── processPeerList() → create/signal  │
│  └── destroyAll() → cleanup            │
├─────────────────────────────────────────┤
│  useAudioAnalysis (Speaking detection)  │ ← AudioContext AnalyserNode
│  ├── setupLocalAnalyser(stream)         │
│  └── addRemoteAnalyser(peerId, stream)  │
└─────────────────────────────────────────┘
```

### Voice Join Flow
1. `useVoiceState.joinVoice(channel)` → sets `connectedChannel`, `isJoining=true`
2. Effect triggers `useVoiceChat.join()` after 50ms
3. `join()`: `getUserMedia()` → ensure `VoiceState` → create `VoicePeer` → `coPush` to peers list
4. Start 2-second polling interval for peer discovery
5. `usePeerConnections.processPeerList()` creates `simple-peer` instances
6. WebRTC signaling via `VoicePeer.signalData` (JSON-serialized SDP/ICE through Jazz sync)

### ⚠️ Voice Gotchas

1. **VoiceState must exist before pushing peers** — always check and create if null
2. **Use direct reference** after creating VoiceState (sync timing issue)
3. **Clean up streams on early return** — prevents mic leak
4. **Stale peers**: `cleanupStalePeerEntries()` removes ghost entries on rejoin
5. **ICE Servers**: Only Google STUN (no TURN) — may fail behind strict NAT

---

## 7. Typing Indicators

> **File:** `useTypingIndicator.ts`

- **Sync mechanism**: Jazz CoValues (TypingState → TypingUserList → TypingUser)
- **Timeout**: 3 seconds — if no keystroke for 3s, user is no longer "typing"
- **Poll interval**: 1 second — checks remote users' `lastTypedAt`
- **Same sync timing gotcha** applies: ensure `typingState` exists before writing

---

## 8. Notifications & Unread Tracking

> **File:** `useNotifications.ts`

- **Read positions**: Stored in `localStorage` (key: `lotus_read_{channelId}`)
- **Unread count**: Messages with `createdAt > lastReadAt` and `senderName !== self`
- **Browser notifications**: Fired when tab is hidden + new message from others
- **Active channel**: Auto-marked as read

---

## 9. Security & Validation

> **File:** `src/lib/validators.ts`

| Validator | Limit | Used For |
|-----------|-------|----------|
| `sanitizeName(name)` | 50 chars max | Server/channel names |
| `validateMessageContent(content)` | 4000 chars max | Chat messages |
| `isValidEmoji(str)` | 8 chars max | Server icons |
| `isValidImageDataUrl(url)` | Allowed MIME types only | Image attachments |
| `isValidSignalData(data)` | Valid JSON object | WebRTC signals |

### Rate Limiting (`rate-limiter.ts`)

| Limiter | Config | Purpose |
|---------|--------|---------|
| `messageRateLimiter` | 5 per 10s | Prevent message spam |
| `joinRateLimiter` | 3 per 30s | Prevent join spam |

---

## 10. Entry Point & Auth Flow

> **File:** `src/main.tsx`

```
ReactDOM.createRoot → StrictMode → ErrorBoundary → Suspense
  └── JazzReactProvider (lazy loaded)
      ├── sync: wss://cloud.jazz.tools/?key={VITE_JAZZ_API_KEY}
      ├── AccountSchema: ChatAccount
      └── AuthUI → App
```

- **Auth**: Jazz passkey-based (no passwords, no external OAuth)
- **Account migration**: `ChatAccount.withMigration()` — initializes empty root on first login
- **Lazy loading**: Jazz modules loaded via `React.lazy()` to catch import failures

---

## 11. Build & Dev Commands

```bash
npm run dev          # Vite dev server (port 1420)
npm run build        # tsc + vite build
npm run test         # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
npm run format       # prettier --write src/
npm run tauri        # Tauri desktop build
```

### Vite Config Highlights
- **Path alias**: `@` → `./src`
- **Node polyfills**: `events`, `util` (for simple-peer)
- **Code splitting**: vendor-cojson, vendor-jazz, vendor-react, vendor-webrtc, vendor-radix, vendor-crypto
- **Tauri HMR**: WebSocket on port 1421

---

## 12. Common Patterns & Anti-Patterns

### ✅ DO

```typescript
// Use jazz-helpers instead of raw $jazz calls
import { coSet, coPush, getCoId, getOwnerGroup } from "@/lib/jazz-helpers";

// Always use handleError for consistent error handling
import { handleError } from "@/lib/error-utils";

// Validate user inputs
import { sanitizeName, validateMessageContent } from "@/lib/validators";

// Type component props with LoadedServer, LoadedChannel, etc.
import type { LoadedServer, LoadedChannel } from "@/lib/jazz-types";
```

### ❌ DON'T

```typescript
// Don't use raw $jazz calls
(channel as any).$jazz.set("name", value); // ❌
coSet(channel, "name", value);             // ✅

// Don't forget to create ALL sub-structures for a Channel
Channel.create({ name, channelType: "text", messages }); // ❌ Missing voiceState + typingState!

// Don't read CoValue immediately after coSet
coSet(channel, "voiceState", vs);
channel.voiceState.peers; // ❌ May be null!

// Don't catch errors silently
try { ... } catch {} // ❌
try { ... } catch (err) { handleError(err, { context: "...", toast: "..." }); } // ✅
```

---

## 13. Test Infrastructure

- **Framework**: Vitest + jsdom + @testing-library/react
- **Config**: `vitest.config.ts`
- **Location**: `src/__tests__/`
- **Existing tests**: 13 test files, 174 test cases
- **Known failures**: 4 tests in `useLayoutState.test.ts` (pre-existing)

---

## 14. Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_JAZZ_API_KEY` | Jazz Cloud API key | `you@example.com` |
| `TAURI_DEV_HOST` | Tauri dev server host | - |
