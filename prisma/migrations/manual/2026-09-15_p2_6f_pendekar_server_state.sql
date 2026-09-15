-- P2.6F — Pendekar Suryakerta additive server-state foundation.
--
-- Apply ONLY to an approved non-production PostgreSQL database through a
-- direct connection. This migration creates new tables/indexes/constraints
-- only; it does not alter an existing table or import browser localStorage.
-- It is intentionally idempotent for the repository's manual-migration flow.

BEGIN;

CREATE TABLE IF NOT EXISTS "PendekarPlayer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rpgLevel" INTEGER NOT NULL DEFAULT 1,
  "rpgXp" INTEGER NOT NULL DEFAULT 0,
  "mapKey" TEXT NOT NULL DEFAULT 'map.desa',
  "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0.2717391304347826,
  "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0.5416666666666666,
  "facing" TEXT NOT NULL DEFAULT 'down',
  "hp" INTEGER NOT NULL DEFAULT 100,
  "maxHp" INTEGER NOT NULL DEFAULT 100,
  "mp" INTEGER NOT NULL DEFAULT 20,
  "maxMp" INTEGER NOT NULL DEFAULT 20,
  "attack" INTEGER NOT NULL DEFAULT 10,
  "defense" INTEGER NOT NULL DEFAULT 5,
  "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "goldBalance" INTEGER NOT NULL DEFAULT 30,
  "version" INTEGER NOT NULL DEFAULT 1,
  "stateSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "lastCheckpointAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarPlayer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarPlayer_userId_key" UNIQUE ("userId"),
  CONSTRAINT "PendekarPlayer_rpgLevel_check" CHECK ("rpgLevel" >= 1),
  CONSTRAINT "PendekarPlayer_rpgXp_check" CHECK ("rpgXp" >= 0),
  CONSTRAINT "PendekarPlayer_position_check" CHECK ("positionX" >= 0 AND "positionX" <= 1 AND "positionY" >= 0 AND "positionY" <= 1),
  CONSTRAINT "PendekarPlayer_stats_check" CHECK ("hp" >= 0 AND "maxHp" > 0 AND "hp" <= "maxHp" AND "mp" >= 0 AND "maxMp" >= 0 AND "mp" <= "maxMp" AND "attack" >= 0 AND "defense" >= 0 AND "speed" >= 0),
  CONSTRAINT "PendekarPlayer_goldBalance_check" CHECK ("goldBalance" >= 0),
  CONSTRAINT "PendekarPlayer_version_check" CHECK ("version" >= 1 AND "stateSchemaVersion" >= 1)
);

CREATE TABLE IF NOT EXISTS "PendekarInventoryItem" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarInventoryItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarInventoryItem_playerId_itemKey_key" UNIQUE ("playerId", "itemKey"),
  CONSTRAINT "PendekarInventoryItem_quantity_check" CHECK ("quantity" >= 0)
);

CREATE TABLE IF NOT EXISTS "PendekarQuestProgress" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "questKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER NOT NULL DEFAULT 0,
  "definitionVersion" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "turnedInAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarQuestProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarQuestProgress_playerId_questKey_key" UNIQUE ("playerId", "questKey"),
  CONSTRAINT "PendekarQuestProgress_status_check" CHECK ("status" IN ('LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED', 'TURNED_IN')),
  CONSTRAINT "PendekarQuestProgress_progress_check" CHECK ("progress" >= 0 AND "target" >= 0 AND "version" >= 1)
);

CREATE TABLE IF NOT EXISTS "PendekarBattleSession" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "encounterKey" TEXT NOT NULL,
  "encounterDefinitionVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "result" TEXT,
  "turn" INTEGER NOT NULL DEFAULT 0,
  "actionRevision" INTEGER NOT NULL DEFAULT 0,
  "battleState" JSONB NOT NULL,
  "rngState" TEXT NOT NULL,
  "originMapKey" TEXT NOT NULL,
  "originX" DOUBLE PRECISION NOT NULL,
  "originY" DOUBLE PRECISION NOT NULL,
  "startRequestId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarBattleSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarBattleSession_playerId_startRequestId_key" UNIQUE ("playerId", "startRequestId"),
  CONSTRAINT "PendekarBattleSession_status_check" CHECK ("status" IN ('ACTIVE', 'WON', 'LOST', 'FLED', 'EXPIRED', 'ABANDONED')),
  CONSTRAINT "PendekarBattleSession_result_check" CHECK ("result" IS NULL OR "result" IN ('WIN', 'LOSE', 'FLED')),
  CONSTRAINT "PendekarBattleSession_revision_check" CHECK ("turn" >= 0 AND "actionRevision" >= 0),
  CONSTRAINT "PendekarBattleSession_origin_check" CHECK ("originX" >= 0 AND "originX" <= 1 AND "originY" >= 0 AND "originY" <= 1)
);

