-- =============================================================================
-- JumpaRoomKind += 'UMUM'
-- ADDITIVE: hanya menambah 1 nilai enum. Tidak ada DROP/RENAME, tanpa backfill;
-- ruang KELAS/GURU/MURID lama tidak tersentuh. Ruang UMUM = ruang JUMPA milik
-- akun UMUM (mahasiswa/dosen/masyarakat), terisolasi dari kelas/guru/murid
-- (lihat docs/JUMPA_UMUM.md). Hanya dipakai bila ENABLE_ROLE_UMUM menyala.
--
-- Prasyarat: enum "JumpaRoomKind" sudah ada (migrasi JUMPA Fase 2).
-- Catatan: ADD VALUE IF NOT EXISTS idempoten (PostgreSQL >= 9.6) dan aman di
-- dalam transaksi migrasi (PostgreSQL >= 12) karena nilainya tidak dipakai di
-- transaksi yang sama.
--
-- Rollback: PostgreSQL tidak mendukung DROP VALUE. Nilai yang tak terpakai
-- aman dibiarkan; bila wajib dihapus, akhiri/hapus ruang UMUM lalu buat ulang
-- tipe enum secara manual.
-- =============================================================================

ALTER TYPE "JumpaRoomKind" ADD VALUE IF NOT EXISTS 'UMUM';
