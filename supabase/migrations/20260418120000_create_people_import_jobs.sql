-- Migration: People DB async import queue (Row 144 Sprint 5)
-- Date: 2026-04-18
-- Description:
--   Large uploads (>5MB) are parsed+indexed asynchronously so the HTTP request
--   doesn't block for tens of seconds. Files are staged into Supabase Storage
--   under the `people-imports` bucket; this table tracks lifecycle + stats so
--   the admin UI can show progress and replay failures without re-uploading.
--
--   Status flow: pending -> processing -> (done | failed).
--   The worker (POST /api/people-db/import/jobs/[id]/process) uses SELECT ...
--   FOR UPDATE SKIP LOCKED to pick the next pending row safely if we later run
--   it on a cron; for Sprint 5 it's invoked explicitly from the UI.

CREATE TABLE IF NOT EXISTS public.people_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_ext TEXT NOT NULL CHECK (file_ext IN ('.csv', '.txt', '.xlsx', '.pdf')),
    storage_path TEXT NOT NULL, -- path inside people-imports bucket
    column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    dataset_root TEXT,
    dataset_subpath TEXT,
    dataset_path TEXT,
    data_source TEXT,
    batch_label TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    total_rows INT NOT NULL DEFAULT 0,
    indexed_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    failures JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- The ES batch_id we assigned when indexing started; exposed so callers
    -- can join to people_records and verify document counts.
    batch_id UUID
);

CREATE INDEX IF NOT EXISTS idx_people_import_jobs_status
    ON public.people_import_jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_people_import_jobs_created_by
    ON public.people_import_jobs (created_by, created_at DESC);

-- Row Level Security — super_admin only; job owner is implied by super_admin
-- privilege since the admin UI is the sole entry point.
ALTER TABLE public.people_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_import_jobs_deny_all" ON public.people_import_jobs;
CREATE POLICY "people_import_jobs_deny_all" ON public.people_import_jobs
    AS RESTRICTIVE FOR ALL
    USING (FALSE);

DROP POLICY IF EXISTS "people_import_jobs_superadmin_select" ON public.people_import_jobs;
CREATE POLICY "people_import_jobs_superadmin_select" ON public.people_import_jobs
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_import_jobs_superadmin_insert" ON public.people_import_jobs;
CREATE POLICY "people_import_jobs_superadmin_insert" ON public.people_import_jobs
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_import_jobs_superadmin_update" ON public.people_import_jobs;
CREATE POLICY "people_import_jobs_superadmin_update" ON public.people_import_jobs
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_import_jobs_superadmin_delete" ON public.people_import_jobs;
CREATE POLICY "people_import_jobs_superadmin_delete" ON public.people_import_jobs
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

COMMENT ON TABLE public.people_import_jobs IS
    'People DB Row 144 Sprint 5: async queue for large imports (>5MB). Files stage in the people-imports storage bucket; worker consumes pending rows.';

-- Storage bucket for staged uploads. Private (signed URL access only); the
-- worker uses the service role client to download.
INSERT INTO storage.buckets (id, name, public)
VALUES ('people-imports', 'people-imports', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only super_admin can read/write; service_role bypasses.
DROP POLICY IF EXISTS "people_imports_superadmin_read" ON storage.objects;
CREATE POLICY "people_imports_superadmin_read" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'people-imports'
        AND (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.iam_user_roles iur
                JOIN public.iam_roles ir ON iur.role_id = ir.id
                WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
            )
        )
    );

DROP POLICY IF EXISTS "people_imports_superadmin_write" ON storage.objects;
CREATE POLICY "people_imports_superadmin_write" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'people-imports'
        AND (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.iam_user_roles iur
                JOIN public.iam_roles ir ON iur.role_id = ir.id
                WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
            )
        )
    );

DROP POLICY IF EXISTS "people_imports_superadmin_update" ON storage.objects;
CREATE POLICY "people_imports_superadmin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'people-imports'
        AND (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.iam_user_roles iur
                JOIN public.iam_roles ir ON iur.role_id = ir.id
                WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
            )
        )
    )
    WITH CHECK (
        bucket_id = 'people-imports'
        AND (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.iam_user_roles iur
                JOIN public.iam_roles ir ON iur.role_id = ir.id
                WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
            )
        )
    );

DROP POLICY IF EXISTS "people_imports_superadmin_delete" ON storage.objects;
CREATE POLICY "people_imports_superadmin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'people-imports'
        AND (
            auth.role() = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.iam_user_roles iur
                JOIN public.iam_roles ir ON iur.role_id = ir.id
                WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
            )
        )
    );

-- Atomic claim RPC for the worker (Critical 1 fix).
-- Replaces the non-atomic `.update().eq('status','pending')` in processImportJob
-- which was racy under concurrent workers (two workers could both read 'pending'
-- and both succeed their update if PostgREST serializes them differently than
-- we'd naively expect). SKIP LOCKED gives us real atomicity.
CREATE OR REPLACE FUNCTION public.claim_people_import_job(p_job_id UUID)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    file_size_bytes BIGINT,
    file_ext TEXT,
    storage_path TEXT,
    column_mapping JSONB,
    dataset_root TEXT,
    dataset_subpath TEXT,
    dataset_path TEXT,
    data_source TEXT,
    batch_label TEXT,
    created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT j.id
        FROM public.people_import_jobs j
        WHERE j.id = p_job_id AND j.status = 'pending'
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.people_import_jobs j
    SET status = 'processing',
        started_at = NOW()
    FROM claimed c
    WHERE j.id = c.id
    RETURNING
        j.id,
        j.file_name,
        j.file_size_bytes,
        j.file_ext,
        j.storage_path,
        j.column_mapping,
        j.dataset_root,
        j.dataset_subpath,
        j.dataset_path,
        j.data_source,
        j.batch_label,
        j.created_by;
END;
$$;

-- Only service_role should invoke this; the worker runs under the admin client.
REVOKE ALL ON FUNCTION public.claim_people_import_job(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_people_import_job(UUID) TO service_role;
