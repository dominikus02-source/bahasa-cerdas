-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumProgress_userId_track_stageIndex_key" ON "CurriculumProgress"("userId", "track", "stageIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumProgress_userId_track_idx" ON "CurriculumProgress"("userId", "track");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumProgress_userId_fkey'
  ) THEN
    ALTER TABLE "CurriculumProgress" ADD CONSTRAINT "CurriculumProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
