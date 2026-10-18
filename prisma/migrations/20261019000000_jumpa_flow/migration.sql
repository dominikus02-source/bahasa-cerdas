-- =============================================================================
-- JUMPA Alur penuh — jadwal + log notifikasi
-- ADDITIVE: 1 tabel baru (JumpaNotice) + 1 index + 1 kolom (notifyClass,
-- DEFAULT true) di JumpaRoom.
-- Tidak ada DROP/RENAME, tidak mengubah kolom, tidak menyentuh modul lain.
-- Jadwal memakai kolom yang SUDAH ADA sejak fase 1: JumpaRoom.scheduledAt
-- (status SCHEDULED) dan maxDurationMin (durasi pilihan guru).
-- Prasyarat: 20261018000000_jumpa_phase1 + 20261018120000_jumpa_phase2.
-- Paritas: identik dengan
--   prisma migrate diff --from-schema-datamodel <schema fase 3> --to-schema-datamodel prisma/schema.prisma
-- ditambah ENABLE ROW LEVEL SECURITY (tanpa policy = deny-all untuk
-- anon/authenticated; aplikasi hanya lewat Prisma/BYPASSRLS).
--
-- WORKFLOW (sama dengan fase 1/2): JANGAN `prisma migrate deploy`.
--   1. review  2. apply via psql/SQL Editor (atau ops/vps/jumpa-setup.sh)
--   3. npx prisma migrate resolve --applied 20261019000000_jumpa_flow
-- Rollback:
--   DROP TABLE "JumpaNotice";
--   DROP INDEX "JumpaRoom_status_scheduledAt_idx";
--   ALTER TABLE "JumpaRoom" DROP COLUMN "notifyClass";
-- =============================================================================

-- AlterTable ("Beri tahu kelas"; ruang lama tetap memberi tahu = perilaku lama)
ALTER TABLE "JumpaRoom" ADD COLUMN "notifyClass" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "JumpaNotice" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "pushed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JumpaNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JumpaNotice_dedupeKey_key" ON "JumpaNotice"("dedupeKey");

-- CreateIndex
CREATE INDEX "JumpaNotice_roomId_createdAt_idx" ON "JumpaNotice"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "JumpaRoom_status_scheduledAt_idx" ON "JumpaRoom"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "JumpaNotice" ADD CONSTRAINT "JumpaNotice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (deny-all; akses hanya via Prisma)
ALTER TABLE "JumpaNotice" ENABLE ROW LEVEL SECURITY;
