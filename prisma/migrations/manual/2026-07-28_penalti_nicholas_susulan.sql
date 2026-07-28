-- Susulan untuk 2026-07-28_penalti_autoclicker.sql — nama Nicholas ternyata
-- tersimpan HURUF BESAR SEMUA di database ("NICHOLAS ANDERSON HUANG"), jadi
-- pencocokan case-sensitive di skrip sebelumnya tidak menemukan barisnya
-- (Vinshent kemungkinan sudah berhasil, namanya tersimpan huruf normal).
-- Skrip ini pakai UPPER(...) supaya tidak peduli besar/kecil huruf.
--
-- ============================================================================
-- LANGKAH 1 — VERIFIKASI DULU
-- ============================================================================
SELECT id, "fullName", nickname, email, xp, level, league, "lastActiveAt"
FROM "User"
WHERE UPPER("fullName") = UPPER('Nicholas Anderson Huang')
  AND xp > 300000;

-- ============================================================================
-- LANGKAH 2 — TERAPKAN PENALTI
-- ============================================================================
UPDATE "User"
SET xp = 1000,
    level = 3,
    league = 'SILVER'
WHERE UPPER("fullName") = UPPER('Nicholas Anderson Huang')
  AND xp > 300000;

-- ============================================================================
-- LANGKAH 3 — KIRIM PERINGATAN (khusus Nicholas — jangan gabung dengan
-- Vinshent di sini, dia kemungkinan sudah dapat notifikasi dari skrip
-- sebelumnya; menjalankan ulang untuknya akan mengirim notifikasi dobel)
-- ============================================================================
INSERT INTO "Notifikasi" (id, "userId", title, body, type, "isRead", "createdAt")
SELECT
  gen_random_uuid()::text,
  id,
  'Peringatan: Aktivitas Tidak Wajar Terdeteksi',
  'XP kamu terdeteksi bertambah dengan pola yang tidak wajar (autoclicker/bot), sehingga XP kamu dikembalikan ke 1000. Yuk belajar dengan jujur — XP yang didapat dari usaha sendiri jauh lebih berarti daripada angka di papan peringkat. Kalau ini kesalahan, hubungi admin ya.',
  'MODERASI',
  false,
  now()
FROM "User"
WHERE UPPER("fullName") = UPPER('Nicholas Anderson Huang')
  AND level = 3
  AND league = 'SILVER';
