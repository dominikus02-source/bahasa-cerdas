-- P2.6G.4C — immutable Pendekar RPG-XP settlement effect.
-- Apply ONLY to an approved non-production PostgreSQL database through a
-- direct connection. This is additive and does not touch platform XP, coins,
-- inventory, quests, battle state, or any financial wallet.

BEGIN;

CREATE TABLE IF NOT EXISTS "PendekarRpgXpEntry" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "levelBefore" INTEGER NOT NULL,
  "levelAfter" INTEGER NOT NULL,
  "xpBefore" INTEGER NOT NULL,
  "xpAfter" INTEGER NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarRpgXpEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarRpgXpEntry_receiptId_key" UNIQUE ("receiptId"),
  CONSTRAINT "PendekarRpgXpEntry_reference_key" UNIQUE ("reference"),
  CONSTRAINT "PendekarRpgXpEntry_values_check" CHECK (
    "delta" >= 0 AND "levelBefore" >= 1 AND "levelAfter" >= "levelBefore"
    AND "xpBefore" >= 0 AND "xpAfter" >= 0
  )
);

CREATE INDEX IF NOT EXISTS "PendekarRpgXpEntry_playerId_createdAt_idx"
  ON "PendekarRpgXpEntry"("playerId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarRpgXpEntry_playerId_fkey') THEN
    ALTER TABLE "PendekarRpgXpEntry" ADD CONSTRAINT "PendekarRpgXpEntry_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarRpgXpEntry_receiptId_fkey') THEN
    ALTER TABLE "PendekarRpgXpEntry" ADD CONSTRAINT "PendekarRpgXpEntry_receiptId_fkey"
      FOREIGN KEY ("receiptId") REFERENCES "PendekarRewardReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- Verification (read-only):
-- SELECT indexname FROM pg_indexes WHERE tablename = 'PendekarRpgXpEntry' ORDER BY indexname;
