-- BahasaCerdas — Premium Step 1
-- Additive, manual migration: enforce one Transaksi per Midtrans orderId.
--
-- Semantics:
--   * orderId is nullable, so rows without an orderId remain valid.
--   * non-null orderId values must be unique.
--   * no existing data is deleted or modified.
--
-- Run in Supabase SQL Editor only after the duplicate preflight has returned
-- zero rows. The DO block below repeats that safety check and aborts before
-- creating the index if duplicate data is found.

BEGIN;

DO $$
DECLARE
  duplicate_order_id TEXT;
BEGIN
  SELECT t."orderId"
  INTO duplicate_order_id
  FROM "Transaksi" AS t
  WHERE t."orderId" IS NOT NULL
  GROUP BY t."orderId"
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate_order_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration dibatalkan: Transaksi.orderId duplikat ditemukan (%). Tidak ada perubahan diterapkan.',
      duplicate_order_id;
  END IF;
END
$$;

DO $$
DECLARE
  existing_index_is_unique BOOLEAN;
BEGIN
  SELECT i.indisunique
  INTO existing_index_is_unique
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_index AS i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'Transaksi_orderId_key';

  IF existing_index_is_unique IS FALSE THEN
    RAISE EXCEPTION
      'Migration dibatalkan: index public.Transaksi_orderId_key sudah ada tetapi bukan UNIQUE.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaksi_orderId_key"
  ON "Transaksi" ("orderId")
  WHERE "orderId" IS NOT NULL;

COMMIT;

-- Verifikasi setelah migration:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname = 'Transaksi_orderId_key';
--
-- Expected: satu baris dengan UNIQUE INDEX dan predicate
-- WHERE ("orderId" IS NOT NULL).

-- Rollback manual bila diperlukan:
-- DROP INDEX IF EXISTS "Transaksi_orderId_key";
