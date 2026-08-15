-- BahasaCerdas — Phase 2 Step 3F
-- Minimal server-owned adaptive practice session snapshot.
-- No answer key, no UKBI/TKA changes, no reward fields.

CREATE TABLE IF NOT EXISTS "AdaptivePracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "selectionVersion" TEXT NOT NULL,
    "targetSkill" TEXT,
    "targetSubskill" TEXT,
    "targetDifficulty" "Difficulty",
    "reasonCode" TEXT NOT NULL,
    "reasonText" TEXT NOT NULL,
    "questionIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdaptivePracticeSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdaptivePracticeSession_userId_createdAt_idx"
  ON "AdaptivePracticeSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdaptivePracticeSession_userId_status_idx"
  ON "AdaptivePracticeSession"("userId", "status");

DO $$ BEGIN
  ALTER TABLE "AdaptivePracticeSession"
    ADD CONSTRAINT "AdaptivePracticeSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AdaptivePracticeSession" ENABLE ROW LEVEL SECURITY;

-- Rollback manual bila diperlukan sebelum sesi dipakai:
-- DROP TABLE IF EXISTS "AdaptivePracticeSession";
