-- filepath: supabase/migrations/20260427100000_create_transcript_intake_runs.sql
-- description: Track unified transcript intake runs across route, detect, parse, review, and confirmation
-- created: 2026-04-27

CREATE TABLE IF NOT EXISTS public.transcript_intake_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    property_id UUID NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('sale', 'rental')),
    requested_by_user_id UUID NOT NULL,

    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN (
            'uploaded',
            'route_selected',
            'detecting',
            'parsing',
            'reviewing',
            'needs_user_confirmation',
            'confirmed',
            'failed'
        )),

    current_phase TEXT,
    source_document_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],

    route_decision JSONB NOT NULL DEFAULT '{}'::jsonb,
    detection_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    parsed_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    confirmed_result JSONB,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transcript_intake_runs_property
    ON public.transcript_intake_runs(property_type, property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transcript_intake_runs_status
    ON public.transcript_intake_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transcript_intake_runs_documents
    ON public.transcript_intake_runs USING gin(source_document_ids);

COMMENT ON TABLE public.transcript_intake_runs IS
    'Unified transcript intake workflow state: technical routing, AI detect, parse, review, and user confirmation.';

COMMENT ON COLUMN public.transcript_intake_runs.route_decision IS
    'File probe result deciding local Python text parsing vs VLM visual parsing vs structured JSON normalization.';

COMMENT ON COLUMN public.transcript_intake_runs.detection_result IS
    'AI initial case classification: sale structure, document kinds, parking title rights, counts, and evidence.';

COMMENT ON COLUMN public.transcript_intake_runs.review_result IS
    'Independent AI review result with issues and user confirmation requirements.';

ALTER TABLE public.transcript_intake_runs ENABLE ROW LEVEL SECURITY;

-- No direct client policies: superadmin APIs use service_role and enforce auth.

CREATE OR REPLACE FUNCTION public.set_transcript_intake_runs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transcript_intake_runs_updated_at ON public.transcript_intake_runs;
CREATE TRIGGER tr_transcript_intake_runs_updated_at
    BEFORE UPDATE ON public.transcript_intake_runs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_transcript_intake_runs_updated_at();
