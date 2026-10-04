-- Restore only the authenticated owner SELECT needed by Supabase Realtime.
-- All notification writes remain server-side. On plain PostgreSQL test environments
-- without Supabase auth roles/functions this migration intentionally becomes a no-op.

DO $$ BEGIN
 IF to_regprocedure('auth.uid()') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
   EXECUTE $fn$
     CREATE OR REPLACE FUNCTION public.current_app_user_id()
     RETURNS text
     LANGUAGE sql
     STABLE
     SECURITY DEFINER
     SET search_path = public, pg_temp
     AS $body$
       SELECT u.id
       FROM public."User" u
       WHERE u."supabaseId" = auth.uid()::text
       LIMIT 1
     $body$
   $fn$;

   REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
   GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

   ALTER TABLE public."Notifikasi" ENABLE ROW LEVEL SECURITY;
   GRANT SELECT ON public."Notifikasi" TO authenticated;

   DROP POLICY IF EXISTS notification_owner_select ON public."Notifikasi";
   CREATE POLICY notification_owner_select
     ON public."Notifikasi"
     FOR SELECT
     TO authenticated
     USING ("userId" = public.current_app_user_id());
 END IF;
END $$;
