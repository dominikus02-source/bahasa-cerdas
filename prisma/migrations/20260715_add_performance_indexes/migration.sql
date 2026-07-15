-- Add performance indexes for UKBI/TKA queries, karya browsing, and penugasan filtering

CREATE INDEX IF NOT EXISTS "ProgresKompetensi_userId_status_idx" ON "ProgresKompetensi" ("userId", "status");
CREATE INDEX IF NOT EXISTS "TestSession_userId_status_idx" ON "TestSession" ("userId", "status");
CREATE INDEX IF NOT EXISTS "TestSession_paketId_status_idx" ON "TestSession" ("paketId", "status");
CREATE INDEX IF NOT EXISTS "StudentKarya_type_createdAt_idx" ON "StudentKarya" ("type", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentKaryaComment_karyaId_createdAt_idx" ON "StudentKaryaComment" ("karyaId", "createdAt");
CREATE INDEX IF NOT EXISTS "PenugasanSubmission_status_idx" ON "PenugasanSubmission" ("status");
