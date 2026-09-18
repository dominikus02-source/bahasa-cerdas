# P2.7.0 — Pendekar Suryakerta Playable Vertical Slice — Implementation Report

## 1. Existing Systems Used

No system was rebuilt. The slice connects these existing modules:

| System | Canonical module |
|--------|------------------|
| Spawn / world geometry | `src/game/rpg/data/world-maps.ts` (map.desa), `world/map-loader.ts`, `world/collision.ts` |
| Slice config | `src/game/rpg/data/vertical-slice.ts` (spawn 12,19 · ki · e1-e3 · 3 wins) |
| NPC / dialogue | `data/npcs.ts`, `data/dialogues.ts` (Ki Jaka trees), `interaction/dialogue.ts` (branch selection) |
| Engine | `src/game/rpg/core/game-engine.ts` (MOVE/INTERACT/ATTACK/SUBMIT_LEARNING_ANSWER/USE_ITEM/DIALOGUE_*/SHOP_*/FORGE_*/EQUIP) |
| Encounter / battle | `combat/encounter.ts`, `combat/battle-engine.ts`, `combat/battle-core.ts`, `combat/battle-apply.ts` |
| Learning | `learning/learning-runtime.ts`, `learning/learning-trigger.ts`, `learning/learning-effect.ts` |
| Quest | `quests/quest-engine.ts` (transitions), `quests/flags.ts` |
| Rewards / economy | `economy/economy.ts`, `economy/rewards.ts` |
| Persistence | `core/persistence.ts` (cache + legacy), server snapshot wins |
| Server authority | `lib/game/rpg/server-state.ts` (PendekarStateService), `server-contracts.ts`, `server-api-client.ts`, `network-resilience.ts` |
| UI | `ui/RPGGame.tsx`, `RPGGameHUD.tsx`, `RPGQuestPanel.tsx`, `RPGDialogue.tsx`, `RPGBattle.tsx`, `RPGBattleLearning.tsx` |
| Access | `lib/game/rpg/server-access.ts` (founder preview), `lib/arena/game-registry.ts` (unpublished) |

Dependency map: `RPGGame` → `createEngine` → world/interaction/combat/learning/quest/economy/player/persistence → `server-api-client` (fire-and-forget) → `/api/rpg/*` → `PendekarStateService` → Prisma (`PendekarPlayer` + related).

## 2. Vertical Slice Flow

```
SPAWN map.desa (12,19)
  → EXPLORE (MOVE + collision)
  → TALK KI JAKA (INTERACT facing 6,15 → DIALOGUE, branch intro)
  → QUEST START (QUEST 1 + GOLD 30, server-synced)
  → ENCOUNTER e1/e2/e3 (INTERACT facing → startEncounterBattle)
  → BATTLE START (server battle + learning challenge, answer-free)
  → LEARNING (submit correct answer → EVALUATED + evidence)
  → MAHAPUKUL + correct (1.5x skill-only × 2.2x atk → one-shot Korog 25 HP)
  → BATTLE RESULT WON
  → REWARD RECEIPT + SETTLE (server XP/gold persisted)
  → KILL ×3 (server kills) + battle-drop bijih (server inventory) + FLAG (server world)
  → QUEST COMPLETION (talk Ki at kills=3 → report → QUEST 2 + GOLD 60, server-synced)
  → PROJECTION (getStateProjection: quest/kills/gold/inventory/equipment)
  → RELOAD (server snapshot wins → identical state)
```

## 3. Wiring Changes

### 3a. DIALOGUE_GOLD server authority (the slice's only client-authoritative mutation)

Ki Jaka's intro (30G) and report (60G) were applied via local `creditGold` only — server `goldBalance` never updated, so dialogue gold vanished on reload. Fixed by extending the EXISTING quest-mutation authority (no new layer):

- `lib/game/rpg/server-contracts.ts`: `"DIALOGUE_GOLD"` added to `QuestMutationKind`; `amount?: number` on `QuestMutationInput`; `DIALOGUE_GOLD_ALLOWLIST = [25, 30, 60, 100, 200, 300]` (exact canonical amounts from `data/dialogues.ts` — no invention); parser rejects anything else.
- `lib/game/rpg/server-state.ts`: `mutateQuestState` selects `goldBalance`, validates amount against the allowlist (defense in depth), credits balance, bumps version. Replay guard (existing) makes each key single-grant.
- `lib/game/rpg/server-api-client.ts`: `mutateQuestState` accepts `amount` option.
- `src/game/rpg/core/game-engine.ts`: `applyQuestSignals` fires `mutateQuestState("DIALOGUE_GOLD", unique-key, { amount })` per GOLD signal, fire-and-forget like QUEST/FLAG.

