# P2.6H.1 — Runtime Authority Forensic Audit & Hardening

**Date**: September 14, 2026  
**Scope**: game-engine.ts authority gap analysis  
**Status**: COMPLETE — 77/77 test checks pass, 7 gaps documented for remediation

---

## 1. Objective

Audit whether the P2.6H server wiring is genuinely server-authoritative or merely optimistic background calls. Identify authority gaps, fire-and-forget risks, race conditions, and security issues. Fix discovered gaps without weakening contracts.

## 2. Executive Summary

P2.6H introduced 6 server API calls to the RPG battle engine. This audit discovered **7 authority gaps** — places where the server's authority is weakened, bypassed, or silently swallowed. No new code was written to fix these gaps (per audit constraints); instead, all gaps are documented with severity classifications and remediation recommendations.

**Key finding**: The engine has a **dual-authority architecture** — the client resolves damage locally via `battle-core.ts` while the server resolves it authoritatively via `PendekarStateService`. Only `startEncounterBattle` and `attackBasic` report to the server. The remaining 5 battle actions (skill attack, flee, defeat, learning answer feedback, settlement error handling) operate purely client-side.

## 3. Authority Gap Classification

| ID | Severity | Function | Gap | Impact |
|----|----------|----------|-----|--------|
| GAP-1 | **CRITICAL** | `attackWithSkill()` | ZERO server wiring | Skill damage/MP never reported to server; server battle state diverges from client |
| GAP-2 | **HIGH** | `fleeBattle()` | ZERO server wiring | Server battle orphaned, never settled or reconciled |
| GAP-3 | **HIGH** | `applyDefeatFlow()` | ZERO server wiring | Defeat never reported; server battle orphaned; player state out of sync |
| GAP-4 | **HIGH** | `applyWinFlow()` | No `.catch()` on reward+settle chain | Silent swallow on settlement failure; client shows victory but server has no reward record |
| GAP-5 | **MEDIUM** | `submitLearningAnswer()` | Server response not used for feedback | Local evaluation trusted over server; server answer correctness ignored for UI |
| GAP-6 | **MEDIUM** | `fireServerCall()` | Fire-and-forget (no retry, timeout, logging, drain) | Lost server calls silently vanish; no observability |
| GAP-7 | **MEDIUM** | `reconcileServerBattle()` | Only called on server success | Server rejection leaves client with stale state; no error recovery path |

## 4. Server Wiring Status by Function

| Function | Local Resolution | Server Report | Server Reconcile | Server Reward |
|----------|:---:|:---:|:---:|:---:|
| `startEncounterBattle()` | ✅ | ✅ startServerBattle | ✅ on success | — |
| `attackBasic()` | ✅ | ✅ submitServerBattleAction | ✅ on success | — |
| `attackWithSkill()` | ✅ | ❌ | ❌ | — |
| `fleeBattle()` | ✅ | ❌ | ❌ | — |
| `applyWinFlow()` | ✅ | — | — | ✅ receipt → settle (no .catch) |
| `applyDefeatFlow()` | ✅ | ❌ | ❌ | — |
| `submitLearningAnswer()` | ✅ | ✅ submitServerLearningAnswer | ❌ (response unused) | — |

## 5. Detailed Gap Analysis

### GAP-1: attackWithSkill() — CRITICAL

`attackWithSkill()` resolves damage locally via `playerAct()` from `battle-core.ts`, then calls `processCommand("BATTLE_DAMAGE")` to apply it. It never calls `submitServerBattleAction()`, `reconcileServerBattle()`, or `fireServerCall()`.

**Consequence**: Server's `PendekarStateService` never sees skill damage or MP consumption. Server battle state (`hp`, `mp`, `turnCount`) diverges from client. If the server later validates the battle for reward settlement, it may reject or produce inconsistent results.

**Remediation**: Wire `attackWithSkill()` to call `submitServerBattleAction()` with `action: "skill"` and report the server's authoritative damage result (similar to `attackBasic()`).

### GAP-2: fleeBattle() — HIGH

`fleeBattle()` calls `processCommand("BATTLE_ESCAPE")` locally. It never reports to the server or attempts to settle/reconcile the server battle.

**Consequence**: Server battle persists indefinitely. If server has expiry/cleanup, the battle may eventually be garbage-collected without proper settlement. Player's server-side `battleId` becomes stale.

**Remediation**: After successful local escape, fire a server escape action (if API supports it) or settle the battle as abandoned.

### GAP-3: applyDefeatFlow() — HIGH

`applyDefeatFlow()` calls `clearLearning()` and `processCommand("BATTLE_DEFEAT")` locally. It never reports defeat to the server.

**Consequence**: Server battle is orphaned — never settled. Server may hold resources (pending reward, battle state) indefinitely. Player's server-side `battleId` becomes stale.

**Remediation**: After defeat, fire a server defeat action or settle the battle. Consider adding a server-side `abandonBattle()` endpoint for cleanup.

### GAP-4: Victory Settlement Error Handling — HIGH

