-- ============================================================
-- BC PREMIUM ECONOMY FOUNDATION (fase P1)
-- Idempoten: jalankan di Supabase SQL Editor (PRODUCTION), aman diulang.
--
-- Bagian A — enum EntitlementType
-- Bagian B — tabel Plan (definisi plan: FREE / PRO / FOUNDER; future:
--            PRO_PLUS, SCHOOL, INSTITUTION)
-- Bagian C — tabel Entitlement (capability/limit per plan)
-- Bagian D — tabel PremiumUsage (konsumsi feature periodik, WIB periodKey)
--
-- TIDAK ada drop/rename/ubah data existing (additive-only).
-- Subscription langganan berbayar existing TIDAK disentuh — engine premium
-- membacanya langsung.
-- ============================================================

-- ── BAGIAN A: ENUM ENTITLEMENT TYPE ───────────────────────────
DO $$
BEGIN
  CREATE TYPE "EntitlementType" AS ENUM ('BOOLEAN', 'LIMIT', 'UNLIMITED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── BAGIAN B: TABEL PLAN ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Plan" (
  "id"          TEXT PRIMARY KEY,
  "code"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan" ("code");

-- ── BAGIAN C: TABEL ENTITLEMENT ───────────────────────────────
CREATE TABLE IF NOT EXISTS "Entitlement" (
  "id"        TEXT PRIMARY KEY,
  "planCode"  TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "type"      "EntitlementType" NOT NULL,
  "value"     INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Entitlement_planCode_key_key" ON "Entitlement" ("planCode", "key");
CREATE INDEX IF NOT EXISTS "Entitlement_key_idx" ON "Entitlement" ("key");
CREATE INDEX IF NOT EXISTS "Entitlement_planCode_idx" ON "Entitlement" ("planCode");

-- ── BAGIAN D: TABEL PREMIUM USAGE ─────────────────────────────
CREATE TABLE IF NOT EXISTS "PremiumUsage" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "featureCode" TEXT NOT NULL,
  "periodKey"   TEXT NOT NULL,
  "used"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "PremiumUsage_userId_featureCode_periodKey_key"
  ON "PremiumUsage" ("userId", "featureCode", "periodKey");
CREATE INDEX IF NOT EXISTS "PremiumUsage_featureCode_periodKey_idx"
  ON "PremiumUsage" ("featureCode", "periodKey");
CREATE INDEX IF NOT EXISTS "PremiumUsage_userId_idx"
  ON "PremiumUsage" ("userId");
