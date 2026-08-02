-- No. absensi murid (profil siswa) — Sprint 7
-- Jalankan di Supabase SQL Editor (PRODUCTION dulu, PREVIEW menyusul).
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "noAbsen" TEXT;
