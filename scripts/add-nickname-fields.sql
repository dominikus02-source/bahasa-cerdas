-- Phase: Profil Murid Redesign + Nama Panggilan (nickname layer)
-- Additive only — safe to run on live Supabase DB. Run via Supabase SQL editor
-- or `psql "$DIRECT_URL" -f scripts/migrations/add-nickname-fields.sql`

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nicknameUpdatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "NicknameHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldNickname" TEXT,
    "newNickname" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NicknameHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NicknameHistory_userId_idx" ON "NicknameHistory"("userId");
CREATE INDEX IF NOT EXISTS "NicknameHistory_changedAt_idx" ON "NicknameHistory"("changedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'NicknameHistory_userId_fkey'
  ) THEN
    ALTER TABLE "NicknameHistory"
      ADD CONSTRAINT "NicknameHistory_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;
