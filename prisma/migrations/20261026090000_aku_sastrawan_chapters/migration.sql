-- AKU SASTRAWAN: chapters for novel and long-form writing projects.
-- Idempotent table/index creation supports safe retries when schema already exists.
CREATE TABLE IF NOT EXISTS "WritingChapter" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingChapter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WritingChapter_projectId_orderIndex_key"
  ON "WritingChapter"("projectId", "orderIndex");
CREATE INDEX IF NOT EXISTS "WritingChapter_projectId_updatedAt_idx"
  ON "WritingChapter"("projectId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WritingChapter_projectId_fkey'
      AND conrelid = '"WritingChapter"'::regclass
  ) THEN
    ALTER TABLE "WritingChapter"
      ADD CONSTRAINT "WritingChapter_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "WritingProject"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
