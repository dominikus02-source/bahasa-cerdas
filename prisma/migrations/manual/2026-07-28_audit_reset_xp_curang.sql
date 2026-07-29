-- ============================================================================
-- LANGKAH 1 — PERIKSA DULU. Jangan langsung jalankan bagian UPDATE.
-- ============================================================================
-- Lihat siapa saja yang XP-nya di luar nalar. Batas 20.000 dipakai sebagai
-- ambang curiga: bermain wajar berbulan-bulan pun sulit menembusnya, sedangkan
-- kuota harian yang baru membatasi 5.000/hari.
--
-- Cocokkan hasilnya dengan nama di papan peringkat SEBELUM melanjutkan.
SELECT
  "id",
  "fullName",
  "nickname",
  "xp",
  "level",
  "league",
  "lastActiveAt"
FROM "User"
WHERE "xp" > 20000
ORDER BY "xp" DESC;

-- ============================================================================
-- LANGKAH 2 — RESET. Jalankan HANYA setelah daftar di atas dipastikan benar.
-- ============================================================================
-- Ganti daftar id di bawah dengan id hasil LANGKAH 1 yang memang terbukti
-- memakai autoclicker. Sengaja memakai id, BUKAN nama: nama bisa sama atau
-- berubah, dan salah reset berarti menghapus kerja keras murid yang jujur.
--
-- UPDATE "User"
-- SET "xp" = 0,
--     "level" = 1,
--     "league" = 'BRONZE'
-- WHERE "id" IN (
--   'ID_MURID_1',
--   'ID_MURID_2',
--   'ID_MURID_3'
-- );

-- ============================================================================
-- LANGKAH 3 — AUDIT SKEMA MENYIMPANG (hanya membaca, aman dijalankan)
-- ============================================================================
-- Foreign key GameResult.roomId dan .sessionId ada di schema.prisma tetapi
-- TIDAK pernah terbentuk di produksi — itu sebabnya baris dengan roomId 'solo'
-- (sebuah GameRoom yang tidak pernah ada) tetap bisa masuk. Kueri ini
-- menampilkan FK yang benar-benar ada, supaya bisa dibandingkan dengan skema.
SELECT
  tc.table_name    AS tabel,
  kcu.column_name  AS kolom,
  ccu.table_name   AS mengacu_ke_tabel,
  ccu.column_name  AS mengacu_ke_kolom
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Berapa banyak baris GameResult yang roomId-nya menunjuk GameRoom tak ada?
-- (Kalau FK-nya memang tertegakkan, hasilnya pasti 0.)
SELECT COUNT(*) AS gameresult_room_yatim
FROM "GameResult" gr
LEFT JOIN "GameRoom" room ON room."id" = gr."roomId"
WHERE room."id" IS NULL;

-- Berapa banyak yang sessionId-nya menunjuk GameSession tak ada?
SELECT COUNT(*) AS gameresult_session_yatim
FROM "GameResult" gr
LEFT JOIN "GameSession" gs ON gs."id" = gr."sessionId"
WHERE gs."id" IS NULL;
