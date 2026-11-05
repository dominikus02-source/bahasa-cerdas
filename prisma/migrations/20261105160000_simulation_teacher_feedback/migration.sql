CREATE TABLE "SimulationTeacherFeedback" (
    "id" TEXT NOT NULL,
    "progresId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SimulationTeacherFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SimulationTeacherFeedback_progresId_teacherId_questionId_key" ON "SimulationTeacherFeedback"("progresId", "teacherId", "questionId");
CREATE INDEX "SimulationTeacherFeedback_progresId_idx" ON "SimulationTeacherFeedback"("progresId");

-- Server-only notes: browser Data API roles must not bypass the teacher API guard.
ALTER TABLE "SimulationTeacherFeedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SimulationTeacherFeedback" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "SimulationTeacherFeedback" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "SimulationTeacherFeedback" FROM authenticated;
  END IF;
END $$;
