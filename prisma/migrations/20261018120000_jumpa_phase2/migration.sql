-- =============================================================================
-- JUMPA Fase 2 — undangan, obrolan, laporan, kehadiran, kontrol host
-- ADDITIVE: hanya ADD COLUMN (nullable / ber-DEFAULT) pada 3 tabel JUMPA
-- Fase 1 + 3 tabel baru (JumpaInvite, JumpaChatMessage, JumpaReport).
-- Tidak ada DROP/RENAME, tidak menyentuh tabel modul lain.
-- Prasyarat: 20261018000000_jumpa_phase1 sudah diterapkan.
-- Paritas: SQL di bawah identik dengan
--   prisma migrate diff --from-schema-datamodel <schema fase 1> --to-schema-datamodel prisma/schema.prisma
-- ditambah blok ENABLE ROW LEVEL SECURITY (konvensi
-- prisma/migrations/manual/2026-07-17_enable_rls_public.sql).
--
-- WORKFLOW (sama dengan 20261018000000_jumpa_phase1 / main_bersama):
-- JANGAN `npm run db:migrate` / `prisma migrate deploy`.
--   1. review file ini
--   2. apply via Supabase SQL Editor / psql (single transaction) — atau
--      otomatis lewat ops/vps/jumpa-setup.sh
--   3. verifikasi: 6 tabel Jumpa*, kolom baru ada, RLS aktif
--   4. npx prisma migrate resolve --applied 20261018120000_jumpa_phase2
--
-- RLS: tabel hanya diakses via Prisma (BYPASSRLS). Tanpa policy = deny-all
-- untuk anon/authenticated lewat PostgREST.
-- Rollback (urut):
--   DROP TABLE "JumpaReport", "JumpaChatMessage", "JumpaInvite";
--   DROP INDEX "JumpaEvent_dedupeKey_key";
--   ALTER TABLE "JumpaEvent" DROP COLUMN "dedupeKey";
--   ALTER TABLE "JumpaParticipant" DROP COLUMN "joinCount", DROP COLUMN "lastJoinedAt",
--     DROP COLUMN "lastLeftAt", DROP COLUMN "totalSeconds";
--   ALTER TABLE "JumpaRoom" DROP COLUMN "allowMuridScreenShare", DROP COLUMN "chatEnabled",
--     DROP COLUMN "communityId", DROP COLUMN "endReason", DROP COLUMN "endedById", DROP COLUMN "warnedAt";
-- =============================================================================

-- AlterTable
ALTER TABLE "JumpaRoom" ADD COLUMN     "allowMuridScreenShare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "endReason" TEXT,
ADD COLUMN     "endedById" TEXT,
ADD COLUMN     "warnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JumpaParticipant" ADD COLUMN     "joinCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastJoinedAt" TIMESTAMP(3),
ADD COLUMN     "lastLeftAt" TIMESTAMP(3),
ADD COLUMN     "totalSeconds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "JumpaEvent" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "JumpaInvite" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "groupId" TEXT,
    "communityId" TEXT,
    "userId" TEXT,
    "tokenHash" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JumpaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JumpaChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JumpaChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JumpaReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "chatSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JumpaReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JumpaInvite_tokenHash_key" ON "JumpaInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "JumpaInvite_roomId_idx" ON "JumpaInvite"("roomId");

-- CreateIndex
CREATE INDEX "JumpaInvite_userId_idx" ON "JumpaInvite"("userId");

-- CreateIndex
CREATE INDEX "JumpaChatMessage_roomId_createdAt_idx" ON "JumpaChatMessage"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "JumpaChatMessage_createdAt_idx" ON "JumpaChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "JumpaReport_roomId_idx" ON "JumpaReport"("roomId");

-- CreateIndex
CREATE INDEX "JumpaReport_status_createdAt_idx" ON "JumpaReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JumpaEvent_dedupeKey_key" ON "JumpaEvent"("dedupeKey");

-- AddForeignKey
ALTER TABLE "JumpaInvite" ADD CONSTRAINT "JumpaInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JumpaChatMessage" ADD CONSTRAINT "JumpaChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JumpaReport" ADD CONSTRAINT "JumpaReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (deny-all; akses hanya via Prisma)
ALTER TABLE "JumpaInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JumpaChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JumpaReport" ENABLE ROW LEVEL SECURITY;
