# P2.6I.2 — Server-Authoritative Quest State

**Status**: COMPLETE (NOT committed/pushed — awaiting Founder Review)  
**Date**: September 16, 2026  
**Commit base**: `cc4ac4b` (P2.6I.1)

## Summary

Quest line state `{main, kills, flowers}` and quest flags are now **server-authoritative**. The server validates every quest mutation against canonical transition tables and the 16-flag vocabulary before persisting to PostgreSQL JSONB columns. Client localStorage remains a cache/offline-resume UX only.

## What Changed

### New Files
| File | Purpose |
|------|---------|
| `app/api/rpg/quest/mutate/route.ts` | POST endpoint — parses input, calls service, maps errors |
| `scripts/test-rpg-p2-6i2-quest-mutation.ts` | 77 tests (parser, transitions, flags, live DB, API route, engine wiring) |

### Modified Files
| File | Changes |
|------|---------|
| `lib/game/rpg/server-contracts.ts` | +`QuestMutationKind`, `QuestMutationInput`, `PendekarQuestStateProjection`, `QuestMutationResult`, `parseQuestMutationInput()`, +4 error codes |
| `lib/game/rpg/server-state.ts` | +`PendekarQuestMutationError`, +`mutateQuestState()` method (serializable TX, replay guard, transition validation, flag validation, JSONB persist), +in-memory `replayGuard` Set |
| `lib/game/rpg/server-api-client.ts` | +`mutateQuestState()` client wrapper (POST to `/api/rpg/quest/mutate`) |
| `src/game/rpg/core/game-engine.ts` | +`mutateQuestState` import; battle victory fires `KILL` + `QUEST_ADVANCE`; golden flower fires `FLOWER_PICK`; `applyQuestSignals()` fires `QUEST_ADVANCE` + `FLAG` for dialogue mutations; all fire-and-forget with `idempotent: true` |

## Architecture

```
Client engine (localStorage)           Server (PostgreSQL)
─────────────────────────              ──────────────────
quest.main = 2 (cache)    ──POST──▶   mutateQuestState(userId, {kind, requestKey})
                                         │
                                         ├─ Validate transition (isValidQuestTransition)
                                         ├─ Validate flags (QUEST_FLAG_NAMES)
                                         ├─ Replay dedup (in-memory sliding window)
                                         └─ Persist: questState JSONB + flags JSONB + version++
                                            │
                                       ◀────┘
Client receives {category, quest, flags, applied, version}
```

### 4 Mutation Kinds
| Kind | Effect | Validation |
|------|--------|------------|
| `QUEST_ADVANCE` | `quest.main → to` | `isValidQuestTransition(from, to, ctx)` |
| `KILL` | `quest.kills + 1` | None (always valid) |
| `FLOWER_PICK` | `quest.flowers + 1` | None (always valid) |
| `FLAG` | `flags[name] = true` | `name ∈ QUEST_FLAG_NAMES` (16 entries) |

### Engine Wiring
All server calls are **fire-and-forget** (`withIdempotency`, `idempotent: true`). Client continues independently while server validates/persists in background. If server rejects, client state diverges until next hydration cycle.

## Verification
| Check | Result |
|-------|--------|
| `test-rpg-p2-6i2-quest-mutation` | ✅ 77/77 |
| `test-rpg-p2-6i1-state-projection` | ✅ 94/94 (no regression) |
| `test-rpg-p2-6i1-server-wins-gate` | ✅ 49/49 (no regression) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (5 modified files) | ✅ 0 violations |
| DB writes | ✅ Local staging only (`bahasacerdas_staging`) |
| Production DB | ✅ Untouched |
| GIMBC | ✅ Untouched |

## Known Limitations
1. **Replay dedup is in-memory** — survives within a single server process lifetime but resets on cold start. The serializable TX + unique `requestKey` per client call provides the primary safety net.
2. **No `_questMeta` DB column** — the original design used a non-existent column; replaced with in-memory `Set` + sliding window (256 entries per player).
3. **Fire-and-forget** — if server rejects a mutation, client may have stale quest state until next full hydration.
