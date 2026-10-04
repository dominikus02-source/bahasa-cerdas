CREATE TABLE "PrivacyRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "guardianId" TEXT,
  "type" TEXT NOT NULL,
  "detail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  "assignedTo" TEXT,
  "decision" TEXT,
  "evidenceRef" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId","createdAt");
CREATE INDEX "PrivacyRequest_status_deadlineAt_idx" ON "PrivacyRequest"("status","deadlineAt");

ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PrivacyRequest" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "PrivacyRequest" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "PrivacyRequest" FROM authenticated; END IF;
END $$;
