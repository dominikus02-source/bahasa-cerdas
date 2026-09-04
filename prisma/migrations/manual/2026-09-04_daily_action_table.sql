-- BahasaCerdas — P0 Hotfix 2026-09-04
-- DailyAction (model committed 2026-08-22 via 3e5c6da) tidak pernah dibuat
-- di database produksi: tidak ada migration Prisma maupun manual yang
-- membuat tabel "DailyAction" → runtime P2021 pada GET /api/student/daily-action.
--
-- Additive + idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT
-- EXISTS / EXCEPTION guard. Tidak menyentuh data apa pun yang sudah ada.
-- Jalankan: psql "$DIRECT_URL" -f prisma/migrations/manual/2026-09-04_daily_action_table.sql
-- atau tempel di Supabase SQL Editor (PRODUCTION dulu, lalu STAGING).

CREATE TABLE IF NOT EXISTS "DailyAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,          -- "YYYY-MM-DD" (WIB dayKey)
    "source" TEXT NOT NULL,        -- "TKA" | "UKBI"
    "questionId" TEXT NOT NULL,    -- ID from TKAQuestion.id / UKBIQuestion.id / Soal.id
    "skill" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'PILIHAN_GANDA', -- PILIHAN_GANDA | BENAR_SALAH | ISIAN_SINGKAT
    "difficulty" TEXT,
    "questionText" TEXT,           -- snapshot tampilan (tanpa jawaban)
    "options" TEXT,                -- JSON options (tanpa correctAnswer)
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED
    "isCorrect" BOOLEAN,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAction_pkey" PRIMARY KEY ("id")
);

-- @@unique([userId, date])
CREATE UNIQUE INDEX IF NOT EXISTS "DailyAction_userId_date_key"
  ON "DailyAction"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyAction_userId_date_idx"
  ON "DailyAction"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyAction_userId_status_idx"
  ON "DailyAction"("userId", "status");

DO $$ BEGIN
  ALTER TABLE "DailyAction"
    ADD CONSTRAINT "DailyAction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
