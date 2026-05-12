-- Migration: 0002_storage_constraints_and_rls.sql
-- FR-93, FR-94, ADR-31, ADR-36
-- Applies bucket-level file size + MIME constraints, and explicit DENY policies
-- for anon + authenticated roles on INSERT/UPDATE/DELETE to the project-images bucket.
-- Service role bypasses RLS by Supabase default — admin uploads still work.
-- Public reads (SELECT) on this public bucket are unaffected (no SELECT policy added).

-- Bucket constraints (FR-93, ADR-31, ADR-32).
-- NOTE: Applied via execute_sql (not apply_migration) because storage.buckets is a
-- system-managed table. See task 1.3 + DR2-11.
UPDATE storage.buckets
SET
  file_size_limit    = 5242880,  -- 5 MiB; must match MAX_FILE_SIZE_BYTES in src/lib/storage/upload.ts
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'project-images';

-- Explicit DENY policies on storage.objects (FR-94, ADR-36).
-- Using RESTRICTIVE so they cannot be lifted by a permissive policy added later.

-- anon: deny INSERT
CREATE POLICY "project-images:deny-anon-insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'project-images');

-- anon: deny UPDATE
CREATE POLICY "project-images:deny-anon-update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO anon
  USING (bucket_id = 'project-images');

-- anon: deny DELETE
CREATE POLICY "project-images:deny-anon-delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO anon
  USING (bucket_id = 'project-images');

-- authenticated: deny INSERT
CREATE POLICY "project-images:deny-authenticated-insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images');

-- authenticated: deny UPDATE
CREATE POLICY "project-images:deny-authenticated-update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images');

-- authenticated: deny DELETE
CREATE POLICY "project-images:deny-authenticated-delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images');
