-- ============================================================
-- Badge GURU — Guru Literasi, Inspiratif, Kreatif, dst.
-- Idempoten: jalankan di Supabase SQL Editor (PRODUCTION),
-- ulangi aman (upsert by code).
--
-- Kondisi (lihat lib/gamification/badge-engine.ts):
--   MURID_KARYA       total karya seluruh muridnya
--   MURID_LIKE        total like karya seluruh muridnya
--   MURID_FEATURED    total karya murid terpilih (Editor Choice)
--   TUGAS_DIKIRIM    total penugasan/asesmen yang dikirim
--   PENGUMUMAN_DIBUAT total pengumuman yang dibuat
-- ============================================================

INSERT INTO "Badge" ("id", "code", "name", "icon", "description", "condition", "rarity", "isActive", "createdAt")
VALUES
  (gen_random_uuid(), 'guru-literasi',         'Guru Literasi',        '/badges/karya-10.webp', 'Murid-muridmu menerbitkan 25 karya',              '{"type":"MURID_KARYA","target":25}',     'BRONZE',    true, now()),
  (gen_random_uuid(), 'guru-inspiratif',       'Guru Inspiratif',      '/badges/karya-50.webp', 'Murid-muridmu menerbitkan 100 karya',             '{"type":"MURID_KARYA","target":100}',    'SILVER',    true, now()),
  (gen_random_uuid(), 'guru-literasi-legend',  'Guru Legenda Literasi','/badges/lvl-50.webp',   'Murid-muridmu menerbitkan 500 karya',             '{"type":"MURID_KARYA","target":500}',    'GOLD',      true, now()),
  (gen_random_uuid(), 'guru-kreatif',          'Guru Kreatif',         '/badges/season-1000.webp','5 karya muridmu menjadi Editor Choice',      '{"type":"MURID_FEATURED","target":5}',   'SILVER',    true, now()),
  (gen_random_uuid(), 'guru-kreatif-master',   'Guru Kreatif Master',  '/badges/lvl-100.webp',  '25 karya muridmu menjadi Editor Choice',            '{"type":"MURID_FEATURED","target":25}',  'GOLD',      true, now()),
  (gen_random_uuid(), 'guru-motivator',        'Guru Motivator',       '/badges/coin-500.webp', 'Karya muridmu dikumpulkan 200 like',      '{"type":"MURID_LIKE","target":200}',    'SILVER',    true, now()),
  (gen_random_uuid(), 'guru-inspirator',       'Guru Inspirator',      '/badges/coin-10000.webp','Karya muridmu dikumpulkan 2.000 like',    '{"type":"MURID_LIKE","target":2000}',   'GOLD',      true, now()),
  (gen_random_uuid(), 'guru-penggerak',        'Guru Penggerak',       '/badges/streak-7.webp', 'Kirim 50 penugasan ke kelas',       '{"type":"TUGAS_DIKIRIM","target":50}',   'SILVER',    true, now()),
  (gen_random_uuid(), 'guru-mentor',           'Guru Mentor',          '/badges/streak-30.webp', 'Kirim 200 penugasan ke kelas',      '{"type":"TUGAS_DIKIRIM","target":200}',  'GOLD',      true, now()),
  (gen_random_uuid(), 'guru-dedikasi',         'Guru Dedikasi',        '/badges/weekly-200.webp','Buat 20 pengumuman kelas',       '{"type":"PENGUMUMAN_DIBUAT","target":20}','BRONZE',    true, now())
ON CONFLICT ("code") DO UPDATE SET
  "name"        = EXCLUDED."name",
  "icon"        = EXCLUDED."icon",
  "description" = EXCLUDED."description",
  "condition"   = EXCLUDED."condition",
  "rarity"      = EXCLUDED."rarity",
  "isActive"    = EXCLUDED."isActive";