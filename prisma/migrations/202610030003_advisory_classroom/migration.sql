ALTER TABLE "TestAnswer" ADD COLUMN "aiSuggestedScore" DOUBLE PRECISION;
-- Historical unapproved AI suggestions must not masquerade as a final score.
UPDATE "TestAnswer" SET "aiSuggestedScore"="score", "score"=0, "isCorrect"=NULL WHERE "reviewStatus"='MENUNGGU_PERSETUJUAN_GURU' AND "aiReviewedAt" IS NOT NULL;
CREATE TABLE "ClassroomPrivacyApproval" (
 "classId" TEXT PRIMARY KEY,
 "teacherId" TEXT NOT NULL,
 "evidenceRef" TEXT NOT NULL,
 "noticeVersion" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "reviewedBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "ClassroomPrivacyApproval" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ClassroomPrivacyApproval" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "ClassroomPrivacyApproval" FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "ClassroomPrivacyApproval" FROM authenticated; END IF;
END $$;
