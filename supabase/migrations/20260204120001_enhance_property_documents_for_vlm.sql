-- filepath: supabase/migrations/20260204120001_enhance_property_documents_for_vlm.sql
-- description: Enhance property_documents table for VLM parsing tracking
-- created: 2026-02-04
-- creator: Claude Sonnet 4.5

-- Add VLM-related columns to property_documents table
ALTER TABLE public.property_documents
ADD COLUMN IF NOT EXISTS vlm_provider TEXT CHECK (vlm_provider IN ('anthropic_claude', 'openai_gpt4v', 'google_gemini')),
ADD COLUMN IF NOT EXISTS used_user_key BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parsing_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS vlm_model_version TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_property_documents_vlm_provider ON public.property_documents(vlm_provider);
CREATE INDEX IF NOT EXISTS idx_property_documents_confidence_score ON public.property_documents(confidence_score);

-- Add comments
COMMENT ON COLUMN public.property_documents.vlm_provider IS 'VLM provider used for parsing (e.g., anthropic_claude)';
COMMENT ON COLUMN public.property_documents.used_user_key IS 'Whether user-provided API key was used (BYOK)';
COMMENT ON COLUMN public.property_documents.parsing_duration_ms IS 'VLM parsing duration in milliseconds';
COMMENT ON COLUMN public.property_documents.vlm_model_version IS 'Specific VLM model version (e.g., claude-3-5-sonnet-20241022)';
COMMENT ON COLUMN public.property_documents.confidence_score IS 'Overall parsing confidence score (0.00 - 1.00)';
