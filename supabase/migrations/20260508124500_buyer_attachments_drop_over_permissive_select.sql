-- Repair: Remove overly permissive SELECT on buyer-attachments.
-- The previous policy USING (bucket_id = 'buyer-attachments') OR'd with the owner-only
-- policy and allowed any authenticated user to read all objects in this bucket.

DROP POLICY IF EXISTS "Authenticated users can read buyer attachments" ON storage.objects;
