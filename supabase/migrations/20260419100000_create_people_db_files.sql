-- Migration: People DB file inventory (Row 145 Sprint 1)
-- Date: 2026-04-19
-- Description:
--   Tracks every file the batch ingestion pipeline has seen under
--   $PEOPLE_DB_SOURCE_ROOT. sha256 is the primary dedup key so the scanner
--   can rerun idempotently: rescanning adds new files, updates moved files,
--   and marks deleted files as `missing` without losing processing history.
--
--   Status flow (populated by later Sprints):
--     pending -> parsing -> (parsed | ocr_queued)
--            -> normalized -> resolved -> indexed
--     or at any point -> failed / skipped_unsupported / missing.
--
--   Only super_admin operates on this table. Workers use service_role.

CREATE TABLE IF NOT EXISTS public.people_db_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sha256          TEXT NOT NULL UNIQUE,
    source_path     TEXT NOT NULL,
    dataset_root    TEXT NOT NULL,
    dataset_subpath TEXT,
    ext             TEXT NOT NULL,
    mime            TEXT,
    size_bytes      BIGINT NOT NULL,
    mtime           TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'parsing', 'parsed', 'ocr_queued', 'normalized',
            'resolved', 'indexed', 'failed', 'skipped_unsupported',
            'skipped_duplicate', 'missing'
        )),
    parser          TEXT,
    row_count       INTEGER,
    error_msg       TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_db_files_status
    ON public.people_db_files (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_db_files_dataset_root
    ON public.people_db_files (dataset_root);
CREATE INDEX IF NOT EXISTS idx_people_db_files_source_path
    ON public.people_db_files (source_path);

-- Keep updated_at fresh on every row mutation so the monitor UI can sort by
-- "recently touched".
CREATE OR REPLACE FUNCTION public.tg_people_db_files_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_db_files_updated_at ON public.people_db_files;
CREATE TRIGGER people_db_files_updated_at
    BEFORE UPDATE ON public.people_db_files
    FOR EACH ROW EXECUTE FUNCTION public.tg_people_db_files_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.people_db_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_files_deny_all" ON public.people_db_files;
CREATE POLICY "people_db_files_deny_all" ON public.people_db_files
    AS RESTRICTIVE FOR ALL
    USING (FALSE);

DROP POLICY IF EXISTS "people_db_files_superadmin_select" ON public.people_db_files;
CREATE POLICY "people_db_files_superadmin_select" ON public.people_db_files
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_files_superadmin_insert" ON public.people_db_files;
CREATE POLICY "people_db_files_superadmin_insert" ON public.people_db_files
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_files_superadmin_update" ON public.people_db_files;
CREATE POLICY "people_db_files_superadmin_update" ON public.people_db_files
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

DROP POLICY IF EXISTS "people_db_files_superadmin_delete" ON public.people_db_files;
CREATE POLICY "people_db_files_superadmin_delete" ON public.people_db_files
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

COMMENT ON TABLE public.people_db_files IS
    'Row 145 Sprint 1: inventory of every file under $PEOPLE_DB_SOURCE_ROOT. '
    'sha256-keyed so rescans are idempotent. status column drives the ingest '
    'pipeline state machine (see Dev Spec Row 145).';
