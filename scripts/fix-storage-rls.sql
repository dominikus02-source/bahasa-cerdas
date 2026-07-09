-- ============================================================
-- Fix: Allow authenticated users to upload to documents bucket
-- Run this via Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Allow authenticated users to INSERT into documents bucket
CREATE POLICY "Users can upload to documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- 2. Allow authenticated users to SELECT from documents bucket
CREATE POLICY "Users can read documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users to DELETE their own files in documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
