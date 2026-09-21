-- ─── Main Bersama: identitas konten sesi (contentTitle) ─────────────
-- Sesi yang sudah dibuat harus tetap dapat menampilkan nama konten
-- (mis. "Antonim") meski sumber Bank Soal kemudian berubah/dihapus.
-- Karena itu label disimpan sebagai SNAPSHOT saat sesi dibuat —
-- bukan hasil query Bank Soal setiap kali room dirender.
--
-- Sifat migration: ADDITIVE, hanya menyentuh tabel Main Bersama.
-- Tidak ada DROP, tidak ada perubahan tabel modul lain.
--
-- Aman untuk database yang sudah berisi sesi (mis. sesi review):
--   1. kolom ditambah dulu sebagai nullable;
--   2. baris lama diisi label netral (tidak dapat direkonstruksi
--      secara andal untuk sesi yang dibuat sebelum fitur ini);
--   3. baru dijadikan NOT NULL.

ALTER TABLE "MainSession" ADD COLUMN "contentTitle" TEXT;

UPDATE "MainSession"
   SET "contentTitle" = 'Paket Soal'
 WHERE "contentTitle" IS NULL;

ALTER TABLE "MainSession" ALTER COLUMN "contentTitle" SET NOT NULL;
