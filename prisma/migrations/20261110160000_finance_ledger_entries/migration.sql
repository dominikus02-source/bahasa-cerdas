-- Additive finance ledger (Buku Kas) for founder/admin manual entries.
-- Amount is always a positive rupiah integer. App access is via Prisma (table owner);
-- RLS is enabled without FORCE so the table owner/Prisma role still has full access,
-- while anon/authenticated have no policies (default deny).

CREATE TYPE "FinanceLedgerType" AS ENUM ('PEMASUKAN', 'PENGELUARAN');

CREATE TABLE "FinanceLedgerEntry" (
    "id" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "type" "FinanceLedgerType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "createdById" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinanceLedgerEntry_amount_positive" CHECK ("amount" > 0)
);

CREATE INDEX "FinanceLedgerEntry_entryDate_idx" ON "FinanceLedgerEntry"("entryDate");
CREATE INDEX "FinanceLedgerEntry_type_idx" ON "FinanceLedgerEntry"("type");
CREATE INDEX "FinanceLedgerEntry_entryDate_type_idx" ON "FinanceLedgerEntry"("entryDate", "type");
CREATE INDEX "FinanceLedgerEntry_createdAt_idx" ON "FinanceLedgerEntry"("createdAt");

ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceLedgerEntry" ENABLE ROW LEVEL SECURITY;
