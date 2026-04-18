-- Migration: People DB — staging records table (Row 145 Sprint 4a Phase 1)
-- Date: 2026-04-19
-- Description:
--   Persistence layer between parsing and Entity Resolution. Sprint 2
--   worker and Sprint 3 OCR callback write `raw` JSONB (parser output as-is);
--   Sprint 4a normalize worker fills `normalized` JSONB after applying the
--   Taiwan-specific cleanup rules (name collapse, id-number validation,
--   phone E.164-ish, address split, ROC→CE year).
--
--   Single-table design (raw + normalized in the same row) rather than
--   two tables because:
--     - 1:1 relationship makes a join unnecessary
--     - normalize is idempotent; rerunning updates in place
--     - GIN index on normalized JSONB covers ER lookups (name + phone,
--       name + address) without a separate table
--
--   State machine:
--     raw INSERTed by worker/webhook → status_on_row = 'parsed'
--     normalize worker writes normalized JSONB → row transitions implicitly
--         (status column on people_db_files flips 'parsed' → 'normalized'
--          once all staging rows for the file have non-NULL normalized)
--     Sprint 4a Phase 2 ER worker reads normalized, produces person / candidate
--
--   `record_index` is the row's ordinal within the file (0-based). For OCR
--   callbacks, it's page_number - 1.

CREATE TABLE IF NOT EXISTS public.people_db_staging_records (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id        UUID NOT NULL REFERENCES public.people_db_files(id) ON DELETE CASCADE,
    record_index   INTEGER NOT NULL,
    raw            JSONB NOT NULL,
    normalized     JSONB,
    normalized_at  TIMESTAMPTZ,
    resolved_at    TIMESTAMPTZ,
    person_id      UUID,   -- back-ref filled by Sprint 4a Phase 2 ER worker
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Same (file_id, record_index) MUST be unique so re-parsing upserts
    -- cleanly instead of duplicating.
    CONSTRAINT people_db_staging_records_file_index_uniq UNIQUE (file_id, record_index)
);

-- Look up staging rows awaiting normalize by file.
CREATE INDEX IF NOT EXISTS idx_people_db_staging_records_file_id
    ON public.people_db_staging_records (file_id);

-- Partial index: only rows awaiting normalize need to be scanned by the
-- worker loop. Keeps the index small on a table that grows to millions.
CREATE INDEX IF NOT EXISTS idx_people_db_staging_records_pending_normalize
    ON public.people_db_staging_records (file_id)
    WHERE normalized IS NULL;

-- Partial index: ER worker looks for normalized-but-not-resolved rows.
CREATE INDEX IF NOT EXISTS idx_people_db_staging_records_pending_resolve
    ON public.people_db_staging_records (file_id)
    WHERE normalized IS NOT NULL AND resolved_at IS NULL;

-- GIN index on the normalized JSONB powers ER lookups by (name, phone) and
-- (name, address). A single GIN handles arbitrary JSONB @> containment
-- queries so we don't need per-field expression indexes.
CREATE INDEX IF NOT EXISTS idx_people_db_staging_records_normalized_gin
    ON public.people_db_staging_records
    USING GIN (normalized jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.people_db_staging_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_staging_records_deny_all" ON public.people_db_staging_records;
CREATE POLICY "people_db_staging_records_deny_all" ON public.people_db_staging_records
    AS RESTRICTIVE FOR ALL
    USING (FALSE);

DROP POLICY IF EXISTS "people_db_staging_records_superadmin_select" ON public.people_db_staging_records;
CREATE POLICY "people_db_staging_records_superadmin_select" ON public.people_db_staging_records
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_staging_records_superadmin_insert" ON public.people_db_staging_records;
CREATE POLICY "people_db_staging_records_superadmin_insert" ON public.people_db_staging_records
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_staging_records_superadmin_update" ON public.people_db_staging_records;
CREATE POLICY "people_db_staging_records_superadmin_update" ON public.people_db_staging_records
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

DROP POLICY IF EXISTS "people_db_staging_records_superadmin_delete" ON public.people_db_staging_records;
CREATE POLICY "people_db_staging_records_superadmin_delete" ON public.people_db_staging_records
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

COMMENT ON TABLE public.people_db_staging_records IS
    'Row 145 Sprint 4a: persists parsed records (raw JSONB) + normalized form '
    '(JSONB filled by normalize worker). ER worker reads normalized, writes '
    'person_id back. GIN on normalized covers (name+phone) / (name+addr) lookups.';
COMMENT ON COLUMN public.people_db_staging_records.raw IS
    'Parser output as-is (Record<string, string> from ParseResult.rows or OCR page text).';
COMMENT ON COLUMN public.people_db_staging_records.normalized IS
    'Normalized fields: { name, id_no, phones:[], address:{...}, birth_year }. NULL until normalize worker runs.';
COMMENT ON COLUMN public.people_db_staging_records.person_id IS
    'Back-reference to people_db_persons.person_id. Filled by Sprint 4a Phase 2 ER worker; NULL means unresolved.';
