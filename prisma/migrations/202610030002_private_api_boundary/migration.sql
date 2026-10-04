-- Prisma/API server is authoritative. Main Bersama realtime uses broadcast signals, not table rows.
ALTER TABLE "AgentApproval" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AgentApproval" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "AgentApproval" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "AgentApproval" FROM authenticated; END IF;
END $$;
ALTER TABLE "AgentTask" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AgentTask" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "AgentTask" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "AgentTask" FROM authenticated; END IF;
END $$;
ALTER TABLE "AgentWorker" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AgentWorker" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "AgentWorker" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "AgentWorker" FROM authenticated; END IF;
END $$;
ALTER TABLE "DailyAction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "DailyAction" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "DailyAction" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "DailyAction" FROM authenticated; END IF;
END $$;
ALTER TABLE "DailyBusinessSnapshot" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "DailyBusinessSnapshot" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "DailyBusinessSnapshot" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "DailyBusinessSnapshot" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainAnswer" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainAnswer" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainAnswer" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainAnswer" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainAnswerSubmission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainAnswerSubmission" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainAnswerSubmission" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainAnswerSubmission" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainGameRoundResult" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainGameRoundResult" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainGameRoundResult" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainGameRoundResult" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainGameState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainGameState" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainGameState" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainGameState" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainPlayer" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainPlayer" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainPlayer" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainPlayer" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainQuestionSnapshot" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainQuestionSnapshot" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainQuestionSnapshot" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainQuestionSnapshot" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainRound" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainRound" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainRound" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainRound" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainRoundEligiblePlayer" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainRoundEligiblePlayer" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainRoundEligiblePlayer" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainRoundEligiblePlayer" FROM authenticated; END IF;
END $$;
ALTER TABLE "MainSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MainSession" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "MainSession" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "MainSession" FROM authenticated; END IF;
END $$;
ALTER TABLE "TaskAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "TaskAttempt" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "TaskAttempt" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "TaskAttempt" FROM authenticated; END IF;
END $$;
ALTER TABLE "TaskEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "TaskEvent" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "TaskEvent" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "TaskEvent" FROM authenticated; END IF;
END $$;
ALTER TABLE "ToolEvidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ToolEvidence" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ToolEvidence" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "ToolEvidence" FROM authenticated; END IF;
END $$;
ALTER TABLE "ToolExecution" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ToolExecution" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ToolExecution" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "ToolExecution" FROM authenticated; END IF;
END $$;
DO $$ BEGIN
 IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
  ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public._prisma_migrations FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON public._prisma_migrations FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON public._prisma_migrations FROM authenticated; END IF;
 END IF;
END $$;

DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('student-private','student-private',false,52428800,ARRAY['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/epub+zip','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/zip','application/x-zip-compressed']) ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
 END IF;
END $$;

-- Close browser Data API access to personal, learning and financial records.
-- Notifikasi remains on existing owner-only policies for realtime notification UX.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'Notifikasi' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t.tablename);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON public.%I FROM anon',t.tablename); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON public.%I FROM authenticated',t.tablename); END IF;
 END LOOP;
END $$;
