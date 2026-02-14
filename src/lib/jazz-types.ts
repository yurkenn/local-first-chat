/**
 * jazz-types.ts — Type utilities for Jazz SDK boundaries
 *
 * Jazz CoValues loaded via `useCoState` return `MaybeLoaded<T>` which is
 * a complex union type difficult to use in component props. These aliases
 * provide readable, consistent types for component interfaces.
 *
 * For most component props, the data is already loaded when passed down,
 * so using `loaded<T>` types is correct. For nullable/optional cases,
 * use `| null` in the component prop definition.
 */

import type { co } from "jazz-tools";
import type {
    ChatServer,
    Channel,
    ChatMessage,
    ChatAccount,
} from "@/schema";

// ─── Loaded CoValue aliases ───────────────────────────────────────────
// These represent fully-loaded Jazz CoValues (all fields resolved).
// Use in component props where the parent guarantees data is loaded.

/** A fully loaded ChatServer CoValue */
export type LoadedServer = co.loaded<typeof ChatServer>;

/** A fully loaded Channel CoValue */
export type LoadedChannel = co.loaded<typeof Channel>;

/** A fully loaded ChatMessage CoValue */
export type LoadedMessage = co.loaded<typeof ChatMessage>;

/** A fully loaded ChatAccount CoValue */
export type LoadedAccount = co.loaded<typeof ChatAccount>;

// ─── Convenience re-exports ──────────────────────────────────────────
// Allow importing Jazz types from one location.
export type { ChatServer, Channel, ChatMessage, ChatAccount };
