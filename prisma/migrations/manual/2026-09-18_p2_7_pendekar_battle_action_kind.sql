-- P2.7 — widen PendekarBattleAction actionKind CHECK to the contract values.
--
-- The SubmitBattleActionInput contract (lib/game/rpg/server-contracts.ts)
-- allows four actions: 'basic_attack' | 'mahapukul' | 'skill' | 'flee'.
-- The P2.6G.3 CHECK only allowed ('basic_attack', 'mahapukul'), so every
-- server-persisted 'skill' action (Mahapukul via the engine's skill path)
-- and every 'flee' action violated the constraint (Postgres 23514).
-- The service writes input.action verbatim after validating skillId
-- against canonical definitions, so widening to exactly the four
-- contract values aligns the DB with the contract. No new semantics.
--
-- Apply only to an approved non-production PostgreSQL database first;
-- run the same statement on production only after founder approval.

BEGIN;

ALTER TABLE "PendekarBattleAction" DROP CONSTRAINT IF EXISTS "PendekarBattleAction_kind_check";

ALTER TABLE "PendekarBattleAction"
  ADD CONSTRAINT "PendekarBattleAction_kind_check"
  CHECK ("actionKind" IN ('basic_attack', 'mahapukul', 'skill', 'flee'));

COMMIT;

-- Verification (read-only):
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conname = 'PendekarBattleAction_kind_check';
