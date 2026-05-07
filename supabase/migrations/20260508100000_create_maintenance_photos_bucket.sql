-- Create Storage Bucket for Maintenance Request Photos
-- Created: 2026-05-08

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-photos',
  'maintenance-photos',
  true,
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Maintenance photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

CREATE POLICY "Users can update their own maintenance photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
