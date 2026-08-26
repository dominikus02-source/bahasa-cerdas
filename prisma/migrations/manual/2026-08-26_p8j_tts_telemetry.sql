-- P8J — TTS: telemetry gameplay + feedback persepsi kesulitan
-- Jalankan di Supabase SQL Editor. Idempoten: aman diulang. Additive-only.
--
-- Kolom baru di TtsSession (alasan minimal):
--   wrongAttempts    : telemetri jumlah jawaban salah (telemetry saja, bukan reward)
--   unresolvedClues  : daftar clue resmi yang tak terjawol — dasar laporan
--                      "clue bermasalah" (bukan input pemain, bukan data finansial)
--   feedback         : persepsi kesulitan pemain EASY/PAS/HARD (opsional, sekali isi)

ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "wrongAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "unresolvedClues" JSONB;
ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "feedback" TEXT;

-- Verifikasi:
-- SELECT column_name FROM information_schema.columns WHERE table_name='TtsSession' ORDER BY ordinal_position;
