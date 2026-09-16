# P2.6H.4 — Learning Feedback & Reconciliation Report

## Status: ✅ COMPLETE

GAP-5 (server learning feedback) and GAP-7 (reconciliation hardening) remediated.
GAP-6 (fire-and-forget) deferred to P2.6H.5 per scope constraint.

## Scope

| Gap | Issue | Severity | Status |
|-----|-------|----------|--------|
| GAP-5 | `submitLearningAnswer()` server response not used for feedback — local evaluation trusted over server | MEDIUM | ✅ FIXED |
| GAP-7 | `reconcileServerBattle()` only applies on success — no terminal state mapping, no stale response protection | MEDIUM | ✅ FIXED |
| GAP-6 | `fireServerCall()` fire-and-forget — no retry/timeout/error logging | MEDIUM | ⏭️ DEFERRED |

## Changes

### GAP-5: Server Learning Feedback (`game-engine.ts:1662`)

**Before:** Server response was fired and forgotten. Local evaluation always won — even if server disagreed.

**After:** When server returns `category: "EVALUATED"`, the server's `evaluation.correct` is compared to the local result. If they disagree:
- `lastLearningFeedback` is updated → next attack uses server's verdict for UI feedback
- `pendingLearning` is updated → next attack's bonus damage uses server's learning signal

```
Server says: evaluation.correct = false
Local said: correct = true
→ lastLearningFeedback becomes { correct: false }
→ pendingLearning becomes { correct: false }
→ Next attack: learning bonus NOT applied (server is authoritative)
```

**Files modified:**
- `src/game/rpg/core/game-engine.ts` — `submitLearningAnswer()` (~line 1662)

### GAP-7: Reconciliation Hardening (`game-engine.ts:349`)

**Before:** `reconcileServerBattle()` applied server HP/turn/phase unconditionally. No protection against stale responses or terminal state reopening.

**After:** Three layers of protection:

#### 1. Stale Response Guard
`let lastServerRevision = -1` tracks the highest `actionRevision` seen. If a server response arrives with `actionRevision < lastServerRevision`, it is silently rejected (early return). This prevents out-of-order background calls from reverting newer authoritative state.

#### 2. Terminal State Protection
Once `b.result` is set (WIN/LOSE/FLED), a server response with `status: "ACTIVE"` is rejected. This prevents stale or mis-ordered responses from reopening a settled battle.

#### 3. Server Status → Local Result Mapping
Server status is mapped to local `RPGBattleResult`:
- `"WON"` → `"WIN"`
- `"LOST"` → `"LOSE"`
- `"FLED"` → `"FLED"`

This ensures the local state reflects terminal transitions even when the local engine didn't process them directly (e.g., server killed enemy via status effect).

**Files modified:**
- `src/game/rpg/core/game-engine.ts` — `reconcileServerBattle()` (~line 349), `let lastServerRevision = -1` (~line 350)

## Defense in Depth (Both Gaps)

Both fixes maintain the layered defense model:

| Layer | GAP-5 | GAP-7 |
|-------|-------|-------|
| Input forgery prevention | `parseSubmitLearningAnswerInput` whitelists only `answer` + `requestKey` | N/A (reconciliation is read-only) |
| Server authoritative | `submitServerLearningAnswer` sends to server; server evaluates | Server projection is source of truth for HP/turn/phase/status |
| Fire-and-forget | Server response updates `lastLearningFeedback`/`pendingLearning` in `.then()` | Stale guard + terminal guard applied before reconciliation |
| Local fallback | Local evaluation proceeds immediately (optimistic) | Local `processCommand` runs immediately (optimistic) |
| Runtime consumption | `getLearningFeedback()` returns latest (local or server-overridden) | `activeBattle.state` reflects latest reconciled state |

## Files Modified

| File | Change |
|------|--------|
| `src/game/rpg/core/game-engine.ts` | `submitLearningAnswer()`: server response updates feedback when disagreeing; `reconcileServerBattle()`: stale guard, terminal protection, status mapping; `let lastServerRevision` |

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `test-rpg-p2-6h1-authority-gaps.ts` | 108 | ✅ ALL PASS |
| `test-rpg-p2-6h4-learning-reconciliation.ts` | 54 | ✅ ALL PASS |
| `test-rpg-p2-6h3-flee-defeat.ts` | 50 | ✅ ALL PASS |
| `npx tsc --noEmit` | 0 errors | ✅ |

## Authority Gap Tracker (Updated)

| Gap | Severity | Status | Fixed In |
|-----|----------|--------|----------|
| GAP-1 | CRITICAL | ✅ FIXED | P2.6H.2 |
| GAP-2 | HIGH | ✅ FIXED | P2.6H.3 |
| GAP-3 | HIGH | ✅ FIXED | P2.6H.3 |
| GAP-4 | HIGH | ✅ FIXED | P2.6H.2 |
| GAP-5 | MEDIUM | ✅ FIXED | **P2.6H.4** |
| GAP-6 | MEDIUM | ⏭️ DEFERRED | P2.6H.5 |
| GAP-7 | MEDIUM | ✅ FIXED | **P2.6H.4** |

**Result: 6/7 gaps fixed. Only GAP-6 (fire-and-forget hardening) remains.**

## Known Limitations

1. **Feedback timing**: If server response arrives after the next attack has already consumed `lastLearningFeedback`, the override reaches the *next* cycle. This is acceptable — the learning signal is a soft bonus, not a hard gate.

2. **Replay protection**: `reconcileServerBattle` accepts `actionRevision >= lastServerRevision`. A replay (same revision) passes the guard and re-applies the same projection (idempotent). This is correct — the server replay returns the same projection.

3. **No stale rejection for learning feedback**: `submitLearningAnswer` does not track `actionRevision` for learning responses. A stale learning response could theoretically override a newer one. This is low-risk because learning feedback only affects bonus damage (not HP/turn/phase).

## Next Step

P2.6H.5: GAP-6 (fire-and-forget hardening) — retry, timeout, error logging for `fireServerCall`.
