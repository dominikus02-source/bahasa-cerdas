-- DailyBusinessSnapshot — Historical daily business snapshot (Phase 9.2).
--
-- Additive-only: creates ONE new table + CHECK constraints. Does NOT touch
-- existing tables (User, Transaksi, XPTransaction, Premium state, dsb.).
--
-- Jalankan di: Supabase SQL Editor (ad hoc, saat Phase 9.2 disetujui) dengan
-- urutan: PRODUCTION dulu, lalu STAGING. JANGAN diterapkan sebelum keputusan.
-- Idempoten: aman dijalankan ulang (IF NOT EXISTS / EXCEPTION guard).
--
-- Contract: docs/HISTORICAL_SNAPSHOT_FINAL_CONTRACT.md (§4 invariants, §5 model).

-- CreateTable: DailyBusinessSnapshot
CREATE TABLE IF NOT EXISTS "DailyBusinessSnapshot" (
    "id"                 TEXT         NOT NULL,
    "businessDate"       TIMESTAMP(3) NOT NULL,
    "generatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers"         INTEGER      NOT NULL,
    "muridUsers"         INTEGER      NOT NULL,
    "guruUsers"          INTEGER      NOT NULL,
    "dau"                INTEGER      NOT NULL,
    "wau"                INTEGER      NOT NULL,
    "mau"                INTEGER      NOT NULL,
    "activePremium"      INTEGER      NOT NULL,
    "muridPremium"       INTEGER      NOT NULL,
    "guruPremium"        INTEGER      NOT NULL,
    "mrr"                INTEGER      NOT NULL,
    "muridMonthlyMrr"    INTEGER      NOT NULL,
    "muridYearlyMrr"     INTEGER      NOT NULL,
    "guruMonthlyMrr"     INTEGER      NOT NULL,
    "guruYearlyMrr"      INTEGER      NOT NULL,
    "calculationVersion" TEXT         NOT NULL DEFAULT '1.0',

    CONSTRAINT "DailyBusinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- Uniqueness: exactly one snapshot per (businessDate, calculationVersion).
CREATE UNIQUE INDEX IF NOT EXISTS "DailyBusinessSnapshot_businessDate_calculationVersion_key"
    ON "DailyBusinessSnapshot"("businessDate", "calculationVersion");

CREATE INDEX IF NOT EXISTS "DailyBusinessSnapshot_businessDate_idx"
    ON "DailyBusinessSnapshot"("businessDate");

-- CHECK constraints — contract §4 invariants (second defense layer; the
-- generator's write-time assertions are the first). All idempotent.
DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_mrr_decomposition
    CHECK ("mrr" = "muridMonthlyMrr" + "muridYearlyMrr" + "guruMonthlyMrr" + "guruYearlyMrr");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_premium_decomposition
    CHECK ("activePremium" = "muridPremium" + "guruPremium");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_non_negative
    CHECK ("mrr" >= 0 AND "muridMonthlyMrr" >= 0 AND "muridYearlyMrr" >= 0
           AND "guruMonthlyMrr" >= 0 AND "guruYearlyMrr" >= 0
           AND "activePremium" >= 0 AND "muridPremium" >= 0 AND "guruPremium" >= 0
           AND "totalUsers" >= 0 AND "muridUsers" >= 0 AND "guruUsers" >= 0
           AND "dau" >= 0 AND "wau" >= 0 AND "mau" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_activity_hierarchy
    CHECK ("dau" <= "wau" AND "wau" <= "mau");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_premium_bounds
    CHECK ("activePremium" <= "totalUsers"
           AND "muridPremium" <= "muridUsers"
           AND "guruPremium" <= "guruUsers");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Role semantics (Phase 9.3): User universe = GURU/MURID/ADMIN, so the two
-- split buckets can never exceed the total.
DO $$ BEGIN
  ALTER TABLE "DailyBusinessSnapshot"
    ADD CONSTRAINT daily_snapshot_role_bounds
    CHECK ("muridUsers" + "guruUsers" <= "totalUsers");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;