-- Arena Junior — dasbor murid TK–SD (kurikulum terpisah dari Jalur Cerdas).
--
-- Jalankan di: Supabase SQL Editor (PRODUCTION dulu, lalu STAGING).
-- Idempoten: aman dijalankan ulang.
--
-- Catatan: percobaan pertama memakai penamaan snake_case (arena_junior_lessons)
-- dan gagal memasang foreign key karena tabel user di schema ini bernama "User",
-- bukan "users". Dua tabel itu dibuat tanpa FK dan tidak pernah diisi data,
-- jadi aman dibuang di sini.

DROP TABLE IF EXISTS "arena_junior_progress";
DROP TABLE IF EXISTS "arena_junior_lessons";
DROP TYPE IF EXISTS "GradeLevel";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ArenaJuniorGrade" AS ENUM ('TK', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaJuniorLesson" (
    "id" TEXT NOT NULL,
    "grade" "ArenaJuniorGrade" NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "stageTitle" TEXT NOT NULL,
    "unitOrder" INTEGER NOT NULL,
    "unitTitle" TEXT NOT NULL,
    "lessonOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "lessonType" TEXT NOT NULL,
    "characterHint" TEXT NOT NULL DEFAULT 'zelby',
    "content" JSONB,
    "sourceKey" TEXT,
    "themeColor" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaJuniorLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaJuniorProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaJuniorProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaJuniorLesson_grade_stageOrder_unitOrder_lessonOrder_idx" ON "ArenaJuniorLesson"("grade", "stageOrder", "unitOrder", "lessonOrder");
CREATE INDEX IF NOT EXISTS "ArenaJuniorLesson_grade_isActive_idx" ON "ArenaJuniorLesson"("grade", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaJuniorLesson_grade_stageOrder_unitOrder_lessonOrder_key" ON "ArenaJuniorLesson"("grade", "stageOrder", "unitOrder", "lessonOrder");
CREATE INDEX IF NOT EXISTS "ArenaJuniorProgress_userId_idx" ON "ArenaJuniorProgress"("userId");
CREATE INDEX IF NOT EXISTS "ArenaJuniorProgress_lessonId_idx" ON "ArenaJuniorProgress"("lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaJuniorProgress_userId_lessonId_key" ON "ArenaJuniorProgress"("userId", "lessonId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ArenaJuniorProgress"
    ADD CONSTRAINT "ArenaJuniorProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArenaJuniorProgress"
    ADD CONSTRAINT "ArenaJuniorProgress_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "ArenaJuniorLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS: schema `public` diekspos PostgREST lewat anon key, jadi tabel baru wajib
-- diaktifkan RLS-nya (tanpa policy = deny-all untuk anon/authenticated).
-- Aplikasi memakai Prisma dengan role `postgres` (BYPASSRLS), jadi tidak terpengaruh.
-- Lihat 2026-07-17_enable_rls_public.sql.
ALTER TABLE "ArenaJuniorLesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArenaJuniorProgress" ENABLE ROW LEVEL SECURITY;

-- Verifikasi (opsional): harus mengembalikan 2 baris, keduanya rowsecurity = true.
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename LIKE 'ArenaJunior%';
