-- Add parsed_result / consensus_metadata (and related) to property_documents if missing.
-- Use this if 20260302120000_create_ocr_parse_results was not applied or columns are missing.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.property_documents
    ADD COLUMN IF NOT EXISTS parsed_result       JSONB,
    ADD COLUMN IF NOT EXISTS consensus_metadata JSONB,
    ADD COLUMN IF NOT EXISTS parse_strategy      TEXT,
    ADD COLUMN IF NOT EXISTS parsed_at           TIMESTAMPTZ;

COMMENT ON COLUMN public.property_documents.parsed_result      IS 'Final merged structured JSON from OCR consensus';
COMMENT ON COLUMN public.property_documents.consensus_metadata IS '{ strategy, field_confidences, conflicts, total_confidence, models_used, judge_used }';
COMMENT ON COLUMN public.property_documents.parse_strategy     IS 'single = 1 model; consensus = multi-model majority vote';
COMMENT ON COLUMN public.property_documents.parsed_at         IS 'Timestamp of last successful parse';

-- Optional: add check constraint only if not present (avoid error if 20260302120000 already ran)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'property_documents_parse_strategy_check'
  ) THEN
    ALTER TABLE public.property_documents
      ADD CONSTRAINT property_documents_parse_strategy_check
      CHECK (parse_strategy IS NULL OR parse_strategy IN ('single', 'consensus'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_property_documents_parsed_at
  ON public.property_documents(parsed_at) WHERE parsed_at IS NOT NULL;
