-- =============================================================================
-- KategoriUmum += 'DOSEN'
-- ADDITIVE: hanya menambah 1 nilai enum. Tidak ada DROP/RENAME, tanpa backfill;
-- data lama tetap terbaca apa adanya. DOSEN tetap Role UMUM (bukan GURU):
-- tanpa alat guru, tanpa trial Pro, tanpa berjualan di Toko Karya.
--
-- Prasyarat: 20261025000100_profile_kategori_umum.
-- Catatan: ADD VALUE IF NOT EXISTS idempoten (PostgreSQL >= 9.6) dan aman di
-- dalam transaksi migrasi (PostgreSQL >= 12) karena nilainya tidak dipakai di
-- transaksi yang sama.
--
-- Rollback: PostgreSQL tidak mendukung DROP VALUE. Nilai yang tak terpakai
-- aman dibiarkan; bila wajib dihapus, buat ulang tipe enum secara manual.
-- =============================================================================

ALTER TYPE "KategoriUmum" ADD VALUE IF NOT EXISTS 'DOSEN';
