-- ============================================================
-- BahasaCerdas: Supabase RLS Policies Reference
-- Apply these via Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable RLS on all tables (run once for each)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE: Users can read all published files
-- ============================================================
CREATE POLICY "Public can read storage objects"
ON storage.objects FOR SELECT
USING (bucket_id IN ('documents', 'uploads', 'avatars', 'images'));

-- ============================================================
-- STORAGE: Users can upload to their own folder
-- ============================================================
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('uploads', 'avatars', 'images')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STORAGE: Users can delete their own files
-- ============================================================
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('uploads', 'avatars', 'images')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STORAGE: Admin can manage everything in documents bucket
-- ============================================================
CREATE POLICY "Admin can manage documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents'
  AND auth.role() = 'service_role'
);

-- ============================================================
-- IMPORTANT: RLS is enforced at the Supabase level.
-- The application uses Prisma ORM which connects directly
-- to PostgreSQL (bypassing Supabase RLS).
-- All business-level access control is handled in application
-- code via lib/supabase/server.ts (requireAuth, requireRole).
-- ============================================================
