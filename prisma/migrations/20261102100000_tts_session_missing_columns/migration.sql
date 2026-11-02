-- TtsSession columns present in schema.prisma but never shipped in a migration
-- (production drift found 2026-11-02). Additive and idempotent.
ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "wrongAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "unresolvedClues" JSONB;
ALTER TABLE "TtsSession" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
