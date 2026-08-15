-- BahasaCerdas — Phase 2 Step 3D
-- Canonical metadata foundation for non-certified question sources.
-- No UKBI/TKA tables are modified. No question content or answer key is copied.

CREATE TABLE IF NOT EXISTS "QuestionMetadata" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "skill" TEXT,
    "subskill" TEXT,
    "difficulty" "Difficulty",
    "level" INTEGER,
    "topic" TEXT,
    "questionType" TEXT NOT NULL,
    "cefr" TEXT,
    "provenance" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "taxonomyVersion" TEXT NOT NULL DEFAULT '1.0',
    "metadataVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdById" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionMetadata_source_questionId_key"
  ON "QuestionMetadata"("source", "questionId");
CREATE INDEX IF NOT EXISTS "QuestionMetadata_source_status_idx"
  ON "QuestionMetadata"("source", "status");
CREATE INDEX IF NOT EXISTS "QuestionMetadata_skill_subskill_idx"
  ON "QuestionMetadata"("skill", "subskill");
CREATE INDEX IF NOT EXISTS "QuestionMetadata_difficulty_idx"
  ON "QuestionMetadata"("difficulty");
CREATE INDEX IF NOT EXISTS "QuestionMetadata_level_idx"
  ON "QuestionMetadata"("level");

DO $$ BEGIN
  ALTER TABLE "QuestionMetadata"
    ADD CONSTRAINT "QuestionMetadata_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QuestionMetadata"
    ADD CONSTRAINT "QuestionMetadata_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "QuestionMetadata" ENABLE ROW LEVEL SECURITY;

-- Rollback manual sebelum metadata dipakai:
-- DROP TABLE IF EXISTS "QuestionMetadata";
