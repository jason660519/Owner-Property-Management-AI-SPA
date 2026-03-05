-- filepath: supabase/migrations/20260302120000_create_ocr_parse_results.sql
-- description: Create ocr_parse_results table for multi-model consensus parsing;
--              add consensus columns to property_documents.
-- created: 2026-03-02
-- creator: Claude Opus 4.6

-- =============================================================================
-- PART 1: New table — ocr_parse_results
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ocr_parse_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- relation
    property_document_id UUID NOT NULL
        REFERENCES public.property_documents(id) ON DELETE CASCADE,

    -- model info
    provider TEXT NOT NULL
        CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok')),
    model_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'parser'
        CHECK (role IN ('parser', 'judge')),

    -- result
    raw_output JSONB,                          -- LandRegistryParsedResult JSON
    parse_duration_ms INTEGER,                 -- milliseconds
    token_usage JSONB DEFAULT '{}',            -- { prompt_tokens, completion_tokens, total_tokens }
    error_message TEXT,                        -- non-null when the call failed

    -- timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ocr_parse_results_doc
    ON public.ocr_parse_results(property_document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_parse_results_doc_role
    ON public.ocr_parse_results(property_document_id, role);

-- Comments
COMMENT ON TABLE  public.ocr_parse_results IS
    'Stores per-model raw outputs for multi-model OCR consensus parsing';
COMMENT ON COLUMN public.ocr_parse_results.role IS
    'parser = initial parse model, judge = conflict arbiter model';

-- =============================================================================
-- PART 2: Add consensus columns to property_documents
-- =============================================================================

ALTER TABLE public.property_documents
    ADD COLUMN IF NOT EXISTS parsed_result       JSONB,
    ADD COLUMN IF NOT EXISTS consensus_metadata  JSONB,
    ADD COLUMN IF NOT EXISTS parse_strategy      TEXT CHECK (parse_strategy IN ('single', 'consensus')),
    ADD COLUMN IF NOT EXISTS parsed_at           TIMESTAMPTZ;

COMMENT ON COLUMN public.property_documents.parsed_result      IS 'Final merged structured JSON from OCR consensus';
COMMENT ON COLUMN public.property_documents.consensus_metadata IS '{ strategy, field_confidences, conflicts, total_confidence, models_used, judge_used }';
COMMENT ON COLUMN public.property_documents.parse_strategy     IS 'single = 1 model; consensus = multi-model majority vote';
COMMENT ON COLUMN public.property_documents.parsed_at          IS 'Timestamp of last successful parse';

-- Index for parsed_at queries
CREATE INDEX IF NOT EXISTS idx_property_documents_parsed_at
    ON public.property_documents(parsed_at) WHERE parsed_at IS NOT NULL;

-- =============================================================================
-- PART 3: RLS for ocr_parse_results
-- =============================================================================

ALTER TABLE public.ocr_parse_results ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read results for documents they own
CREATE POLICY "owners_read_ocr_results" ON public.ocr_parse_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.property_documents pd
            WHERE pd.id = ocr_parse_results.property_document_id
              AND pd.owner_id = auth.uid()
        )
    );

-- service_role bypasses RLS automatically; no extra policy needed.
