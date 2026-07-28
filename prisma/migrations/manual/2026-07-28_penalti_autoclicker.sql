-- Penalti untuk 2 akun yang terkonfirmasi memakai autoclicker (XP ~380.000,
-- Level 759-761, selisih antar keduanya cuma puluhan XP — pola robotik, bukan
-- hasil main). Menyusul perbaikan anti-farming XP (a90a73b, 5cbaafd) yang
-- menutup jalur pemanenannya.
--
-- ============================================================================
-- LANGKAH 1 — VERIFIKASI DULU sebelum lanjut ke UPDATE.
-- ============================================================================
-- Cocokkan hasilnya dengan screenshot papan peringkat: Nicholas Anderson Huang
-- (~380.015 XP, Level 761) dan Vinshent Tio Wijaya (~379.045 XP, Level 759).
-- Kalau baris yang muncul TIDAK cocok (nama sama tapi XP jauh berbeda, atau
-- lebih dari 1 baris per nama), JANGAN lanjut ke Langkah 2 — kabari dulu.
SELECT id, "fullName", nickname, email, xp, level, league, "lastActiveAt"
FROM "User"
WHERE "fullName" IN ('Nicholas Anderson Huang', 'Vinshent Tio Wijaya')
  AND xp > 300000;

-- ============================================================================
-- LANGKAH 2 — TERAPKAN PENALTI (jalankan hanya setelah Langkah 1 cocok)
-- ============================================================================
-- xp diturunkan ke 1000 sesuai instruksi. level & league dihitung ulang
-- memakai rumus yang sama dipakai aplikasi (lib/xp.ts: calcLevel,
-- calcLeagueFromXP) supaya tidak ada baris dengan xp/level/league yang
-- saling bertentangan:
--   calcLevel(1000)          = floor(1000/500)+1 = 3
--   calcLeagueFromXP(1000)   = SILVER (ambang SILVER persis di 1000 XP)
--
-- Kunci WHERE-nya sengaja fullName + xp>300000 (bukan cuma nama) — kalau ada
-- murid lain kebetulan bernama sama, kemungkinan dia juga punya 300rb+ XP
-- nyaris nol, jadi ini aman dipakai tanpa perlu ambil id manual dulu.
UPDATE "User"
SET xp = 1000,
    level = 3,
    league = 'SILVER'
WHERE "fullName" IN ('Nicholas Anderson Huang', 'Vinshent Tio Wijaya')
  AND xp > 300000;

-- ============================================================================
-- LANGKAH 3 — KIRIM PERINGATAN (notifikasi dalam aplikasi, bukan email/WA)
-- ============================================================================
-- Muncul di lonceng notifikasi murid saat mereka login berikutnya.
--
-- PENTING: filter di sini pakai fullName (sama seperti Langkah 2), BUKAN
-- "xp = 1000" — sesudah Langkah 2, murid lain yang jujur bisa saja kebetulan
-- juga punya persis 1000 XP. Kalau filternya memakai nilai hasil update,
-- notifikasi ini bisa salah kirim ke mereka juga.
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
WHERE "fullName" IN ('Nicholas Anderson Huang', 'Vinshent Tio Wijaya')
  AND level = 3
  AND league = 'SILVER';
