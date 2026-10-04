CREATE TABLE "PrivacyIncident" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'ASSESS',
  "status" TEXT NOT NULL DEFAULT 'DETECTED',
  "description" TEXT,
  "dataCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "affectedChildren" BOOLEAN NOT NULL DEFAULT false,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "notificationDeadlineAt" TIMESTAMP(3),
  "notificationRequired" BOOLEAN,
  "notifiedAt" TIMESTAMP(3),
  "containment" TEXT,
  "evidenceRef" TEXT,
  "ownerId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivacyIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyIncident_status_detectedAt_idx" ON "PrivacyIncident"("status","detectedAt");
CREATE INDEX "PrivacyIncident_notificationDeadlineAt_idx" ON "PrivacyIncident"("notificationDeadlineAt");

ALTER TABLE "PrivacyIncident" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PrivacyIncident" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "PrivacyIncident" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "PrivacyIncident" FROM authenticated; END IF;
END $$;