### 3b. Battle-action kind_check (dead end found by the P2.7 test)

The P2.7 integration test exposed a REAL blocker: `PendekarBattleAction_kind_check` allowed only `('basic_attack','mahapukul')`, but the contract + service + engine all use `'skill'` (Mahapukul via skill path) and `'flee'`. Every skill/flee server action threw Postgres 23514 — server battles could never persist non-basic actions.

- `prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql`: widens CHECK to exactly the four contract values `('basic_attack','mahapukul','skill','flee')`. Applied to LOCAL staging only. **Founder must run the same file on production before skill/flee server actions can persist there.**

## 4. State Authority Chain

Battle → Learning → Result → Reward → Inventory → Quest → World → Player: every step server-validated. Dialogue QUEST/FLAG/GOLD sync via quest mutation; battle via battle/learning/action/receipt/settle chain; drops via inventory mutation; equipment via P2.6I.5. The only remaining client-only dialogue effects in the slice are REST (heal, prototype-verbatim, no persistence implication) and SKILL (recorded only). DIALOGUE ITEM signals are unreachable in the slice (`allowedNpcIds=[ki]`, Ki has no ITEM effects) — documented MISSING, not fixed.

Server combat semantic confirmed by implementation: **one answered learning → exactly one battle action** (`learningSessionId` unique). Canonical slice kill: correct answer + Mahapukul one-shots Korog (min 27 dmg vs 25 HP at min variance, no crit needed).

## 5. Persistence

Server snapshot > localStorage cache > legacy save (`RPGGame` boot). Save checkpoints on `BATTLE_END` + `DIALOGUE_END`. Test proves projection stability across reads (checks 37–38) and player-row restore after the run.

## 6. UI Integration

No UI built or redesigned. Existing panels verified wired: quest-accept notice ("Misi diterima…"), report notice, victory notice (+XP/+G), `RPGQuestPanel`, `RPGDialogue`, `RPGBattle`, `RPGBattleLearning`, HUD polling.

## 7. Founder Preview

RPG stays `unpublished: true` in registry; quest/inventory/equipment/battle/state/pool routes all behind `requireRpgFounderPreviewApiAccess`. No publication change.

## 8. Tests

`scripts/test-rpg-p2-7-vertical-slice.ts` — **40/40 PASS** (package script `test:rpg-p2-7-vertical-slice`):
- A (1–4) slice scope · B (5–10) quest loop pure · C (11–12) encounter/battle/learning boundaries
- D (13–20) engine wiring static proofs · E (21–38) REAL local-PostgreSQL chain: bootstrap → quest start → DIALOGUE_GOLD 30 + replay + invalid rejection → battle e1 → learning (no key leak) → correct answer → Mahapukul WIN → receipt → settle → KILL → bijih drop → FLAG → ADVANCE 1→2 → GOLD 60 → projection → reload stability (test player restored, 0 ACTIVE battles left)
- F (39–40) founder preview guards

## 9. Regression

| Suite | Result | Category |
|-------|--------|----------|
| P2.7 vertical slice (new) | 40/40 | ✅ REAL PASS |
| P2.6I.5 inventory/equipment | 42/42 | ✅ REAL PASS |
| P2.6I.3 world state | 43/43 | ✅ REAL PASS |
| P2.6I.2 quest mutation | 77/77 | ✅ REAL PASS |
| P2.6I.1 state projection / server-wins | 94/94 · 49/49 | ✅ REAL PASS |
| P2.6H.3 flee/defeat, H.4 reconciliation, H.5 network | ✅ · ✅ · 72/72 | ✅ REAL PASS |
| All other test:rpg-* (battle-core/runtime, interaction, economy, quest-progression, learning ×5, vertical-slice, visual, pickup, asset, founder-preview, P2.6C1, server-state, G.1, G.2, battle-action-damage, reward-settlement, phase1a/1b, unpublished, world-maps/runtime) | PASS | ✅ REAL PASS |
| P2.6H.1 authority-gaps (D.3/D.4/D.5) | 3 fail | ⚠️ PRE-EXISTING (stash-verified on baseline 7a40fba; static-pattern drift in victory-chain checks, untouched by P2.7) |
| interaction-runtime check 35 (wallet/saldo regex) | 1 fail | ⚠️ PRE-EXISTING (stash-verified; naive regex hits comments + P2.6I.1 `wallet` projection field) |
| P2.6C vertical-slice (`saved.world.mapId`) | 1 fail | ⚠️ PRE-EXISTING (stash-verified; stale assertion — P2.6I.1 renamed to `legacySave`) |
| reward-receipt concurrency section (P2028 pool timeout) | flaky | ⚠️ UNRELATED/TRANSIENT (27/27 on re-run; local pool contention under Promise.all) |
| tsc | 0 errors in RPG/P2.7 files; 5 errors in `src/main-bersama/` | ⚠️ UNRELATED (untracked other-team WIP, present before P2.7) |
| eslint (4 impl files + new test) | 0 violations | ✅ |
| prisma validate/generate | blocked, no DIRECT_URL in shell | ⚠️ ENVIRONMENTAL (shell masks secrets; schema.prisma untouched by P2.7) |

