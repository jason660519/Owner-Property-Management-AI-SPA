-- Migration: Storage Management Features
-- Date: 2026-02-12
-- Description: Adds storage quota to users and provides RPC functions for storage analysis

-- 1. Add storage columns to users_profile
ALTER TABLE public.users_profile 
ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT DEFAULT 1073741824, -- 1GB default
ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- 2. RPC: Get Overall Storage Summary
CREATE OR REPLACE FUNCTION public.get_storage_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_size BIGINT;
    total_files BIGINT;
    bucket_stats JSONB;
BEGIN
    -- Get total size and count from storage.objects
    SELECT 
        COALESCE(SUM((metadata->>'size')::bigint), 0),
        COUNT(*)
    INTO total_size, total_files
    FROM storage.objects;

    -- Get stats per bucket
    SELECT jsonb_agg(jsonb_build_object(
        'name', id,
        'count', (SELECT count(*) FROM storage.objects WHERE bucket_id = buckets.id),
        'size', (SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) FROM storage.objects WHERE bucket_id = buckets.id)
    ))
    INTO bucket_stats
    FROM storage.buckets;

    RETURN jsonb_build_object(
        'total_size_bytes', total_size,
        'total_files', total_files,
        'buckets', COALESCE(bucket_stats, '[]'::jsonb)
    );
END;
$$;

-- 3. RPC: Get File Type Distribution
CREATE OR REPLACE FUNCTION public.get_storage_file_types()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    type_stats JSONB;
BEGIN
    WITH stats AS (
        SELECT 
            CASE 
                WHEN metadata->>'mimetype' LIKE 'image/%' THEN 'image'
                WHEN metadata->>'mimetype' LIKE 'video/%' THEN 'video'
                WHEN metadata->>'mimetype' LIKE 'application/pdf' THEN 'document'
                WHEN metadata->>'mimetype' LIKE 'text/%' THEN 'document'
                ELSE 'other'
            END as file_type,
            COUNT(*) as count,
            SUM((metadata->>'size')::bigint) as size
        FROM storage.objects
        GROUP BY 1
    )
    SELECT jsonb_agg(jsonb_build_object(
        'type', file_type,
        'count', count,
        'size', size
    ))
    INTO type_stats
    FROM stats;

    RETURN COALESCE(type_stats, '[]'::jsonb);
END;
$$;

-- 4. RPC: Identify Orphaned Files
CREATE OR REPLACE FUNCTION public.identify_orphaned_files(limit_count INT DEFAULT 100)
RETURNS TABLE (
    name TEXT,
    bucket_id TEXT,
    size BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        so.name,
        so.bucket_id,
        (so.metadata->>'size')::bigint,
        so.created_at
    FROM storage.objects so
    -- Check Property_Photos
    LEFT JOIN public.property_photos pp ON (so.bucket_id = 'property-photos' AND so.name = pp.storage_path)
    -- Check property_documents
    LEFT JOIN public.property_documents pd ON (so.bucket_id = 'property-documents' AND so.name = pd.file_path)
    WHERE 
        (so.bucket_id = 'property-photos' AND pp.id IS NULL)
        OR 
        (so.bucket_id = 'property-documents' AND pd.id IS NULL)
    LIMIT limit_count;
END;
$$;
