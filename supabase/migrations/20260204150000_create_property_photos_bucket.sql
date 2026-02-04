-- Create Storage Bucket for Property Photos
-- Created: 2026-02-04
-- Creator: Claude Sonnet 4.5

-- 1. Create bucket for property photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true, -- Public bucket (可以透過 URL 直接存取)
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Anyone can read (public photos)
CREATE POLICY "Public photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

-- 4. RLS Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- 5. RLS Policy: Owner can update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. RLS Policy: Owner can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
