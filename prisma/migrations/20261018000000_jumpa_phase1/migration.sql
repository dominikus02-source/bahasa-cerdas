-- =============================================================================
-- JUMPA Fase 1 — tabel ruang video meeting (JumpaRoom, JumpaParticipant, JumpaEvent)
-- ADD-ONLY: membuat 4 enum + 3 tabel baru. Tidak ada DROP/ALTER tabel existing.
-- Paritas: SQL di bawah identik dengan
--   prisma migrate diff --from-schema-datamodel <schema main> --to-schema-datamodel prisma/schema.prisma
-- ditambah blok ENABLE ROW LEVEL SECURITY (konvensi
-- prisma/migrations/manual/2026-07-17_enable_rls_public.sql).
--
-- WORKFLOW (sama dengan 20260918000000_main_bersama_tables):
-- JANGAN `npm run db:migrate` / `prisma migrate deploy` (folder legacy
-- prisma/migrations/manual/ masih terdeteksi pending).
--   1. review file ini
--   2. apply via Supabase SQL Editor / psql ke DB yang sudah ber-baseline
--   3. verifikasi: 3 tabel Jumpa*, 4 enum Jumpa*, RLS aktif
--   4. npx prisma migrate resolve --applied 20261018000000_jumpa_phase1
--
-- RLS: aplikasi mengakses tabel ini HANYA via Prisma (role postgres,
-- BYPASSRLS). RLS diaktifkan TANPA policy = deny-all untuk anon/authenticated
-- lewat PostgREST. Otorisasi ada di lib/jumpa/permissions.ts.
-- Rollback: DROP TABLE "JumpaEvent", "JumpaParticipant", "JumpaRoom";
--           DROP TYPE "JumpaRoomRole", "JumpaRoomStatus", "JumpaRoomMode", "JumpaRoomKind";
-- =============================================================================

-- CreateEnum
CREATE TYPE "JumpaRoomKind" AS ENUM ('KELAS', 'GURU', 'MURID');

-- CreateEnum
CREATE TYPE "JumpaRoomMode" AS ENUM ('MEETING', 'CLASS', 'WEBINAR');

-- CreateEnum
CREATE TYPE "JumpaRoomStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "JumpaRoomRole" AS ENUM ('HOST', 'COHOST', 'MEMBER');

-- CreateTable
CREATE TABLE "JumpaRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "livekitRoomName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "JumpaRoomKind" NOT NULL,
    "mode" "JumpaRoomMode" NOT NULL DEFAULT 'CLASS',
    "status" "JumpaRoomStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "creatorRole" "Role" NOT NULL,
    "groupId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "maxParticipants" INTEGER NOT NULL,
    "maxDurationMin" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JumpaRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JumpaParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomRole" "JumpaRoomRole" NOT NULL DEFAULT 'MEMBER',
    "accessVia" TEXT NOT NULL,
    "firstJoinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTokenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,

    CONSTRAINT "JumpaParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JumpaEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JumpaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JumpaRoom_code_key" ON "JumpaRoom"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JumpaRoom_livekitRoomName_key" ON "JumpaRoom"("livekitRoomName");

-- CreateIndex
CREATE INDEX "JumpaRoom_createdById_idx" ON "JumpaRoom"("createdById");

-- CreateIndex
CREATE INDEX "JumpaRoom_groupId_idx" ON "JumpaRoom"("groupId");

-- CreateIndex
CREATE INDEX "JumpaRoom_status_idx" ON "JumpaRoom"("status");

-- CreateIndex
CREATE INDEX "JumpaParticipant_userId_idx" ON "JumpaParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JumpaParticipant_roomId_userId_key" ON "JumpaParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "JumpaEvent_roomId_createdAt_idx" ON "JumpaEvent"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "JumpaParticipant" ADD CONSTRAINT "JumpaParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JumpaEvent" ADD CONSTRAINT "JumpaEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Row Level Security (deny-all untuk PostgREST) ───────────────────────────
ALTER TABLE "JumpaRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JumpaParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JumpaEvent" ENABLE ROW LEVEL SECURITY;
