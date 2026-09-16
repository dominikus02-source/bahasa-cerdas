# P2.6H.3 — Flee & Defeat Server Authority Remediation

## Summary

Remediated **GAP-2** (flee server wiring) and **GAP-3** (defeat deferred until server reconciliation) in the BahasaCerdas RPG Pendekar battle system. Four files modified, one test script created.

---

## GAP-2: Flee Server Wiring

### Problem
`fleeBattle()` only called `processCommand(BATTLE_ESCAPE)` locally. The server battle session was orphaned — never updated with FLED status, no turn consumed on failed flee, no server reconciliation.

### Solution
Extended `submitAuthoritativeBattleAction` with a dedicated `"flee"` action branch in the server state service, wired the engine to fire the server call in background.

### Changes

| File | Change |
|------|--------|
| `lib/game/rpg/server-contracts.ts:153` | Added `"flee"` to `SubmitBattleActionInput.action` union |
| `lib/game/rpg/server-state.ts:557-608` | New flee branch: parses state/RNG, calls `escapeBattle()` from battle-core, persists FLED/ACTIVE status, creates `pendekarBattleAction` with `actionKind: "flee"` |
| `lib/game/rpg/server-api-client.ts:149` | Added `"flee"` to `submitServerBattleAction()` action param |
| `src/game/rpg/core/game-engine.ts:1782-1800` | `fleeBattle()` now fires `submitServerBattleAction(serverBattleId, "flee", requestKey)` via `fireServerCall()` + `reconcileServerBattle()` |

### Design Decisions
1. **Extended existing `submitAuthoritativeBattleAction`** rather than creating a dedicated endpoint — consistent with how `basic_attack` and `skill` actions work
2. **Flee bypasses learning requirement** — `escapeBattle()` is a pure RNG action, no question to answer
3. **Failed flee persists as ACTIVE** — turn consumed, enemy responds (via `escapeBattle()` internal logic)
4. **Boss restriction enforced server-side** — `escapeBattle()` returns `FLEE_FORBIDDEN_BOSS` for boss enemies

---

## GAP-3: Deferred Defeat Until Server Confirmation

### Problem
`applyDefeatFlow()` was called immediately in `processCommand` ATTACK/USE_ITEM cases before the server could confirm the terminal state. This caused:
- Defeat applied even if server rejected the action
- No opportunity for server to override with authoritative state
- Potential double-apply if server also detected defeat

### Solution
Introduced `pendingDefeat` module-level variable that stores the defeat intent. `applyDefeatFlow()` is only called after server reconciliation confirms `status === "LOST"`.

### Changes

| File | Change |
|------|--------|
| `src/game/rpg/core/game-engine.ts:328` | Added `pendingDefeat: { state, foeId } \| null` module variable |
| `src/game/rpg/core/game-engine.ts:ATTACK case` | Stores `pendingDefeat = { state, foeId }` instead of calling `applyDefeatFlow()` |
| `src/game/rpg/core/game-engine.ts:USE_ITEM case` | Same deferred pattern for battle item use |
| `src/game/rpg/core/game-engine.ts:BATTLE_ESCAPE case` | Stores `pendingDefeat` on LOSE from failed flee |
| `src/game/rpg/core/game-engine.ts:attackBasic()` | After `reconcileServerBattle()`, if `status === "LOST"` → calls `applyDefeatFlow()` with deferred state |
| `src/game/rpg/core/game-engine.ts:attackWithSkill()` | Same settlement after reconciliation |
| `src/game/rpg/core/game-engine.ts:fleeBattle()` | Same settlement after reconciliation |
| `src/game/rpg/core/game-engine.ts:useItem()` (non-battle) | Defeat impossible in non-battle use, no change needed |

### Design Decisions
1. **Deferred, not eliminated** — `applyDefeatFlow()` still runs, just delayed until server confirms
2. **Anti-double-apply preserved** — `appliedBattleIds` Set still guards against duplicate application
3. **pendingDefeat cleared atomically** — `const pd = pendingDefeat; pendingDefeat = null` before calling `applyDefeatFlow()`
4. **Non-battle useItem unchanged** — Defeat is impossible when using items outside battle

---

## Test Results

| Suite | Result |
|-------|--------|
| P2.6H.1 Authority Gap Audit | ✅ 91/91 |
| P2.6H.3 Flee & Defeat Tests | ✅ 50/50 |
| P2.6F Server-State (PostgreSQL) | ✅ 26/26 |
| Battle Core Regression | ✅ 286/287 (1 pre-existing P1.3) |
| TypeScript compilation | ✅ 0 errors |

## Files Modified
- `lib/game/rpg/server-contracts.ts` — action union extended
- `lib/game/rpg/server-state.ts` — flee branch + escapeBattle import
- `lib/game/rpg/server-api-client.ts` — action param extended
- `src/game/rpg/core/game-engine.ts` — pendingDefeat + flee server call + defeat settlement

## Files Created
- `scripts/test-rpg-p2-6h3-flee-defeat.ts` — 50 structural assertions (sections A–I)

## Remaining Gaps (OUT OF SCOPE)
- GAP-5: submitLearningAnswer server response not used for feedback (MEDIUM)
- GAP-6: fireServerCall is fire-and-forget (MEDIUM)
- GAP-7: Server rejection leaves client with stale state (MEDIUM)
