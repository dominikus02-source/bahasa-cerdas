-- ═══════════════════════════════════════════════════════════════════════════
-- P7D — Guru Cerdas Sejahtera: Automated Payout Infrastructure
-- JALANKAN INI DI SUPABASE SQL EDITOR SETELAH SCRIPT P7C
-- (prisma/migrations/manual/2026-08-26_p7c_commission_wallet.sql).
-- IDEMPOTEN: aman dijalankan berulang. Additive-only.
--
-- Berisi:
--   1. 3 enum: DestinationType, ProfileVerificationStatus, PayoutStatus
--   2. 3 tabel: TeacherPayoutProfile, TeacherPayout, TeacherPayoutEvent
--   3. Unique key: withdrawalId (1 withdrawal = 1 logical payout),
--      providerReference, idempotencyKey, providerEventId (webhook idempotency)
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateEnum
DO $$ BEGIN CREATE TYPE "DestinationType" AS ENUM ('BANK', 'EWALLET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "ProfileVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'VALIDATING', 'SUBMITTING', 'PROCESSING', 'PAID', 'FAILED', 'RETRYABLE_FAILURE', 'RECONCILIATION_REQUIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherPayoutProfile" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "destinationType" "DestinationType" NOT NULL DEFAULT 'BANK',
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "verificationStatus" "ProfileVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherPayout" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "destinationType" "DestinationType" NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerStatus" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherPayoutEvent" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "raw" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherPayoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayoutProfile_teacherId_key" ON "TeacherPayoutProfile"("teacherId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayoutProfile_verificationStatus_idx" ON "TeacherPayoutProfile"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayout_withdrawalId_key" ON "TeacherPayout"("withdrawalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayout_providerReference_key" ON "TeacherPayout"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayout_idempotencyKey_key" ON "TeacherPayout"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayout_teacherId_status_idx" ON "TeacherPayout"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayout_status_nextRetryAt_idx" ON "TeacherPayout"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayout_status_createdAt_idx" ON "TeacherPayout"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayout_provider_idx" ON "TeacherPayout"("provider");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayoutEvent_providerEventId_key" ON "TeacherPayoutEvent"("providerEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayoutEvent_payoutId_idx" ON "TeacherPayoutEvent"("payoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherPayoutEvent_processedAt_idx" ON "TeacherPayoutEvent"("processedAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherPayoutProfile_teacherId_fkey') THEN
    ALTER TABLE "TeacherPayoutProfile" ADD CONSTRAINT "TeacherPayoutProfile_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherPayout_withdrawalId_fkey') THEN
    ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "TeacherCommissionWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherPayout_teacherId_fkey') THEN
    ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherPayoutEvent_payoutId_fkey') THEN
    ALTER TABLE "TeacherPayoutEvent" ADD CONSTRAINT "TeacherPayoutEvent_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "TeacherPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
