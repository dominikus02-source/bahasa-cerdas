-- ═══════════════════════════════════════════════════════════════════════════
-- P8C — Guru Cerdas Sejahtera: Trust, Fraud & Financial Safety Layer
-- JALANKAN INI DI SUPABASE SQL EDITOR (setelah script P7C/P7D/P7E).
-- IDEMPOTEN: aman dijalankan berulang. Additive-only — TIDAK menyentuh
-- financial source of truth (TeacherCommission/TeacherWallet/TeacherPayout).
--
-- Berisi: 3 enum (RiskSeverity, RiskCaseStatus, RiskActorType) + 3 tabel
-- (TeacherRiskCase, TeacherRiskSignal, TeacherRiskAction) + dedupe key
-- @@unique([signalType, dedupeKey]) untuk idempotensi signal.
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RiskCaseStatus" AS ENUM ('REVIEW', 'RESTRICTED', 'CLEARED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RiskActorType" AS ENUM ('SYSTEM', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherRiskCase" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "RiskCaseStatus" NOT NULL DEFAULT 'REVIEW',
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "reason" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRiskCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherRiskSignal" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "riskCaseId" TEXT,
    "signalType" TEXT NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'LOW',
    "dedupeKey" TEXT NOT NULL,
    "evidence" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeacherRiskAction" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "riskCaseId" TEXT,
    "actionType" TEXT NOT NULL,
    "actorType" "RiskActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherRiskAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskCase_teacherId_status_idx" ON "TeacherRiskCase"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskCase_status_openedAt_idx" ON "TeacherRiskCase"("status", "openedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskSignal_teacherId_createdAt_idx" ON "TeacherRiskSignal"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskSignal_signalType_createdAt_idx" ON "TeacherRiskSignal"("signalType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherRiskSignal_signalType_dedupeKey_key" ON "TeacherRiskSignal"("signalType", "dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskAction_teacherId_createdAt_idx" ON "TeacherRiskAction"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeacherRiskAction_riskCaseId_createdAt_idx" ON "TeacherRiskAction"("riskCaseId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherRiskCase_teacherId_fkey') THEN
    ALTER TABLE "TeacherRiskCase" ADD CONSTRAINT "TeacherRiskCase_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherRiskSignal_teacherId_fkey') THEN
    ALTER TABLE "TeacherRiskSignal" ADD CONSTRAINT "TeacherRiskSignal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherRiskSignal_riskCaseId_fkey') THEN
    ALTER TABLE "TeacherRiskSignal" ADD CONSTRAINT "TeacherRiskSignal_riskCaseId_fkey" FOREIGN KEY ("riskCaseId") REFERENCES "TeacherRiskCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherRiskAction_teacherId_fkey') THEN
    ALTER TABLE "TeacherRiskAction" ADD CONSTRAINT "TeacherRiskAction_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherRiskAction_riskCaseId_fkey') THEN
    ALTER TABLE "TeacherRiskAction" ADD CONSTRAINT "TeacherRiskAction_riskCaseId_fkey" FOREIGN KEY ("riskCaseId") REFERENCES "TeacherRiskCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
