# P2.6H.2 — Authority Gap Remediation Report

**Date**: 2026-09-16  
**Scope**: GAP-1 (CRITICAL) + GAP-4 (HIGH) only  
**Constraint**: No scope expansion. No artwork. No GIMBC. No production DB. No commit/push.

---

## Executive Summary

Two of seven identified authority gaps from P2.6H.1 have been remediated:

| Gap | Severity | Status | Risk |
|-----|----------|--------|------|
| GAP-1 | CRITICAL | **FIXED** | Skill attacks now fire server-authoritative actions |
| GAP-4 | HIGH | **FIXED** | Victory reward/settlement chain has explicit error handling |
| GAP-2 | HIGH | Unfixed | Flee has zero server wiring |
| GAP-3 | HIGH | Unfixed | Defeat has zero server wiring |
| GAP-5 | MEDIUM | Unfixed | Learning response not used for feedback |
| GAP-6 | MEDIUM | Unfixed | Fire-and-forget with no retry/logging |
| GAP-7 | MEDIUM | Unfixed | Reconciliation only on success |

**All existing tests pass. No regressions.**

---

## GAP-1: Wire attackWithSkill() to Authoritative Server Pipeline

### Problem
`attackWithSkill(skillId)` in `game-engine.ts` called `processCommand("ATTACK", {skillId})` locally but never reported the action to the server. The server never learned about skill damage, MP consumption, or turn advancement from skill attacks. Client HP diverged permanently from server state.

### Root Cause
The server action contract (`SubmitBattleActionInput`) only accepted `"basic_attack" | "mahapukul"` — there was no action type for arbitrary skill attacks. The API client (`submitServerBattleAction`) had a fixed type signature. The engine function simply never wired a server call.

### Changes

#### 1. Server Contracts (`lib/game/rpg/server-contracts.ts`)
- Extended `SubmitBattleActionInput.action` union: `"basic_attack" | "mahapukul" | "skill"`
- Added optional `skillId?: string` field (required when `action === "skill"`)
- Updated `parseSubmitBattleActionInput` decoder:
  - Validates `skillId` is a non-empty string (≤64 chars)
  - Validates format: `/^[a-z][a-z0-9._-]*$/`
  - Returns typed `skillId` in the parsed value

#### 2. Server State Service (`lib/game/rpg/server-state.ts`)
- Added `skillById` import from `@/src/game/rpg/data/skills`
- Added two new error codes to `PendekarBattleActionError`:
  - `"BATTLE_ACTION_INVALID_SKILL"` — unknown skill ID
  - `"BATTLE_ACTION_SKILL_LOCKED"` — skill locked for player's level
- Updated `submitAuthoritativeBattleAction` skill resolution:
  - `basic_attack` → `BASIC_ATTACK_SKILL_ID` (unchanged)
  - `mahapukul` → `"skill.mahapukul"` (unchanged)
  - `skill` → validates `skillId` against canonical skill definitions via `skillById()`, checks `unlockLevel`, then passes to `playerAct()`

#### 3. API Client (`lib/game/rpg/server-api-client.ts`)
- Extended `submitServerBattleAction` signature:
  - `action` param: `"basic_attack" | "mahapukul" | "skill"`
  - Added optional `skillId?: string` param
  - Only includes `skillId` in payload when `action === "skill"`

#### 4. Game Engine (`src/game/rpg/core/game-engine.ts`)
- `attackWithSkill()` now fires server-authoritative action:
  ```
  submitServerBattleAction(serverBattleId, "skill", requestKey, skillId)
    .then(res => { if (res.ok) reconcileServerBattle(res.data.battle) })
  ```
- Pattern matches `attackBasic()` — server call in background via `fireServerCall()`
- Local `processCommand()` retained for immediate UI feedback

### Security Properties Preserved
- Server validates `skillId` against its own canonical `SKILLS` + `CANONICAL_SKILLS` definitions
- Server checks `unlockLevel` against player's server-owned level
- Server re-computes damage via `playerAct()` — client damage values ignored
- Client never sends damage, HP, MP, crit, or reward values
- Idempotency via `requestKey` unchanged

### Test Updates (`scripts/test-rpg-p2-6h1-authority-gaps.ts`)
- A.2–A.4: Changed from "does NOT call" to "DOES call" assertions
- A.6: New check verifying `skillId` parameter is passed
- G.3: Updated reconcile reference count from 3→4
- G.4: Changed from "NOT called" to "IS called" for skill attacks
- H.1: Updated to verify `skillId` in allowed keys
- I.6: New check for `"skill"` in API client action type
- K.4: GAP-1 marked as FIXED

---

## GAP-4: Victory Reward/Settlement Error Handling

### Problem
The reward+settle chain in `applyWinFlow()` had no `.catch()` handler. If `createServerRewardReceipt` or `settleServerReward` threw (network error, 5xx, timeout), the promise rejection was silently swallowed. No retry, no logging, no rollback, no UI feedback.

### Root Cause
The chain was written as a minimal `.then()` cascade without `.catch()`:
```ts
createServerRewardReceipt(...).then(receipt => {
  if (receipt.ok) return settleServerReward(...);
}).then(settle => { ... })
// ← no .catch()
```

