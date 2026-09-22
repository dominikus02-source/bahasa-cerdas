-- P1A.2E.3 — Canonical User cosmetics schema alignment.
--
-- Prisma schema requires both fields as String? (`TEXT NULL` in PostgreSQL).
-- This is an additive, idempotent migration for the repository's legacy
-- psql-managed schema lifecycle. It intentionally does not create or alter
-- `_prisma_migrations`, which is not the migration authority for this baseline.
--
-- Scope: public."User" only. No defaults, backfill, indexes, or data changes.

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "equippedBackground" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "equippedNameplate" TEXT;

COMMIT;

-- Post-apply verification (read-only):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'User'
--   AND column_name IN ('equippedBackground', 'equippedNameplate')
-- ORDER BY column_name;
