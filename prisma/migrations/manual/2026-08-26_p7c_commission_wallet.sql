-- ═══════════════════════════════════════════════════════════════════════════
-- P7C — Guru Cerdas Sejahtera: Commission Engine + Teacher Wallet
-- JALANKAN INI DI SUPABASE SQL EDITOR (Production dulu, Preview menyusul).
-- IDEMPOTEN: aman dijalankan berulang. Additive-only: tidak drop/ubah data lama.
--
-- Berisi SELURUH infrastruktur P7B + P7C:
--   A. 6 enum attribution/komisi/wallet/withdrawal
--   B. 5 tabel: TeacherAttribution, TeacherAttributionEvent, TeacherCommission,
--      TeacherWallet, TeacherCommissionWithdrawal
--   C. Unique key [transaksiId, teacherId, entryType] (idempotensi db-level)
--   D. AdminPaymentAuditLog.adminUserId → nullable (system event = null actor)
--
-- NOTE: bila sebelumnya pernah `prisma db push` skema P7B lama, constraint
-- unique 2-kolom lama di TeacherCommission otomatis diganti di langkah C.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── A. ENUMS (DO block — idempoten) ──

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AttributionSource" AS ENUM ('CLASS_ENROLLMENT', 'REFERRAL_LINK', 'REFERRAL_CODE', 'MANUAL_ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AttributionStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'REVOKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'AVAILABLE', 'PROCESSING', 'PAID', 'REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "CommissionEntryType" AS ENUM ('COMMISSION', 'REVERSAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "TeacherWithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TRANSFERRED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "AdminPaymentAuditLog" ALTER COLUMN "adminUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherAttribution" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "source" "AttributionSource" NOT NULL,
    "sourceGroupId" TEXT,
    "sourceCode" TEXT,
    "status" "AttributionStatus" NOT NULL DEFAULT 'ACTIVE',
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibleFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctedBy" TEXT,
    "correctedAt" TIMESTAMP(3),
    "correctionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherAttributionEvent" (
    "id" TEXT NOT NULL,
    "attributionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actorUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAttributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherCommission" (
    "id" TEXT NOT NULL,
    "entryType" "CommissionEntryType" NOT NULL DEFAULT 'COMMISSION',
    "transaksiId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attributionId" TEXT NOT NULL,
    "attributionSource" "AttributionSource" NOT NULL,
    "sourceGroupId" TEXT,
    "eligibleFrom" TIMESTAMP(3) NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "holdingEndsAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversedReason" TEXT,
    "reversedBy" TEXT,
    "reversalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherWallet" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "pendingBalance" INTEGER NOT NULL DEFAULT 0,
    "lockedBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeWithdrawn" INTEGER NOT NULL DEFAULT 0,
    "totalPaid" INTEGER NOT NULL DEFAULT 0,
    "totalReversed" INTEGER NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherCommissionWithdrawal" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "status" "TeacherWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherCommissionWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttribution_studentId_key" ON "TeacherAttribution"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherAttribution_teacherId_status_idx" ON "TeacherAttribution"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherAttribution_sourceGroupId_idx" ON "TeacherAttribution"("sourceGroupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherAttribution_createdAt_idx" ON "TeacherAttribution"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherAttributionEvent_attributionId_idx" ON "TeacherAttributionEvent"("attributionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherAttributionEvent_createdAt_idx" ON "TeacherAttributionEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommission_teacherId_status_idx" ON "TeacherCommission"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommission_status_createdAt_idx" ON "TeacherCommission"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommission_transaksiId_idx" ON "TeacherCommission"("transaksiId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommission_studentId_idx" ON "TeacherCommission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherCommission_transaksiId_teacherId_entryType_key" ON "TeacherCommission"("transaksiId", "teacherId", "entryType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherWallet_teacherId_key" ON "TeacherWallet"("teacherId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherWallet_status_idx" ON "TeacherWallet"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommissionWithdrawal_teacherId_status_idx" ON "TeacherCommissionWithdrawal"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommissionWithdrawal_status_idx" ON "TeacherCommissionWithdrawal"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherCommissionWithdrawal_createdAt_idx" ON "TeacherCommissionWithdrawal"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttribution_studentId_fkey') THEN
    ALTER TABLE "TeacherAttribution" ADD CONSTRAINT "TeacherAttribution_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttribution_teacherId_fkey') THEN
    ALTER TABLE "TeacherAttribution" ADD CONSTRAINT "TeacherAttribution_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttribution_sourceGroupId_fkey') THEN
    ALTER TABLE "TeacherAttribution" ADD CONSTRAINT "TeacherAttribution_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttributionEvent_attributionId_fkey') THEN
    ALTER TABLE "TeacherAttributionEvent" ADD CONSTRAINT "TeacherAttributionEvent_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "TeacherAttribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttributionEvent_actorUserId_fkey') THEN
    ALTER TABLE "TeacherAttributionEvent" ADD CONSTRAINT "TeacherAttributionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommission_transaksiId_fkey') THEN
    ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommission_teacherId_fkey') THEN
    ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommission_studentId_fkey') THEN
    ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommission_attributionId_fkey') THEN
    ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "TeacherAttribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherWallet_teacherId_fkey') THEN
    ALTER TABLE "TeacherWallet" ADD CONSTRAINT "TeacherWallet_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommissionWithdrawal_walletId_fkey') THEN
    ALTER TABLE "TeacherCommissionWithdrawal" ADD CONSTRAINT "TeacherCommissionWithdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "TeacherWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherCommissionWithdrawal_teacherId_fkey') THEN
    ALTER TABLE "TeacherCommissionWithdrawal" ADD CONSTRAINT "TeacherCommissionWithdrawal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;


-- ── C. FIXUP bila tabel P7B lama sudah ada (unique 2-kolom → 3-kolom) ──

-- db push lama bisa membuat unique key ini sebagai CONSTRAINT atau INDEX —
-- dua-duanya harus dibersihkan agar entry reversal bisa hidup berdampingan
-- dengan entry positifnya (unique baru 3-kolom dibuat di bagian atas).
ALTER TABLE "TeacherCommission" DROP CONSTRAINT IF EXISTS "TeacherCommission_transaksiId_teacherId_key";
DROP INDEX IF EXISTS "TeacherCommission_transaksiId_teacherId_key";

-- ── D. Verifikasi (jalankan dan pastikan hasilnya tampil) ──
-- SELECT column_name FROM information_schema.columns WHERE table_name='TeacherWallet' ORDER BY ordinal_position;
-- SELECT indexname FROM pg_indexes WHERE tablename='TeacherCommission';