## 10. Files Changed

Modified (4): `lib/game/rpg/server-contracts.ts` (+DIALOGUE_GOLD kind/amount/allowlist/parser), `lib/game/rpg/server-state.ts` (+gold select/apply/persist), `lib/game/rpg/server-api-client.ts` (+amount option), `src/game/rpg/core/game-engine.ts` (+DIALOGUE_GOLD fire), `package.json` (+1 test script).
Created (3): `scripts/test-rpg-p2-7-vertical-slice.ts`, `prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql`, this report.
Pre-existing working-tree changes (`prisma/schema.prisma`, `next-env.d.ts`, `src/main-bersama/`, stashes) were NOT touched.

## 11. Remaining Gaps

1. **Production DDL pending**: run `2026-09-18_p2_7_pendekar_battle_action_kind.sql` on production (founder-gated) or skill/flee server actions 500 there.
2. DIALOGUE ITEM server sync: unreachable in slice; needed only if shop-NPCs enter the slice later.
3. Multi-turn server battles: impossible by current one-learning-one-action rule — fine for the slice (one-shot kill), a design question for stronger enemies.
4. Pre-existing failures above (H.1 D.3–D.5, interaction-35, P2.6C save-assertion) are stale-assertion debt, not slice blockers.

## 12. Founder Playtest Readiness

READY for controlled founder preview on staging: spawn → Ki → quest → 3× Korog (answer + Mahapukul each) → report → quest 2, all persisted server-side, survives reload. Requires founder-preview access; still unpublished.

## 13. Recommended Next Phase

P2.7.1 Founder Playtest (manual browser pass on staging) → then multi-turn server learning (design decision) → stronger enemies → shop/forge in-slice.

---

FINAL REPORT:

STATUS: GREEN — vertical slice integrated, tested 40/40, no commit per mission
VERTICAL_SLICE: SPAWN→KI→QUEST→E1→BATTLE→LEARNING→MAHAPUKUL→WIN→REWARD→KILL→REPORT→QUEST2→RELOAD-RESTORED
FLOW: all 14 steps EXISTS+CONNECTED (2 defects found and fixed)
BATTLE: server-authoritative start/action/resolution; one-learning-one-action; Mahapukul+correct one-shots Korog
LEARNING: server-selected, answer-free challenge; evidence-verified; CORRECT=1.5x skill-only
REWARD: receipt + settle server-side; XP/gold persisted; replay-safe
INVENTORY: P2.6I.5 chain (bijih drop persisted in slice run)
QUEST: QUEST_ADVANCE/KILL/FLAG + new DIALOGUE_GOLD, all server-side
WORLD: flags/chests/boss/GE via P2.6I.3; FLAG verified in slice run
PERSISTENCE: server snapshot wins; projection stable across reads; test player restored
UI: existing panels only, notices verified statically
FOUNDER_PREVIEW: unpublished kept; all routes gated
TESTS: 40/40 new + full regression (3 pre-existing + 1 flaky + unrelated/env noted)
TSC: 0 in RPG/P2.7 files (5 unrelated in src/main-bersama WIP)
LINT: 0 violations on touched files
PRISMA: validate blocked by missing DIRECT_URL in shell (environmental; schema untouched)
PRODUCTION_DB: 0 writes (local staging only; test player restored)
GIMBC: untouched
FILES_CHANGED: 4 modified + 1 package.json line + 3 created (test, migration SQL, report)
UNRELATED_WORK: schema.prisma / next-env.d.ts / src/main-bersama / stashes — not touched
COMMIT: none (per mission — awaiting instruction)
PUSH: none (per mission — awaiting instruction)
