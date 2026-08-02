-- Learning Loop Engine — Sprint 5 (additive-only).
--
-- Jalankan di: Supabase SQL Editor (PRODUCTION dulu, lalu STAGING).
-- Idempoten: aman dijalankan ulang (IF NOT EXISTS / EXCEPTION guard).
--
-- Tidak menyentuh tabel lama. Semua model baru (6 tabel + 3 enum) terpisah.

-- CreateEnum: LearningSkillType
DO $$ BEGIN
  CREATE TYPE "LearningSkillType" AS ENUM ('READING', 'WRITING', 'LISTENING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY', 'LITERATURE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ActivityType
DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'JALUR_CERDAS', 'LESSON', 'KARYA', 'LIKE', 'COMMENT', 'QUIZ', 'SIMULASI_UKBI', 'SIMULASI_TKA', 'PENUGASAN', 'GAME', 'QUEST', 'ARTICLE', 'SHOP', 'LEAGUE', 'SOCIAL', 'AI');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: RecommendationType
DO $$ BEGIN
  CREATE TYPE "RecommendationType" AS ENUM ('CONTINUE_UNIT', 'IMPROVE_SKILL', 'SOCIAL_SHARE', 'WRITE_KARYA', 'PRACTICE_QUIZ', 'TRY_ARENA', 'READ_ARTICLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: LearningSkill
CREATE TABLE IF NOT EXISTS "LearningSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "LearningSkillType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LearningSkill
CREATE UNIQUE INDEX IF NOT EXISTS "LearningSkill_userId_skill_key" ON "LearningSkill"("userId", "skill");
CREATE INDEX IF NOT EXISTS "LearningSkill_userId_idx" ON "LearningSkill"("userId");

-- AddForeignKey: LearningSkill.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "LearningSkill"
    ADD CONSTRAINT "LearningSkill_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PlayerActivity
CREATE TABLE IF NOT EXISTS "PlayerActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subtype" TEXT,
    "skill" "LearningSkillType",
    "skillDelta" INTEGER,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coin" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PlayerActivity
CREATE INDEX IF NOT EXISTS "PlayerActivity_userId_createdAt_idx" ON "PlayerActivity"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlayerActivity_userId_type_idx" ON "PlayerActivity"("userId", "type");
CREATE INDEX IF NOT EXISTS "PlayerActivity_type_createdAt_idx" ON "PlayerActivity"("type", "createdAt");

-- AddForeignKey: PlayerActivity.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "PlayerActivity"
    ADD CONSTRAINT "PlayerActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: LearningJourney
CREATE TABLE IF NOT EXISTS "LearningJourney" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningJourney_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LearningJourney
CREATE INDEX IF NOT EXISTS "LearningJourney_userId_dayKey_idx" ON "LearningJourney"("userId", "dayKey");
CREATE INDEX IF NOT EXISTS "LearningJourney_userId_createdAt_idx" ON "LearningJourney"("userId", "createdAt");

-- AddForeignKey: LearningJourney.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "LearningJourney"
    ADD CONSTRAINT "LearningJourney_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: LearningRecommendation
CREATE TABLE IF NOT EXISTS "LearningRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "skill" "LearningSkillType",
    "priority" INTEGER NOT NULL DEFAULT 50,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LearningRecommendation
CREATE INDEX IF NOT EXISTS "LearningRecommendation_userId_isActive_idx" ON "LearningRecommendation"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "LearningRecommendation_userId_createdAt_idx" ON "LearningRecommendation"("userId", "createdAt");

-- AddForeignKey: LearningRecommendation.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "LearningRecommendation"
    ADD CONSTRAINT "LearningRecommendation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PlayerCTA
CREATE TABLE IF NOT EXISTS "PlayerCTA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCTA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PlayerCTA
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerCTA_userId_key" ON "PlayerCTA"("userId");

-- AddForeignKey: PlayerCTA.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "PlayerCTA"
    ADD CONSTRAINT "PlayerCTA_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: LearningInsight
CREATE TABLE IF NOT EXISTS "LearningInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LearningInsight
CREATE UNIQUE INDEX IF NOT EXISTS "LearningInsight_userId_dayKey_key" ON "LearningInsight"("userId", "dayKey");

-- AddForeignKey: LearningInsight.userId -> User.id
DO $$ BEGIN
  ALTER TABLE "LearningInsight"
    ADD CONSTRAINT "LearningInsight_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Samakan dengan seluruh schema public (lihat 2026-07-17_enable_rls_public.sql).
-- Aplikasi mengakses lewat Prisma dengan role `postgres` (BYPASSRLS), jadi
-- tidak terpengaruh. Tanpa ini, 6 tabel di atas terbuka lewat PostgREST dan
-- Supabase advisor menandainya CRITICAL.
ALTER TABLE "LearningSkill"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerActivity"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningJourney"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerCTA"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningInsight"        ENABLE ROW LEVEL SECURITY;

-- Verifikasi (opsional): harus 6 baris, rowsecurity = true semua.
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN
--   ('LearningSkill','PlayerActivity','LearningJourney',
--    'LearningRecommendation','PlayerCTA','LearningInsight');
