-- filepath: supabase/migrations/20260305120000_extend_together_provider_to_cache.sql
-- description: Extend provider CHECK constraints so 'together' is allowed in validation cache and model evaluations
-- created: 2026-03-05

-- ============================================================================
-- ai_key_validation_cache
-- ============================================================================

ALTER TABLE public.ai_key_validation_cache
  DROP CONSTRAINT IF EXISTS ai_key_validation_cache_provider_check;

ALTER TABLE public.ai_key_validation_cache
  ADD CONSTRAINT ai_key_validation_cache_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together'));

-- ============================================================================
-- ai_model_evaluations
-- (keep provider set in sync so Together AI 可正常出現在模型評估中)
-- ============================================================================

ALTER TABLE public.ai_model_evaluations
  DROP CONSTRAINT IF EXISTS ai_model_evaluations_provider_check;

ALTER TABLE public.ai_model_evaluations
  ADD CONSTRAINT ai_model_evaluations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together'));

