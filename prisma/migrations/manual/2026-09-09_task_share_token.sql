-- TaskShareToken: shareable task links for KelasKu (additive only)
-- Created: 2026-09-09

CREATE TABLE IF NOT EXISTS "TaskShareToken" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "token"        TEXT NOT NULL,
  "taskType"     TEXT NOT NULL,
  "quizId"       TEXT,
  "penugasanId"  TEXT,
  "groupId"      TEXT NOT NULL,
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskShareToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskShareToken_token_key" UNIQUE ("token"),
  CONSTRAINT "TaskShareToken_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE,
  CONSTRAINT "TaskShareToken_penugasanId_fkey" FOREIGN KEY ("penugasanId") REFERENCES "Penugasan"("id") ON DELETE CASCADE,
  CONSTRAINT "TaskShareToken_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  CONSTRAINT "TaskShareToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "TaskShareToken_token_idx" ON "TaskShareToken"("token");
CREATE INDEX IF NOT EXISTS "TaskShareToken_quizId_idx" ON "TaskShareToken"("quizId");
CREATE INDEX IF NOT EXISTS "TaskShareToken_penugasanId_idx" ON "TaskShareToken"("penugasanId");
CREATE INDEX IF NOT EXISTS "TaskShareToken_groupId_idx" ON "TaskShareToken"("groupId");
