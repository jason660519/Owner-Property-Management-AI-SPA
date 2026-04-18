-- Migration: Create dataset_metadata for People DB dataset tree (Row 144)
-- Date: 2026-04-17
-- Description:
--   Stores user-facing overrides for Elasticsearch dataset buckets used by the
--   People DB search tree panel: display name, favorite flag, enabled flag,
--   emoji and notes. dataset_path is the canonical key (matches ES field of
--   the same name; falls back to legacy flat data_source when the latter has
--   not been migrated yet).

CREATE TABLE IF NOT EXISTS public.dataset_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_path TEXT NOT NULL UNIQUE,
    display_name TEXT,
    favorited BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    emoji TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dataset_metadata_favorited
    ON public.dataset_metadata (favorited)
    WHERE favorited = TRUE;

CREATE INDEX IF NOT EXISTS idx_dataset_metadata_enabled
    ON public.dataset_metadata (enabled)
    WHERE enabled = FALSE;

-- Reuse the existing trigger pattern from people_records to keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.dataset_metadata_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dataset_metadata_updated_at ON public.dataset_metadata;
CREATE TRIGGER trg_dataset_metadata_updated_at
    BEFORE UPDATE ON public.dataset_metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.dataset_metadata_set_updated_at();

-- Row Level Security — super_admin only, with service_role bypass for backend jobs.
ALTER TABLE public.dataset_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dataset_metadata_deny_all" ON public.dataset_metadata;
CREATE POLICY "dataset_metadata_deny_all" ON public.dataset_metadata
    AS RESTRICTIVE FOR ALL
    USING (FALSE);

DROP POLICY IF EXISTS "dataset_metadata_superadmin_select" ON public.dataset_metadata;
CREATE POLICY "dataset_metadata_superadmin_select" ON public.dataset_metadata
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "dataset_metadata_superadmin_insert" ON public.dataset_metadata;
CREATE POLICY "dataset_metadata_superadmin_insert" ON public.dataset_metadata
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "dataset_metadata_superadmin_update" ON public.dataset_metadata;
CREATE POLICY "dataset_metadata_superadmin_update" ON public.dataset_metadata
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

DROP POLICY IF EXISTS "dataset_metadata_superadmin_delete" ON public.dataset_metadata;
CREATE POLICY "dataset_metadata_superadmin_delete" ON public.dataset_metadata
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

COMMENT ON TABLE public.dataset_metadata IS
    'People DB Row 144: user overrides for dataset display (rename/favorite/enable).';
