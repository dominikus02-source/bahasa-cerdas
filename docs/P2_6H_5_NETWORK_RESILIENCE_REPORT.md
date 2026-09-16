# P2.6H.5 Network Resilience & Fire-and-Forget Hardening — Report

**Status**: COMPLETE  
**Date**: September 14, 2026  
**Scope**: GAP-6 — Network failure, timeout, transient failure, lost response, duplicate retry, slow response, browser refresh, concurrent request

---

## Executive Summary

Hardened the server-call layer of the RPG engine against all identified network failure modes. Added bounded timeout (15s), bounded retry (max 2 retries), error classification (PERMANENT/RETRYABLE/UNKNOWN), fire-and-forget lifecycle tracking, stale response protection, and proper error propagation. All changes additive — no gameplay, artwork, GIMBC, or production DB touched.

## Phases Completed

### Phase 0 — Forensic Baseline (PASS)
Mapped all 7 server calls:

| # | Call | Idempotent | requestKey |
|---|------|-----------|-----------|
| 1 | `startServerBattle` | Yes | `generateRequestKey()` |
| 2 | `startServerLearning` | No (server handles via battleId) | — |
| 3 | `submitServerLearningAnswer` | Yes | `generateRequestKey()` |
| 4 | `submitServerBattleAction` (basic) | Yes | `generateRequestKey()` |
| 5 | `submitServerBattleAction` (skill) | Yes | `generateRequestKey()` |
| 6 | `submitServerBattleAction` (flee) | Yes | `generateRequestKey()` |
| 7 | `createServerRewardReceipt` | Yes | `generateRequestKey()` |
| 8 | `settleServerReward` | Yes | `generateRequestKey()` |
| 9 | `fetchStateProjection` | N/A (GET) | — |

### Phase 1 — Timeout (PASS)
- Created `lib/game/rpg/network-resilience.ts` with `fetchWithTimeout()` using `AbortController`
- `DEFAULT_TIMEOUT_MS = 15000` (15s bounded)
- `server-api-client.ts` `fetchServer()` now uses `fetchWithTimeout` instead of raw `fetch`
- Throws `NetworkError` with code `"TIMEOUT"` on abort

### Phase 2 — Retry Policy (PASS)
- `DEFAULT_RETRY_POLICY = { maxRetries: 2, baseDelayMs: 500, maxDelayMs: 3000 }`
- `fetchServerWithRetry()` implements bounded `for` loop with exponential backoff + jitter
- Breaks on `PERMANENT` errors or last attempt
- Same `requestKey` passed through all retries (idempotent on server)

### Phase 3 — RequestKey Semantics (PASS)
- `generateRequestKey()` uses `` `client-${crypto.randomUUID()}` ``
- All 7 `fireServerCall()` sites pass explicit `key` option
- `fetchServerWithRetry` validates but does NOT mutate the key
- Engine generates keys BEFORE calling `fireServerCall` (not inside)

### Phase 4 — Fire-and-Forget Lifecycle (PASS)
- `PendingServerCalls` class replaces `Set<Promise<unknown>>`
- Lifecycle: `PENDING → CONFIRMED | RETRYABLE_FAILURE | FAILED | UNKNOWN`
- `track(key)` → `confirm(key, data)` | `failed(key, error)` | `retryableFailure(key, error)`
- `summary()` returns counts per status for UI inspection
- Engine exposes `getServerCallStatus()` for renderers

### Phase 5 — Lost Response / Stale Response (PASS)
- `lastServerRevision` tracks the highest `actionRevision` seen
- `reconcileServerBattle()` rejects projections with `actionRevision < lastServerRevision`
- Terminal state protection: if `b.result !== undefined` and server returns `ACTIVE`, ignore

### Phase 6 — Concurrency / Duplicate Action Audit (PASS)
- Server-side idempotency via `answerRequestId`, `requestKey`, `idempotencyKey` (in `server-state.ts`)
- `ANSWER_REPLAY_CONFLICT`, `BATTLE_ACTION_REPLAY_CONFLICT`, `BATTLE_REWARD_REPLAY_CONFLICT` error codes
- All mutation endpoints have unique constraint on their request key

### Phase 7 — Refresh Recovery (PASS)
- `fetchStateProjection()` fetches authoritative server state (`GET /api/rpg/state`)
- Called post-settlement for cross-device sync
- Returns `activeBattle`, `stats`, `wallet`, `progression`

### Phase 8 — Error Classification (PASS)
- `classifyError(status, code)` returns `PERMANENT | RETRYABLE | UNKNOWN`
- PERMANENT: `UNAUTHENTICATED`, `INVALID_INPUT`, `BATTLE_TERMINAL`, `BATTLE_EXPIRED`, `INTERNAL_ERROR`
- RETRYABLE: status 0 (network), 429 (rate limit), 502/503/504 (gateway)
- Engine uses `classifyError` in reward failure path to set `FAILED` vs `RETRYABLE_FAILURE`

### Phase 9 — Tests (PASS)
- 72/72 assertions in `test-rpg-p2-6h5-network-resilience.ts`
- 10 sections: Timeout (9), Retry (7), RequestKey (7), Lifecycle (12), Stale Response (7), Concurrency (6), Error Classification (10), Refresh Recovery (5), Non-blocking Renderer (3), Previous Gaps (6)

### Phase 10 — Regression (PASS)
- `npx tsc --noEmit` — 0 errors
- `npx eslint` — 0 violations
- `npx prisma validate` — schema valid
- All 4 RPG test suites pass:
  - `test-rpg-p2-6h1-authority-gaps.ts` — 108/108
  - `test-rpg-p2-6h3-flee-defeat.ts` — 50/50
  - `test-rpg-p2-6h4-learning-reconciliation.ts` — 54/54
  - `test-rpg-p2-6h5-network-resilience.ts` — 72/72
- **Total: 284/284 assertions**

## Files Created
- `lib/game/rpg/network-resilience.ts` — NEW (timeout, retry, error classification, PendingServerCalls)
- `scripts/test-rpg-p2-6h5-network-resilience.ts` — NEW (72 tests)

## Files Modified
- `lib/game/rpg/server-api-client.ts` — `fetchServer()` uses `fetchWithTimeout`, new `fetchServerWithRetry()`
- `src/game/rpg/core/game-engine.ts` — `fireServerCall()` rewritten with lifecycle tracking, all 7 call sites updated with explicit keys, `getServerCallStatus()` exposed
- `scripts/test-rpg-p2-6h1-authority-gaps.ts` — Updated F.2/F.3/F.4 assertions to match new lifecycle pattern
- `scripts/test-rpg-p2-6h4-learning-reconciliation.ts` — Updated G.1 assertion (retry loops)
- `package.json` — Added `test:rpg-p2-6h5-network-resilience`

## What Was NOT Changed (Per Constraints)
- No gameplay mechanics, skill logic, damage formula, or enemy behavior
- No artwork files, CSS, or HTML touch
- No GIMBC files
- No production DB, Prisma schema, or Vercel config
- No commits or pushes
- No new dependencies
