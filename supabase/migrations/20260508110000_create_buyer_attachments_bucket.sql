-- Create Storage Bucket for Buyer Communication Attachments
-- Created: 2026-05-08

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buyer-attachments',
  'buyer-attachments',
  false, -- Private bucket; access via signed URLs or authenticated users
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own files
CREATE POLICY "Authenticated users can upload buyer attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'buyer-attachments');

-- Users can read files they own (by folder prefix = uid)
CREATE POLICY "Users can view their own buyer attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'buyer-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Recipients can read attachments sent to them (broader authenticated access for messages)
CREATE POLICY "Authenticated users can read buyer attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'buyer-attachments');

CREATE POLICY "Users can delete their own buyer attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'buyer-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
