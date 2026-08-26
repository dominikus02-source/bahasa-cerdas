-- P8I — TTS: sesi sisi server untuk anggaran petunjuk terbatas (3/puzzle)
-- Jalankan di Supabase SQL Editor. Idempoten: aman diulang.

CREATE TABLE IF NOT EXISTS "TtsSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "hintsRevealed" INTEGER NOT NULL DEFAULT 0,
    "cellsTotal" INTEGER NOT NULL,
    "cellsCorrect" INTEGER NOT NULL,
    "xpAwarded" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "TtsSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TtsSession_userId_createdAt_idx" ON "TtsSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TtsSession_status_createdAt_idx" ON "TtsSession"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TtsSession_userId_fkey') THEN
    ALTER TABLE "TtsSession" ADD CONSTRAINT "TtsSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Verifikasi:
-- SELECT column_name FROM information_schema.columns WHERE table_name='TtsSession' ORDER BY ordinal_position;