CREATE TABLE IF NOT EXISTS "PendekarLearningSession" (
  "id" TEXT NOT NULL,
  "battleSessionId" TEXT NOT NULL,
  "soalId" TEXT NOT NULL,
  "questionVersion" TEXT NOT NULL,
  "answerFingerprint" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submittedAnswer" TEXT,
  "isCorrect" BOOLEAN,
  "answerRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "answeredAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarLearningSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarLearningSession_battleSessionId_key" UNIQUE ("battleSessionId"),
  CONSTRAINT "PendekarLearningSession_attemptId_key" UNIQUE ("attemptId"),
  CONSTRAINT "PendekarLearningSession_answerRequestId_key" UNIQUE ("answerRequestId"),
  CONSTRAINT "PendekarLearningSession_status_check" CHECK ("status" IN ('PENDING', 'ANSWERED', 'EXPIRED', 'VOID'))
);

CREATE TABLE IF NOT EXISTS "PendekarRewardReceipt" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rpgXp" INTEGER NOT NULL DEFAULT 0,
  "globalXp" INTEGER NOT NULL DEFAULT 0,
  "goldDelta" INTEGER NOT NULL DEFAULT 0,
  "itemPlan" JSONB,
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarRewardReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarRewardReceipt_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "PendekarRewardReceipt_playerId_sourceType_sourceId_key" UNIQUE ("playerId", "sourceType", "sourceId"),
  CONSTRAINT "PendekarRewardReceipt_sourceType_check" CHECK ("sourceType" IN ('BATTLE', 'QUEST')),
  CONSTRAINT "PendekarRewardReceipt_status_check" CHECK ("status" IN ('PENDING', 'SETTLING', 'SETTLED', 'VOID')),
  CONSTRAINT "PendekarRewardReceipt_reward_check" CHECK ("rpgXp" >= 0 AND "globalXp" >= 0)
);

CREATE TABLE IF NOT EXISTS "PendekarWalletEntry" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendekarWalletEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendekarWalletEntry_receiptId_key" UNIQUE ("receiptId"),
  CONSTRAINT "PendekarWalletEntry_balanceAfter_check" CHECK ("balanceAfter" >= 0)
);

CREATE INDEX IF NOT EXISTS "PendekarPlayer_mapKey_idx" ON "PendekarPlayer"("mapKey");
CREATE INDEX IF NOT EXISTS "PendekarPlayer_updatedAt_idx" ON "PendekarPlayer"("updatedAt");
CREATE INDEX IF NOT EXISTS "PendekarInventoryItem_playerId_idx" ON "PendekarInventoryItem"("playerId");
CREATE INDEX IF NOT EXISTS "PendekarQuestProgress_playerId_status_idx" ON "PendekarQuestProgress"("playerId", "status");
CREATE INDEX IF NOT EXISTS "PendekarBattleSession_playerId_status_idx" ON "PendekarBattleSession"("playerId", "status");
CREATE INDEX IF NOT EXISTS "PendekarBattleSession_status_expiresAt_idx" ON "PendekarBattleSession"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "PendekarBattleSession_encounterKey_idx" ON "PendekarBattleSession"("encounterKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PendekarBattleSession_one_active_player_idx" ON "PendekarBattleSession"("playerId") WHERE "status" = 'ACTIVE';
CREATE INDEX IF NOT EXISTS "PendekarLearningSession_soalId_idx" ON "PendekarLearningSession"("soalId");
CREATE INDEX IF NOT EXISTS "PendekarLearningSession_status_expiresAt_idx" ON "PendekarLearningSession"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "PendekarRewardReceipt_playerId_createdAt_idx" ON "PendekarRewardReceipt"("playerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PendekarRewardReceipt_status_idx" ON "PendekarRewardReceipt"("status");
CREATE INDEX IF NOT EXISTS "PendekarWalletEntry_playerId_createdAt_idx" ON "PendekarWalletEntry"("playerId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarPlayer_userId_fkey') THEN
    ALTER TABLE "PendekarPlayer" ADD CONSTRAINT "PendekarPlayer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarInventoryItem_playerId_fkey') THEN
    ALTER TABLE "PendekarInventoryItem" ADD CONSTRAINT "PendekarInventoryItem_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarQuestProgress_playerId_fkey') THEN
    ALTER TABLE "PendekarQuestProgress" ADD CONSTRAINT "PendekarQuestProgress_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarBattleSession_playerId_fkey') THEN
    ALTER TABLE "PendekarBattleSession" ADD CONSTRAINT "PendekarBattleSession_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarLearningSession_battleSessionId_fkey') THEN
    ALTER TABLE "PendekarLearningSession" ADD CONSTRAINT "PendekarLearningSession_battleSessionId_fkey"
      FOREIGN KEY ("battleSessionId") REFERENCES "PendekarBattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarRewardReceipt_playerId_fkey') THEN
    ALTER TABLE "PendekarRewardReceipt" ADD CONSTRAINT "PendekarRewardReceipt_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarWalletEntry_playerId_fkey') THEN
    ALTER TABLE "PendekarWalletEntry" ADD CONSTRAINT "PendekarWalletEntry_playerId_fkey"
      FOREIGN KEY ("playerId") REFERENCES "PendekarPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendekarWalletEntry_receiptId_fkey') THEN
    ALTER TABLE "PendekarWalletEntry" ADD CONSTRAINT "PendekarWalletEntry_receiptId_fkey"
      FOREIGN KEY ("receiptId") REFERENCES "PendekarRewardReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- Verification (read-only):
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'Pendekar%' ORDER BY table_name;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'PendekarBattleSession' ORDER BY indexname;
