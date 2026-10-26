-- =============================================================================
-- TrialClaim — klaim uji coba Premium Umum sekali per orang
-- ADDITIVE: 1 tabel baru + indeks. Tidak menyentuh tabel/kolom lain, tanpa
-- backfill, tanpa FK ke "User" (baris harus bertahan saat akun dihapus).
-- Hanya hash HMAC — tidak ada email/IP mentah.
--
-- Rollback:
--   DROP TABLE IF EXISTS "TrialClaim";
-- =============================================================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrialClaim" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "googleSubHash" TEXT,
    "ipPrefixHash" TEXT,
    "userId" TEXT NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrialClaim_kind_emailHash_key" ON "TrialClaim"("kind", "emailHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrialClaim_kind_googleSubHash_key" ON "TrialClaim"("kind", "googleSubHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialClaim_kind_ipPrefixHash_createdAt_idx" ON "TrialClaim"("kind", "ipPrefixHash", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialClaim_userId_idx" ON "TrialClaim"("userId");
