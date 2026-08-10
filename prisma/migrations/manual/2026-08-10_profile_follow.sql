-- ============================================================
-- Sosial Profil (Player Identity) — Follow + ProfileLike
-- Idempoten: jalankan di Supabase SQL Editor (PRODUCTION),
-- ulangi aman (guard IF NOT EXISTS).
--
-- Model Prisma: prisma/schema.prisma → model Follow, model ProfileLike.
--   Follow      = relasi satu arah follower→following (unique berpasangan)
--   ProfileLike = "Suka profil" — terpisah dari like karya (StudentKaryaLike)
-- ============================================================

CREATE TABLE IF NOT EXISTS "Follow" (
  "id"          TEXT NOT NULL,
  "followerId"  TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId");

CREATE TABLE IF NOT EXISTS "ProfileLike" (
  "id"        TEXT NOT NULL,
  "likerId"   TEXT NOT NULL,
  "targetId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileLike_likerId_targetId_key" ON "ProfileLike"("likerId", "targetId");
CREATE INDEX IF NOT EXISTS "ProfileLike_targetId_idx" ON "ProfileLike"("targetId");
CREATE INDEX IF NOT EXISTS "ProfileLike_likerId_idx" ON "ProfileLike"("likerId");

-- FK ke "User" (cascade, konsisten dengan model Prisma).
-- guard DO $$ ... $$ agar tidak error saat dijalankan ulang.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followerId_fkey') THEN
    ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey"
      FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followingId_fkey') THEN
    ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey"
      FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProfileLike_likerId_fkey') THEN
    ALTER TABLE "ProfileLike" ADD CONSTRAINT "ProfileLike_likerId_fkey"
      FOREIGN KEY ("likerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProfileLike_targetId_fkey') THEN
    ALTER TABLE "ProfileLike" ADD CONSTRAINT "ProfileLike_targetId_fkey"
      FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Verifikasi
SELECT 'Follow' AS tabel, COUNT(*) AS baris FROM "Follow"
UNION ALL SELECT 'ProfileLike', COUNT(*) FROM "ProfileLike";