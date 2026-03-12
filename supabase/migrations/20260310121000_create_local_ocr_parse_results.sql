-- filepath: supabase/migrations/20260310121000_create_local_ocr_parse_results.sql
-- description: Store results from local Python regex-based transcript parser separately from cloud OCR consensus.
-- created: 2026-03-10
-- creator: GPT-5.1 (Cursor AI)

-- =============================================================================
-- PART 1: New table — local_ocr_parse_results
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.local_ocr_parse_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- relation
    property_document_id UUID NOT NULL
        REFERENCES public.property_documents(id) ON DELETE CASCADE,

    -- result metadata
    transcript_type TEXT,              -- e.g. 'building', 'land', or parser-specific value

    -- main parsed payload from local Python CLI
    parsed JSONB,                      -- typically { meta, building_description, ownership_records, other_right_records }

    -- optional raw data for debugging
    raw_stdout TEXT,
    raw_stderr TEXT,

    -- timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_local_ocr_parse_results_doc
    ON public.local_ocr_parse_results(property_document_id);

-- Comments
COMMENT ON TABLE  public.local_ocr_parse_results IS
    'Stores parsed transcript JSON produced by the local Python regex-based parser (separate from cloud OCR consensus).';
COMMENT ON COLUMN public.local_ocr_parse_results.parsed IS
    'Structured JSON returned by backend/ocr_service parse_local_cli.py (shape is Python-specific, not the cloud consensus schema).';

