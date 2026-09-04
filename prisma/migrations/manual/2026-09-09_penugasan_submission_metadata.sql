-- Assignment Submission V1: add file metadata + submittedAt to PenugasanSubmission.
-- Idempotent: ADD COLUMN IF NOT EXISTS on every column.

ALTER TABLE "PenugasanSubmission" ADD COLUMN IF NOT EXISTS "praktikFileName" TEXT;
ALTER TABLE "PenugasanSubmission" ADD COLUMN IF NOT EXISTS "praktikFileType" TEXT;
ALTER TABLE "PenugasanSubmission" ADD COLUMN IF NOT EXISTS "praktikFileSize" INTEGER;
ALTER TABLE "PenugasanSubmission" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

-- Verify
SELECT
  column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'PenugasanSubmission'
  AND column_name IN ('praktikFileName', 'praktikFileType', 'praktikFileSize', 'submittedAt')
ORDER BY column_name;
