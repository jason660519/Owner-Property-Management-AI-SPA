-- filepath: supabase/migrations/20260219000000_ai_settings_validation_summary.sql
-- description: Store last "validate all" result for 組態概況 (synced with Supabase)
-- created: 2026-02-19

-- ============================================================================
-- ai_settings_validation_summary: One row per user, last validate-all result
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_settings_validation_summary (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    validated_count INTEGER NOT NULL DEFAULT 0,
    total_models INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_validation_summary_updated_at
    ON public.ai_settings_validation_summary(updated_at);

ALTER TABLE public.ai_settings_validation_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage validation summary" ON public.ai_settings_validation_summary;
CREATE POLICY "Superadmin can manage validation summary"
    ON public.ai_settings_validation_summary FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ai_settings_validation_summary IS 'Last validate-all result: validated key count and total available models (for 組態概況)';
