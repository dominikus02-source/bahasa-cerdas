

-- CreateTable
CREATE TABLE "PrivacyAccount" (
    "userId" TEXT NOT NULL,
    "birthDate" DATE,
    "ageBand" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "ageMethod" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "guardianStatus" TEXT NOT NULL DEFAULT 'NONE',
    "guardianConsentVersion" TEXT,
    "publicProfile" BOOLEAN NOT NULL DEFAULT false,
    "publicWorks" BOOLEAN NOT NULL DEFAULT false,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "aiAssistance" BOOLEAN NOT NULL DEFAULT false,
    "noticeVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyAccount_pkey" PRIMARY KEY ("userId")
);


-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "evidenceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "GuardianRequest" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "guardianId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "verificationRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianRequest_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "contact" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "DeletionJob" (
    "userId" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "objectManifest" JSONB NOT NULL DEFAULT '[]',
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletionJob_pkey" PRIMARY KEY ("userId")
);


-- CreateIndex
CREATE INDEX "ConsentEvent_subjectId_purpose_createdAt_idx" ON "ConsentEvent"("subjectId", "purpose", "createdAt");


-- CreateIndex
CREATE UNIQUE INDEX "GuardianRequest_tokenHash_key" ON "GuardianRequest"("tokenHash");


-- CreateIndex
CREATE INDEX "GuardianRequest_childId_status_idx" ON "GuardianRequest"("childId", "status");


-- CreateIndex
CREATE INDEX "SafetyReport_status_createdAt_idx" ON "SafetyReport"("status", "createdAt");


-- CreateIndex
CREATE INDEX "ComplianceAudit_subjectId_createdAt_idx" ON "ComplianceAudit"("subjectId", "createdAt");


-- AddForeignKey
ALTER TABLE "PrivacyAccount" ADD CONSTRAINT "PrivacyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyAccount" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PrivacyAccount" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "PrivacyAccount" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "PrivacyAccount" FROM authenticated; END IF;
END $$;
ALTER TABLE "ConsentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ConsentEvent" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ConsentEvent" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "ConsentEvent" FROM authenticated; END IF;
END $$;
ALTER TABLE "GuardianRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "GuardianRequest" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "GuardianRequest" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "GuardianRequest" FROM authenticated; END IF;
END $$;
ALTER TABLE "SafetyReport" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SafetyReport" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "SafetyReport" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "SafetyReport" FROM authenticated; END IF;
END $$;
ALTER TABLE "ComplianceAudit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ComplianceAudit" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ComplianceAudit" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "ComplianceAudit" FROM authenticated; END IF;
END $$;
ALTER TABLE "DeletionJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "DeletionJob" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "DeletionJob" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "DeletionJob" FROM authenticated; END IF;
END $$;
CREATE FUNCTION compliance_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Compliance evidence is append-only'; END $$;
CREATE TRIGGER consent_append_only BEFORE UPDATE OR DELETE ON "ConsentEvent" FOR EACH ROW EXECUTE FUNCTION compliance_append_only();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON "ComplianceAudit" FOR EACH ROW EXECUTE FUNCTION compliance_append_only();
