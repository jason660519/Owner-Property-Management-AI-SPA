-- filepath: supabase/migrations/20260406143000_create_backup_run_logs.sql
-- description: Audit log for manual and scheduled backup executions (superadmin API uses service_role)

CREATE TABLE IF NOT EXISTS public.backup_run_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trigger TEXT NOT NULL,

    destinations JSONB NOT NULL DEFAULT '[]'::jsonb,

    backup_id TEXT,
    filename TEXT,

    success BOOLEAN NOT NULL,

    error_message TEXT,

    stats JSONB,

    cloud_result JSONB,

    duration_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_run_logs_created_at
    ON public.backup_run_logs(created_at DESC);

COMMENT ON TABLE public.backup_run_logs IS
    'Backup execution audit (manual, auto_schedule, etc.); RLS on, no policies — API uses service_role only';

ALTER TABLE public.backup_run_logs ENABLE ROW LEVEL SECURITY;
