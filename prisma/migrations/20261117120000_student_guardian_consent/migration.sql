CREATE TYPE "StudentGuardianConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED', 'REVOKED');

CREATE TABLE "StudentGuardianConsent" (
    "studentAuthId" UUID PRIMARY KEY,
    "guardianAuthId" UUID NOT NULL,
    "studentLabel" TEXT NOT NULL,
    "reviewReference" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "verifiedUntil" TIMESTAMP(3) NOT NULL,
    "status" "StudentGuardianConsentStatus" NOT NULL DEFAULT 'PENDING',
    "noticeVersion" TEXT,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "student_guardian_distinct" CHECK ("studentAuthId" <> "guardianAuthId")
);

CREATE INDEX "StudentGuardianConsent_guardianAuthId_idx" ON "StudentGuardianConsent"("guardianAuthId");
