# P2.7.1 — Full Integration Hardening + Commit Gate

## 1. STATUS: GREEN WITH NOTES

The P2.7 implementation is internally consistent, production-safe, correctly
scoped, and ready for founder-approved commit. No blockers. Notes below are
pre-existing debt, transient flakes, or environment limits — none caused by P2.7.

## 2. Repository identity

- pwd: `/Users/user/bahasa-cerdas` ✅
- remote: `https://github.com/dominikus02-source/bahasa-cerdas.git` (fetch+push) ✅
- branch: `main`, HEAD `7a40fbad4259dfa8db5c2cd74974a468c5b6cc24` (= P2.6I.5 baseline, no concurrent commit) ✅
- GIMBC: exists, never entered, untouched ✅

## 3. Baseline commit

`7a40fba` — `feat(rpg): P2.6I.5 server-authoritative inventory & equipment`.

## 4. P2.7 changed files

Modified (tracked): `lib/game/rpg/server-contracts.ts`,
`lib/game/rpg/server-state.ts`, `lib/game/rpg/server-api-client.ts`,
`src/game/rpg/core/game-engine.ts`, `package.json` (1 line).
New: `scripts/test-rpg-p2-7-vertical-slice.ts`,
`prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql`,
`docs/P2_7_VERTICAL_SLICE_IMPLEMENTATION_REPORT.md`.
Deleted: none.

## 5. Files safe to commit

The 4 RPG source files + `package.json` line + 3 new files above (each
classified KEEP in Phase 1; diffs reviewed line-by-line, additive only).

## 6. Files excluded from commit (preserved exactly)

- `next-env.d.ts` (generated artifact), `prisma/schema.prisma` (+239 lines
  other work), all other untracked docs/assets/`components/main-bersama/`/
  `src/main-bersama/`, and the two pre-existing stashes. Untouched.

## 7. DIALOGUE_GOLD audit — PASS

Required by Ki Jaka intro (QUEST 1 + 30G) and report (QUEST 2 + 60G).
Path: dialogue signal → `applyQuestSignals` (client ledger) +
`fireServerCall(mutateQuestState("DIALOGUE_GOLD", unique-key, {amount}))` →
`/api/rpg/quest/mutate` → `parseQuestMutationInput` (allowlist gate) →
`mutateQuestState` (re-validates allowlist, credits `goldBalance` in the
same serializable tx, bumps version) → `getStateProjection` hydration.
Allowlist `[25,30,60,100,200,300]` = exact canonical amounts from
`data/dialogues.ts`. No arbitrary client amount can become authoritative
(parser rejects; service re-validates). Replay = same key → REPLAYED, no
double credit. Owner-only via `getOwnedPendekarPlayer(access.userId)`.
Same architecture as QUEST/FLAG — no duplicate economy logic, no new story.

## 8. Battle action constraint audit — PASS (2 defects fixed)

- **DEFECT-1 (P2.7.0)**: `PendekarBattleAction_kind_check` allowed only
  `(basic_attack,mahapukul)` while contract/service/engine use
  `skill`+`flee` → Postgres 23514 on every skill/flee persist. Fixed by
  widening to exactly the four contract values. Applied LOCAL STAGING ONLY.
- **DEFECT-2 (P2.7.1)**: `parseSubmitBattleActionInput` rejected `"flee"`
  although the type, client, route, and service all carry it → route-level
  flee always 400. Fixed with a one-line parser alignment (no new semantics;
  H.3 flee tests + new checks 41–42 green).
- App code, parser, and (staging) DB now agree. Prisma schema holds no CHECK
  (manual-SQL convention respected). Ownership/security unchanged.

## 9. Vertical slice result — 42/42

`test:rpg-p2-7-vertical-slice.ts` runs the REAL chain against local
PostgreSQL (localhost guard, `PendekarStateService` direct, no mocks, no
hardcoded state): bootstrap → quest start → DIALOGUE_GOLD 30 (+replay,
+invalid rejection) → battle e1 → learning (answer-free) → correct answer →
Mahapukul WIN → receipt → settle → KILL → bijih drop → FLAG → ADVANCE 1→2 →
GOLD 60 → projection → reload stability. Test player restored, 0 ACTIVE
battles left. Includes new Section G (parser + DB kind_check agreement).

## 10. Replay/idempotency result — PASS

battle action (requestKey unique + fingerprint + learningSessionId unique),
learning answer (answerRequestId unique), receipt (idempotencyKey + bySource),
settlement (SETTLED→REPLAYED, receipt-scoped entries), quest/inventory/
equipment/dialogue-gold (in-memory replayGuard + version bump). Existing
I.2 (77) + I.5 (42) suites re-green.

## 11. Server-wins result — PASS

SERVER > cache > legacy > defaults intact (`RPGGame` boot). Gold, XP,
quest, flags, inventory, equipment all hydrate from `/api/rpg/state`.
I.1 suites re-green (94 + 49).

