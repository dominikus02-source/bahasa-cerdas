-- P2.6G.4A — additive immutable reward-definition version for receipts.
-- Apply only to approved non-production PostgreSQL. Existing receipts are not
-- modified; new authoritative battle receipts set this field at creation.

BEGIN;

ALTER TABLE "PendekarRewardReceipt"
  ADD COLUMN IF NOT EXISTS "definitionVersion" TEXT;

COMMIT;
