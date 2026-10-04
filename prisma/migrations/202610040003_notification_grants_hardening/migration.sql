-- Remove unnecessary browser grants from notification records.
-- Server-side Prisma remains authoritative; RLS continues to protect the table.
ALTER TABLE public."Notifikasi" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Notifikasi" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public."Notifikasi" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public."Notifikasi" FROM authenticated; END IF;
END $$;
