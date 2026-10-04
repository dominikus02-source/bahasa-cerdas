-- Strengthen age assurance, policy versioning, and consent evidence.
ALTER TABLE "PrivacyAccount"
  ADD COLUMN IF NOT EXISTS "ageAssuranceLevel" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "ageVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ageChangeLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentBundleVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "termsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "childNoticeVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianNoticeVersion" TEXT;

ALTER TABLE "ConsentEvent"
  ADD COLUMN IF NOT EXISTS "childNoticeVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianNoticeVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "consentBundleVersion" TEXT;

ALTER TABLE "GuardianRequest"
  ADD COLUMN IF NOT EXISTS "termsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "childNoticeVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianNoticeVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "consentBundleVersion" TEXT;

-- Existing rows remain conservative until reviewed or re-consented.
UPDATE "PrivacyAccount"
SET "ageAssuranceLevel" = CASE
  WHEN "ageMethod" = 'GUARDIAN_ATTESTED_REVIEWED' THEN 'GUARDIAN_VERIFIED'
  ELSE 'SELF_DECLARED'
END,
"ageChangeLocked" = ("birthDate" IS NOT NULL)
WHERE "ageAssuranceLevel" = 'NONE';

CREATE INDEX IF NOT EXISTS "PrivacyAccount_ageAssuranceLevel_idx"
  ON "PrivacyAccount"("ageAssuranceLevel");

CREATE INDEX IF NOT EXISTS "GuardianRequest_consentBundleVersion_idx"
  ON "GuardianRequest"("consentBundleVersion");