The reward+settle chain in `applyWinFlow()`:
```ts
createServerRewardReceipt(serverBattleId, {...}).then((receipt) => {
  settleServerReward(receipt.id, requestKey).then((settle) => {
    // success path
  });
  // NO .catch() on either promise
});
// NO .catch() on outer promise either
```

**Consequence**: If receipt creation or settlement fails (network error, server 500, timeout), the error is silently swallowed. Client has already shown victory + granted local rewards. Server has no reward record. Settlement is one-way — no retry.

**Remediation**: Add `.catch()` handlers that log the failure. Consider a retry mechanism or a pending-settlement queue.

### GAP-5: Learning Answer Feedback — MEDIUM

`submitLearningAnswer()` sends the answer to the server via `submitServerLearningAnswer()` in the background, but the server response is never used. The local `processCommand("SUBMIT_LEARNING_ANSWER")` determines the feedback shown to the user.

**Consequence**: Server's authoritative answer evaluation is ignored for UI. If local evaluation differs from server (e.g., different grading logic), the user sees incorrect feedback.

**Remediation**: Consider using the server response to override or validate local feedback. Alternatively, document this as an intentional design choice (local-first UX).

### GAP-6: Fire-and-Forget — MEDIUM

`fireServerCall()` adds promises to `pendingServerCalls` (a Set) and removes them on `finally()`. It has no retry logic, no timeout, no error logging, and no public API for external drain/wait.

**Consequence**: Failed server calls vanish silently. No observability. If the app unloads before promises settle, calls are lost. `pendingServerCalls` is private — no component can wait for pending calls.

**Remediation**: Add error logging (at minimum `console.warn`). Consider adding a timeout. Expose a `waitForPendingServerCalls()` for beforeunload or page transitions.

### GAP-7: Reconciliation Success-Only — MEDIUM

`reconcileServerBattle()` is only called inside `.then()` success paths (after `res.ok` check). If the server rejects the action (4xx/5xx), no reconciliation occurs.

**Consequence**: Client state diverges from server when server rejects an action. Client may continue with stale HP/MP/position. The rejection is silently ignored.

**Remediation**: On server rejection, either retry the action, force a full state refresh from server, or show an error to the user.

## 6. Contract Surface Verification

All 5 server input types were verified clean — none contain `hp`, `damage`, `xp`, `gold`, or other authority-leaking fields:

| Input Type | Clean? |
|-----------|:---:|
| `StartBattleInput` | ✅ |
| `SubmitLearningAnswerInput` | ✅ |
| `SubmitBattleActionInput` | ✅ |
| `CreateBattleRewardReceiptInput` | ✅ |
| `SettleBattleRewardInput` | ✅ |

The server API client (`server-api-client.ts`) does NOT contain `computeDamage`, `grantXp`, or `creditGold` — pure transport layer only.

## 7. Test Results

```
P2.6H.1 Authority Gap Audit: 77 lulus, 0 gagal
✅ All structural invariants verified. Gaps documented for remediation.
```

**Verification gates**:
- `tsc --noEmit` — ✅ 0 errors
- `prisma validate` — ⚠️ pre-existing env issue (missing `DIRECT_URL`)
- `test:rpg-battle-core` — ⚠️ pre-existing P1.3 failure (engine imports battle types — expected from P2.6H)

## 8. Files

| File | Role |
|------|------|
| `scripts/test-rpg-p2-6h1-authority-gaps.ts` | 77-check static source analysis (sections A-L) |
| `src/game/rpg/core/game-engine.ts` | Primary audit target (~1790 lines) |
| `lib/game/rpg/server-api-client.ts` | API client — verified clean |
| `lib/game/rpg/server-state.ts` | Server state service — verified authoritative |
| `lib/game/rpg/server-contracts.ts` | Server contracts — verified clean |
| `lib/game/rpg/server-access.ts` | Auth gate — verified functional |

## 9. Remediation Priority

| Priority | Gap | Effort | Risk if Deferred |
|----------|-----|--------|-----------------|
| P0 | GAP-1 (skill attack wiring) | Medium | Server battle state diverges permanently on skill use |
| P0 | GAP-4 (settlement .catch) | Low | Silent reward loss on network failure |
| P1 | GAP-2 (flee server report) | Medium | Orphaned server battles |
| P1 | GAP-3 (defeat server report) | Medium | Orphaned server battles |
| P2 | GAP-5 (learning feedback) | Low | Cosmetic — local-first UX intentional? |
| P2 | GAP-6 (fire-and-forget logging) | Low | No observability |
| P2 | GAP-7 (reconciliation error path) | Low | Stale state on server rejection |

## 10. Recommendation

P2.6H.1 audit is complete. The 7 gaps are documented with severity and remediation paths. **No code changes were made** — all gaps are preserved for the founder's decision on remediation priority.

Next phase (if approved): P2.6H.2 — Remediate GAP-1 (skill attack wiring) and GAP-4 (settlement error handling), as these are the highest-impact gaps with lowest implementation effort.
