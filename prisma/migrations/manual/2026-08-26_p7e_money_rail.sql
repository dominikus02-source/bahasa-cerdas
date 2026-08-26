-- ═══════════════════════════════════════════════════════════════════════════
-- P7E — Guru Cerdas Sejahtera: Production Money Rail
-- JALANKAN INI DI SUPABASE SQL EDITOR SETELAH SCRIPT P7D
-- (prisma/migrations/manual/2026-08-26_p7d_payout_infrastructure.sql).
-- IDEMPOTEN: aman dijalankan berulang. Additive-only.
--
-- Berisi:
--   1. TeacherPayout.providerFee — fee provider (biaya platform, TERPISAH dari
--      komisi guru — historical commission TIDAK berubah)
--   2. TeacherPayout.netTransfer — net transfer provider (amount - providerFee)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "TeacherPayout" ADD COLUMN IF NOT EXISTS "providerFee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeacherPayout" ADD COLUMN IF NOT EXISTS "netTransfer" INTEGER;

-- Verifikasi (jalankan dan pastikan hasilnya tampil):
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='TeacherPayout' ORDER BY ordinal_position;
