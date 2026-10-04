-- Prisma/API server is authoritative. Main Bersama realtime uses broadcast signals, not browser table access.
-- This migration is deliberately tolerant of schema drift in staging: every existing
-- public table is protected dynamically rather than assuming optional feature tables exist.

DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
  VALUES (
    'student-private',
    'student-private',
    false,
    52428800,
    ARRAY[
      'image/jpeg','image/png','image/webp','audio/webm','audio/mp4','application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword',
      'application/epub+zip','application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel','application/zip','application/x-zip-compressed'
    ]
  )
  ON CONFLICT (id) DO UPDATE
    SET public=false,
        file_size_limit=EXCLUDED.file_size_limit,
        allowed_mime_types=EXCLUDED.allowed_mime_types;
 END IF;
END $$;

-- Close browser Data API access to personal, learning and financial records.
-- Notifikasi remains on its existing owner-only policies for realtime notification UX.
DO $$ DECLARE t record; BEGIN
 FOR t IN
   SELECT tablename FROM pg_tables
   WHERE schemaname='public' AND tablename<>'Notifikasi'
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t.tablename);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE format('REVOKE ALL ON public.%I FROM anon',t.tablename);
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated',t.tablename);
  END IF;
 END LOOP;
END $$;

DO $$ BEGIN
 IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
  ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public._prisma_migrations FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON public._prisma_migrations FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON public._prisma_migrations FROM authenticated; END IF;
 END IF;
END $$;
