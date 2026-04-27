-- filepath: supabase/migrations/20260428010000_allow_local_transcript_provider.sql
-- description: Allow local text-layer transcript parser as a document parse provider
-- created: 2026-04-28

ALTER TABLE public.property_documents
DROP CONSTRAINT IF EXISTS property_documents_vlm_provider_check;

ALTER TABLE public.property_documents
ADD CONSTRAINT property_documents_vlm_provider_check
CHECK (
    vlm_provider IS NULL
    OR vlm_provider IN (
        'anthropic_claude',
        'openai_gpt4v',
        'google_gemini',
        'local_python_text'
    )
);

COMMENT ON COLUMN public.property_documents.vlm_provider IS
    'Provider used for transcript/document parsing, including cloud VLM providers and local_python_text.';
