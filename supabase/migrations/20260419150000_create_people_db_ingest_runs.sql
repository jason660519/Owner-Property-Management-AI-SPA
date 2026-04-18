-- Migration: People DB — ingest run audit log (Row 145 Sprint 6)
-- Date: 2026-04-19
-- Description:
--   Records each invocation of the Sprint 6 orchestrator CLI
--   (tools/people-db/ingest.ts) so the monitoring dashboard can
--   render a "recent runs" timeline and operators can spot stuck
--   or interrupted pipeline stages.
--
--   stage='all' means the orchestrator ran the full
--   scan → parse → normalize → resolve chain. Individual stage
--   values let partial runs (e.g. --stage=parse) still be audited.
--
--   status lifecycle:
--     running      — INSERTed when the stage starts
--     succeeded    — UPDATEd on clean exit
--     failed       — UPDATEd when the stage exits non-zero
--     interrupted  — UPDATEd by SIGINT handler before exit

CREATE TABLE IF NOT EXISTS public.people_db_ingest_runs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage        TEXT NOT NULL
        CHECK (stage IN ('scan', 'parse', 'normalize', 'resolve', 'reindex', 'all')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at  TIMESTAMPTZ,
    status       TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'succeeded', 'failed', 'interrupted')),
    processed    INTEGER NOT NULL DEFAULT 0,
    failed       INTEGER NOT NULL DEFAULT 0,
    notes        TEXT
);

-- Dashboard "recent runs" list orders by started_at DESC; a partial
-- index on started_at keeps that query cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_people_db_ingest_runs_started_at
    ON public.people_db_ingest_runs (started_at DESC);

-- Operators will frequently filter by "still running" to find stuck
-- stages. A small partial index covers that without bloating the
-- main time-ordered index.
CREATE INDEX IF NOT EXISTS idx_people_db_ingest_runs_running
    ON public.people_db_ingest_runs (started_at DESC)
    WHERE status = 'running';

-- ---------------------------------------------------------------------------
-- Row Level Security — super_admin read/write, service_role for the CLI
-- ---------------------------------------------------------------------------

ALTER TABLE public.people_db_ingest_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_ingest_runs_deny_all" ON public.people_db_ingest_runs;
CREATE POLICY "people_db_ingest_runs_deny_all" ON public.people_db_ingest_runs
    AS RESTRICTIVE FOR ALL USING (FALSE);

DROP POLICY IF EXISTS "people_db_ingest_runs_superadmin_select" ON public.people_db_ingest_runs;
CREATE POLICY "people_db_ingest_runs_superadmin_select" ON public.people_db_ingest_runs
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_ingest_runs_superadmin_insert" ON public.people_db_ingest_runs;
CREATE POLICY "people_db_ingest_runs_superadmin_insert" ON public.people_db_ingest_runs
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_ingest_runs_superadmin_update" ON public.people_db_ingest_runs;
CREATE POLICY "people_db_ingest_runs_superadmin_update" ON public.people_db_ingest_runs
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    ) WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_ingest_runs_superadmin_delete" ON public.people_db_ingest_runs;
CREATE POLICY "people_db_ingest_runs_superadmin_delete" ON public.people_db_ingest_runs
    FOR DELETE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

COMMENT ON TABLE public.people_db_ingest_runs IS
    'Row 145 Sprint 6: orchestrator audit log. Each row = one CLI invocation of a pipeline stage. Dashboard reads; orchestrator writes.';
