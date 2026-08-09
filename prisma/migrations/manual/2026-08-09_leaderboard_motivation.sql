-- ============================================================
-- LEADERBOARD MOTIVATION LAYER (BC Arena)
-- Idempoten: jalankan di Supabase SQL Editor (PRODUCTION), aman diulang.
--
-- Bagian A — tabel LeaderboardPeriodResult (Hall of Fame + hasil podium).
-- Bagian B — 6 badge podium (diberikan OTOMATIS oleh settlement, bukan
--            kondisi; condition PODIUM tidak pernah auto-met di badge engine).
-- ============================================================

-- ── BAGIAN A: TABEL HASIL PERIODE ─────────────────────────────
CREATE TABLE IF NOT EXISTS "LeaderboardPeriodResult" (
  "id"          TEXT PRIMARY KEY,
  "periodType"  TEXT NOT NULL,
  "periodKey"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "rank"        INTEGER NOT NULL,
  "score"       INTEGER NOT NULL,
  "rewardXp"    INTEGER NOT NULL,
  "rewardCoins" INTEGER NOT NULL,
  "badgeCode"   TEXT,
  "settledAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardPeriodResult_periodType_periodKey_userId_key"
  ON "LeaderboardPeriodResult" ("periodType", "periodKey", "userId");

CREATE INDEX IF NOT EXISTS "LeaderboardPeriodResult_periodType_periodKey_idx"
  ON "LeaderboardPeriodResult" ("periodType", "periodKey");

CREATE INDEX IF NOT EXISTS "LeaderboardPeriodResult_userId_idx"
  ON "LeaderboardPeriodResult" ("userId");

-- ── BAGIAN B: BADGE PODIUM ────────────────────────────────────
-- condition {"type":"PODIUM","target":1} → badge engine TIDAK pernah
-- memberikan otomatis; kepemilikan hanya lewat settlement podium
-- (UserBadge, skipDuplicates). Ikon memakai emoji (BadgeIcon mendukungnya).
INSERT INTO "Badge" ("id", "code", "name", "icon", "description", "condition", "rarity", "isActive", "createdAt")
VALUES
  (gen_random_uuid(), 'weekly-champion',  'Juara Mingguan', '🥇', 'Juara 1 kompetisi XP mingguan',      '{"type":"PODIUM","target":1}', 'GOLD',      true, now()),
  (gen_random_uuid(), 'weekly-runner-up', 'Runner-up Mingguan', '🥈', 'Juara 2 kompetisi XP mingguan',  '{"type":"PODIUM","target":1}', 'SILVER',    true, now()),
  (gen_random_uuid(), 'weekly-third',     'Peringkat 3 Mingguan', '🥉', 'Juara 3 kompetisi XP mingguan', '{"type":"PODIUM","target":1}', 'BRONZE',    true, now()),
  (gen_random_uuid(), 'season-champion',  'Juara Season', '🥇', 'Juara 1 kompetisi season (4 minggu)',   '{"type":"PODIUM","target":1}', 'LEGENDARY', true, now()),
  (gen_random_uuid(), 'season-runner-up', 'Runner-up Season', '🥈', 'Juara 2 kompetisi season (4 minggu)', '{"type":"PODIUM","target":1}', 'GOLD',      true, now()),
  (gen_random_uuid(), 'season-third',     'Peringkat 3 Season', '🥉', 'Juara 3 kompetisi season (4 minggu)', '{"type":"PODIUM","target":1}', 'SILVER',    true, now())
ON CONFLICT ("code") DO UPDATE SET
  "name"        = EXCLUDED."name",
  "icon"        = EXCLUDED."icon",
  "description" = EXCLUDED."description",
  "condition"   = EXCLUDED."condition",
  "rarity"      = EXCLUDED."rarity",
  "isActive"    = EXCLUDED."isActive";
