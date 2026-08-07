-- AI EVALUATION CENTER — add-only migration
-- Additive columns on TestAnswer for AI review + teacher approval.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE "TestAnswer"
  ADD COLUMN IF NOT EXISTS "aiFeedback"       JSONB,
  ADD COLUMN IF NOT EXISTS "aiConfidence"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "aiReviewedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reviewStatus"     TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "reviewedBy"       TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt"       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "TestAnswer_reviewStatus_idx" ON "TestAnswer" ("reviewStatus");
CREATE INDEX IF NOT EXISTS "TestAnswer_paketId_idx" ON "TestAnswer" ("paketId");
CREATE INDEX IF NOT EXISTS "TestAnswer_aiReviewedAt_idx" ON "TestAnswer" ("aiReviewedAt");

-- Verification queries
-- SELECT "reviewStatus", COUNT(*) FROM "TestAnswer" GROUP BY "reviewStatus";
-- SELECT column_name FROM information_schema.columns WHERE table_name='TestAnswer' AND column_name LIKE '%ai%' OR column_name LIKE '%review%';