## 12. Economy result — PASS

Victory → receipt (server-derived XP/gold) → atomic settle (XP entry +
wallet entry + player update in one tx; duplicate settle → REPLAYED).
`User.coins` untouched, `globalXp` forced 0 (non-zero rejected),
`itemPlan` settlement explicitly rejected (`assertSettleableBattleReceipt`),
P2.7 does not re-enable it. Item-drop path verified live (bijih row).

## 13. Quest/world-state result — PASS

All 8 kinds (QUEST_ADVANCE, KILL, FLOWER_PICK, FLAG, CHEST_OPEN, BOSS_KILL,
GE_PICK, DIALOGUE_GOLD) go through the one authenticated route, owner-scoped
service, serializable tx, replayGuard, and surface in `getStateProjection`.
I.2 (77) + I.3 (43) re-green.

## 14. Network resilience result — PASS

DIALOGUE_GOLD reuses `fireServerCall(idempotent:true)` + deterministic key +
`fetchServerWithRetry` (same requestKey on retry, PERMANENT stops). No new
abstraction, no unhandled rejection (client wrappers return FetchFail, never
throw). H.5 re-green (72/72).

## 15. Security result — PASS

All five P2.7-touched routes derive `userId` from `access.userId` (server
session). Client controls no identity, amount (allowlisted), quantity
(server-validated catalog), or ownership. Cross-user isolation covered by
existing receipt tests.

## 16. Migration deployment requirement

- FILE: `prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql`
- PURPOSE: align `PendekarBattleAction_kind_check` with the contract
  (`basic_attack,mahapukul,skill,flee`) so skill/flee actions persist.
- EFFECT: drops + re-adds one CHECK; no data change, no row rewrite.
- SAFETY: changes no battle/player/reward data; idempotent
  (`DROP CONSTRAINT IF EXISTS`); no ownership/security weakening.
- ORDER: run BEFORE deploying the app commit (else skill/flee 500 on prod).
- ENVIRONMENT: applied LOCAL STAGING ✅ · PRODUCTION ❌ NOT APPLIED.
- **PRODUCTION MIGRATION REQUIRED BEFORE DEPLOYMENT** — git commit alone
  does not deploy the constraint.

## 17. Full regression result

30+ suites green (P2.7 42, I.5 42, I.3 43, I.2 77, I.1 94+49, H.3/H.4/H.5,
battle/learning/quest/economy/world/founder-preview families).
Pre-existing (stash-verified on baseline): H.1 D.3–D.5 (static-pattern
drift), interaction-runtime #35 (naive wallet regex vs comments + I.1
projection field), P2.6C save-assertion (`saved.` vs `legacySave.`).
Flaky/transient: reward-receipt concurrency P2028 pool timeout (27/27 on
re-run). No P2.7-introduced failures.

## 18. TypeScript result — PASS

`npx tsc --noEmit` EXIT 0 whole project (an earlier 5-error stale-client
blip in unrelated `src/main-bersama/` WIP cleared after `prisma generate`;
0 errors in any RPG/P2.7 file throughout).

## 19. ESLint result — PASS

0 violations on all touched files (4 impl + test + migration-adjacent).

## 20. Scope safety result — PASS

`git diff --name-only` = 4 RPG files + package.json line (+2 pre-existing
untracked-infra files excluded). No registry/arena/AI/teacher/billing change.
GIMBC untouched. Production DB untouched (0 writes; local staging only).

## 21. Deferred multi-turn learning decision

CURRENT: one answered learning → exactly one battle action (enforced by
`learningSessionId` uniqueness). VALID for the slice (Mahapukul one-shot).
FUTURE multi-turn battle/learning needs separate gameplay design — recorded
as deferred DECISION, not a bug. No semantics changed.

## 22. Exact proposed commit manifest

```
git add lib/game/rpg/server-contracts.ts lib/game/rpg/server-state.ts \
  lib/game/rpg/server-api-client.ts src/game/rpg/core/game-engine.ts \
  package.json scripts/test-rpg-p2-7-vertical-slice.ts \
  prisma/migrations/manual/2026-09-18_p2_7_pendekar_battle_action_kind.sql \
  docs/P2_7_VERTICAL_SLICE_IMPLEMENTATION_REPORT.md \
  docs/P2_7_1_INTEGRATION_HARDENING_GATE.md
git commit -m "feat(rpg): P2.7 playable vertical slice hardening"
```

(Excluded: `next-env.d.ts`, `prisma/schema.prisma`, all other untracked work.)

## 23. Founder decision required

1. Approve the commit manifest above (or adjust).
2. Run the §16 migration SQL on PRODUCTION BEFORE deploy (else skill/flee
   server actions 500 there).
3. Optional follow-ups (not blockers): stale-assertion debt (H.1 D.3–D.5,
   interaction #35, P2.6C save check), multi-turn learning design, founder
   playtest on staging.
