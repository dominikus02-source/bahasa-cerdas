-- ─── Main Bersama: durasi permainan pilihan guru ────────────────────
-- Guru memilih total durasi permainan (10/15/25/30/45 menit) saat
-- menyiapkan sesi. Server menyimpan pilihan + batas waktu agar timer
-- sama untuk semua pemain dan sesi berakhir otomatis saat waktu habis.
--
-- Sifat migration: ADDITIVE & nullable, hanya tabel MainSession.
-- Sesi lama tetap NULL (tanpa batas waktu) — perilaku tidak berubah.

ALTER TABLE "MainSession" ADD COLUMN IF NOT EXISTS "gameDurationMs" INTEGER;
ALTER TABLE "MainSession" ADD COLUMN IF NOT EXISTS "gameEndsAt" TIMESTAMP(3);
