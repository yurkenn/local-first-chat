# Lotus Server Architecture — Agent Changelog

> Every time the agent makes changes to server-side code, schema, or hooks, record them here.
> Format: `## [YYYY-MM-DD] — Summary` followed by changed files and what was modified.

---

## [2026-02-15] — Initial Skill Document Created

- **Created**: `SKILL.md` — Comprehensive architecture reference
- **Scope**: Full CoValue hierarchy, CRUD patterns, voice architecture, typing indicators, notifications, security, and common patterns
- **Known issues**: 4 pre-existing test failures in `useLayoutState.test.ts`

## [2026-02-15] — Voice Room User Visibility Fix

- **Fixed**: `src/hooks/useVoiceChat.ts` (L109-127) — Used direct VoiceState reference after creation instead of re-reading from channel; added VoicePeerList fallback; added stream cleanup on early return
- **Fixed**: `src/components/ChannelSidebar.tsx` (L312-334) — Merged self-user rendering with remote peers; removed dependency on `voice.isConnected` for visibility
- **Root cause**: Race condition where `channel.voiceState` wasn't synced after `coSet`, causing `isConnected` to never be set to `true`