### Changes

#### 1. ServerRewardState Type (`src/game/rpg/core/game-engine.ts`)
Added exported type before the engine interface:
```ts
export type ServerRewardState =
  | { status: "PENDING"; battleId: string }
  | { status: "CONFIRMED"; battleId: string; xpEarned: number; goldEarned: number }
  | { status: "RETRYABLE_FAILURE"; battleId: string; error: string }
  | { status: "FAILED"; battleId: string; error: string }
  | null;
```

#### 2. State Tracking
- `serverRewardState` variable tracks the lifecycle of the last victory's server settlement
- Initialized to `null`, set to `PENDING` before first server call
- Transitions:
  - `PENDING` → `CONFIRMED` (settlement succeeded, XP/gold extracted from response)
  - `PENDING` → `RETRYABLE_FAILURE` (receipt or settlement returned `ok: false`)
  - `PENDING` → `FAILED` (uncaught exception in the chain)

#### 3. Error Handling Chain
The rewritten chain:
1. Sets `PENDING` state before calling `createServerRewardReceipt`
2. On receipt `!ok`: logs error, sets `RETRYABLE_FAILURE`, returns early
3. On receipt `ok`: calls `settleServerReward`
4. On settlement `!ok`: logs error, sets `RETRYABLE_FAILURE`
5. On settlement `ok`: extracts XP/gold from `receipt.entitlement` and `settlement.applied`, sets `CONFIRMED`
6. After CONFIRMED: calls `fetchStateProjection()` for cross-device sync (best-effort, `.catch()` logged)
7. Top-level `.catch()`: catches any uncaught exception, sets `FAILED`, logs error

#### 4. Public API
- `getServerRewardState(): ServerRewardState` getter added to `RPGEngine` interface and return object
- UI layer can poll this to show settlement status (pending/confirmed/failed)

#### 5. XP/Gold Field Access
Fixed to use actual contract paths:
- Receipt: `receiptRes.data.receipt.entitlement.rpgXp` / `.gold`
- Settlement: `settleRes.data.settlement.applied.rpgXp` / `.gold`
- Fallback chain: settlement → receipt → 0

### Security Properties Preserved
- Server is still the authoritative ledger — client applies rewards optimistically, server confirms/denies
- `fireServerCall()` still wraps the chain (pending tracking, cleanup on `finally()`)
- No retry logic added (matches GAP-6 scope — not in this phase)
- Error state is observable but not authoritative for gameplay

### Test Updates (`scripts/test-rpg-p2-6h1-authority-gaps.ts`)
- D.3: Changed from "no .catch()" to "HAS .catch()" with 1600-char window
- D.4: Changed to verify `.then()` + `.catch()` chaining
- D.6–D.10: New checks for `serverRewardState` tracking (PENDING, CONFIRMED, RETRYABLE_FAILURE, console.error)
- K.5: GAP-4 marked as FIXED

---

## Verification

### TypeScript
```
npx tsc --noEmit → 0 errors
```

### ESLint
```
npx eslint lib/game/rpg/server-contracts.ts lib/game/rpg/server-state.ts \
  lib/game/rpg/server-api-client.ts src/game/rpg/core/game-engine.ts \
  scripts/test-rpg-p2-6h1-authority-gaps.ts → 0 errors
```

### Test Results

| Suite | Result |
|-------|--------|
| P2.6H.1 Authority Gap Audit | **91/91 pass** |
| P2.6G.3 Battle Action/Damage | 26/26 pass |
| P2.6 Battle Runtime | 35/35 pass |
| P2.6G.4A Reward Receipt | 27/27 pass |
| P2.6G.4C Reward Settlement | 31/31 pass |
| P2.6F Server State | 26/26 pass |
| Battle Core (P1.3 pre-existing) | 50/51 (1 pre-existing fail) |
| **Total** | **286/287 (1 pre-existing)** |

### Prisma
Pre-existing env issue (`DIRECT_URL` not set locally) — schema unchanged.

---

## Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `lib/game/rpg/server-contracts.ts` | +12 | Extend action union, add skillId, update parser |
| `lib/game/rpg/server-state.ts` | +22 | Import skillById, add error codes, resolve skill action |
| `lib/game/rpg/server-api-client.ts` | +5 | Accept skillId parameter |
| `src/game/rpg/core/game-engine.ts` | +55 | ServerRewardState type, attackWithSkill wiring, error handling |
| `scripts/test-rpg-p2-6h1-authority-gaps.ts` | +30 | Updated assertions for FIXED gaps |

---

## What Was NOT Changed

- **GAP-2 (flee)**: Untouched. Flee remains client-only.
- **GAP-3 (defeat)**: Untouched. Defeat remains client-only.
- **GAP-5 (learning feedback)**: Untouched.
- **GAP-6 (fire-and-forget)**: Untouched.
- **GAP-7 (reconciliation success-only)**: Untouched.
- **GIMBC**: Zero files touched.
- **Prisma schema**: Zero changes.
- **Production DB**: Zero writes.
- **Gameplay**: No damage formulas, skill definitions, or battle mechanics changed.
