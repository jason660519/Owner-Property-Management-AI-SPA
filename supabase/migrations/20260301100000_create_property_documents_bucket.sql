-- Create Storage Bucket for Property Documents (謄本、權狀等)
-- Created: 2026-03-01
-- Description: Bucket for property_documents file_path (PDF/images).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  true,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow read for authenticated (owner/agent via RLS on property_documents)
CREATE POLICY "Authenticated can read property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-documents');

-- Allow insert for authenticated (service_role bypasses RLS for superadmin)
CREATE POLICY "Authenticated can upload property documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-documents');

CREATE POLICY "Authenticated can update own property documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-documents');

CREATE POLICY "Authenticated can delete property documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-documents');
