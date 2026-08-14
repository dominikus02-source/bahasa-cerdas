-- BahasaCerdas — Phase 2 Step 3C
-- Additive question-level evidence ledger.
-- Tidak mengubah UKBI/TKA, reward, atau learner state.

CREATE TABLE IF NOT EXISTS "LearningEvidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "skill" "LearningSkillType",
    "difficulty" "Difficulty",
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LearningEvidence_userId_source_activityId_questionId_key"
  ON "LearningEvidence"("userId", "source", "activityId", "questionId");
CREATE INDEX IF NOT EXISTS "LearningEvidence_userId_answeredAt_idx"
  ON "LearningEvidence"("userId", "answeredAt");
CREATE INDEX IF NOT EXISTS "LearningEvidence_userId_questionId_idx"
  ON "LearningEvidence"("userId", "questionId");
CREATE INDEX IF NOT EXISTS "LearningEvidence_userId_source_answeredAt_idx"
  ON "LearningEvidence"("userId", "source", "answeredAt");
CREATE INDEX IF NOT EXISTS "LearningEvidence_userId_skill_answeredAt_idx"
  ON "LearningEvidence"("userId", "skill", "answeredAt");

DO $$ BEGIN
  ALTER TABLE "LearningEvidence"
    ADD CONSTRAINT "LearningEvidence_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "LearningEvidence" ENABLE ROW LEVEL SECURITY;

-- Rollback manual bila diperlukan sebelum data evidence dipakai:
-- DROP TABLE IF EXISTS "LearningEvidence";
