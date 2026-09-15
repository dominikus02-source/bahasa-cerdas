-- P2.6G.3 — additive, server-authoritative battle-action receipt.
--
-- Apply only to an approved non-production PostgreSQL database. This creates
-- one new audit/idempotency table and does not modify player, reward, wallet,
-- quest, or production data.

BEGIN;

CREATE TABLE IF NOT EXISTS "PendekarBattleAction" (
  "id" TEXT NOT NULL,
  "battleSessionId" TEXT NOT NULL,
  "learningSessionId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "actionKind" TEXT NOT NULL,
  "turnBefore" INTEGER NOT NULL,
  "turnAfter" INTEGER NOT NULL,
  "resultProjection" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarBattleAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarBattleAction_learningSessionId_key" UNIQUE ("learningSessionId"),
  CONSTRAINT "PendekarBattleAction_requestKey_key" UNIQUE ("requestKey"),
  CONSTRAINT "PendekarBattleAction_battleSessionId_turnBefore_key" UNIQUE ("battleSessionId", "turnBefore"),
  CONSTRAINT "PendekarBattleAction_turn_check" CHECK ("turnBefore" >= 0 AND "turnAfter" > "turnBefore"),
  CONSTRAINT "PendekarBattleAction_kind_check" CHECK ("actionKind" IN ('basic_attack', 'mahapukul'))
);

CREATE INDEX IF NOT EXISTS "PendekarBattleAction_battleSessionId_createdAt_idx"
  ON "PendekarBattleAction"("battleSessionId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarBattleAction_battleSessionId_fkey') THEN
    ALTER TABLE "PendekarBattleAction" ADD CONSTRAINT "PendekarBattleAction_battleSessionId_fkey"
      FOREIGN KEY ("battleSessionId") REFERENCES "PendekarBattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- Verification (read-only):
-- SELECT indexname FROM pg_indexes WHERE tablename = 'PendekarBattleAction' ORDER BY indexname;
