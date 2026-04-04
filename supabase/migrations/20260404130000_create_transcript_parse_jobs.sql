-- filepath: supabase/migrations/20260404130000_create_transcript_parse_jobs.sql
-- description: Background transcript parse jobs (queue + status for superadmin cloud parse)
-- created: 2026-04-04

CREATE TABLE IF NOT EXISTS public.transcript_parse_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    property_document_id UUID NOT NULL
        REFERENCES public.property_documents(id) ON DELETE CASCADE,

    requested_by_user_id UUID NOT NULL,

    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),

    phase_message TEXT,
    progress JSONB NOT NULL DEFAULT '[]'::jsonb,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcript_parse_jobs_document
    ON public.transcript_parse_jobs(property_document_id);

CREATE INDEX IF NOT EXISTS idx_transcript_parse_jobs_queued
    ON public.transcript_parse_jobs(created_at)
    WHERE status = 'queued';

COMMENT ON TABLE public.transcript_parse_jobs IS
    'Queued cloud transcript consensus parse jobs; progress persisted for polling after navigation';

ALTER TABLE public.transcript_parse_jobs ENABLE ROW LEVEL SECURITY;

-- No policies: JWT clients use Next API + service_role; RLS blocks direct anon/auth access.

CREATE OR REPLACE FUNCTION public.set_transcript_parse_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transcript_parse_jobs_updated_at ON public.transcript_parse_jobs;
CREATE TRIGGER tr_transcript_parse_jobs_updated_at
    BEFORE UPDATE ON public.transcript_parse_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_transcript_parse_jobs_updated_at();
