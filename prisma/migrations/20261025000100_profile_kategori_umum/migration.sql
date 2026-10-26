-- =============================================================================
-- Profile.kategoriUmum — sub-kategori opsional untuk Role UMUM
-- ADDITIVE: 1 tipe enum baru ("KategoriUmum") + 1 kolom NULLABLE di "Profile".
-- Tanpa DEFAULT, tanpa backfill: semua profil lama tetap NULL (data lama tetap
-- terbaca apa adanya). Tidak ada DROP/RENAME, tidak menyentuh kolom lain.
-- Kolom ini BUKAN dasar otorisasi — hanya identitas/analitik.
--
-- Prasyarat: 20261025000000_role_umum (tidak bergantung pada nilainya).
-- Paritas: identik dengan keluaran `prisma migrate diff` untuk perubahan ini;
-- CREATE TYPE dibungkus DO-block agar idempoten bila dijalankan ulang manual.
--
-- Rollback:
--   ALTER TABLE "Profile" DROP COLUMN IF EXISTS "kategoriUmum";
--   DROP TYPE IF EXISTS "KategoriUmum";
-- =============================================================================

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "KategoriUmum" AS ENUM ('MAHASISWA', 'UMUM', 'INVESTOR', 'TAMU');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "kategoriUmum" "KategoriUmum";
