-- Roblox link: BahasaCerdas user <-> Roblox userId, one-time codes, age attestation, play sessions.
-- Idempotent so it can be applied with psql before the web process restarts.

CREATE TABLE IF NOT EXISTS "RobloxLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "robloxUserId" TEXT NOT NULL,
  "robloxUsername" TEXT,
  "robloxDisplayName" TEXT,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RobloxLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RobloxLinkRevocation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "robloxUserId" TEXT NOT NULL,
  "robloxUsername" TEXT,
  "linkedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RobloxLinkRevocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RobloxLinkCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "usedByRobloxUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RobloxLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RobloxAgeAttestation" (
  "userId" TEXT NOT NULL,
  "confirmedMinAge" INTEGER NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RobloxAgeAttestation_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "RobloxPlaySession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "robloxUserId" TEXT NOT NULL,
  "level" INTEGER,
  "unitId" TEXT,
  "unitTitle" TEXT,
  "answerKey" JSONB NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RobloxPlaySession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RobloxLink_userId_key" ON "RobloxLink"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "RobloxLink_robloxUserId_key" ON "RobloxLink"("robloxUserId");
CREATE INDEX IF NOT EXISTS "RobloxLinkRevocation_userId_revokedAt_idx" ON "RobloxLinkRevocation"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "RobloxLinkRevocation_robloxUserId_idx" ON "RobloxLinkRevocation"("robloxUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "RobloxLinkCode_code_key" ON "RobloxLinkCode"("code");
CREATE INDEX IF NOT EXISTS "RobloxLinkCode_userId_createdAt_idx" ON "RobloxLinkCode"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RobloxPlaySession_userId_createdAt_idx" ON "RobloxPlaySession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RobloxPlaySession_robloxUserId_createdAt_idx" ON "RobloxPlaySession"("robloxUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "RobloxPlaySession_idempotencyKey_idx" ON "RobloxPlaySession"("idempotencyKey");

DO $$ BEGIN
  ALTER TABLE "RobloxLink" ADD CONSTRAINT "RobloxLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RobloxLinkRevocation" ADD CONSTRAINT "RobloxLinkRevocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RobloxLinkCode" ADD CONSTRAINT "RobloxLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RobloxAgeAttestation" ADD CONSTRAINT "RobloxAgeAttestation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RobloxPlaySession" ADD CONSTRAINT "RobloxPlaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
