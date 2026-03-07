-- Make property-documents bucket private; only backend (signed URLs) may serve files.
-- 謄本為個人隱私：僅建立者或經授權者透過 API 取得短期 signed URL 後可讀取，外人持 URL 無法直接存取。

-- 1. Set bucket to private (no public URL access)
UPDATE storage.buckets
SET public = false
WHERE id = 'property-documents';

-- 2. Remove policy that allowed any authenticated user to read objects.
--    Only service_role (backend) will create signed URLs after permission check.
DROP POLICY IF EXISTS "Authenticated can read property documents" ON storage.objects;
