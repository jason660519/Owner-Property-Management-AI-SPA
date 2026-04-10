-- filepath: supabase/migrations/20260410130000_add_perplexity_provider.sql
-- description: Add 'perplexity' to provider CHECK constraints so Perplexity API
--              keys can be saved and used as a research-report evaluator.
-- created: 2026-04-10

-- ============================================================================
-- Extend provider CHECK constraints to include 'perplexity'
-- ============================================================================

-- ai_api_keys
ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;
ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity'));

-- ai_model_selections
ALTER TABLE public.ai_model_selections
  DROP CONSTRAINT IF EXISTS ai_model_selections_provider_check;
ALTER TABLE public.ai_model_selections
  ADD CONSTRAINT ai_model_selections_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity'));

-- ai_chat_logs
ALTER TABLE public.ai_chat_logs
  DROP CONSTRAINT IF EXISTS ai_chat_logs_provider_check;
ALTER TABLE public.ai_chat_logs
  ADD CONSTRAINT ai_chat_logs_provider_check
  CHECK (provider IS NULL OR provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity'));

-- ai_model_evaluations
ALTER TABLE public.ai_model_evaluations
  DROP CONSTRAINT IF EXISTS ai_model_evaluations_provider_check;
ALTER TABLE public.ai_model_evaluations
  ADD CONSTRAINT ai_model_evaluations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity'));

-- ai_key_validation_cache
ALTER TABLE public.ai_key_validation_cache
  DROP CONSTRAINT IF EXISTS ai_key_validation_cache_provider_check;
ALTER TABLE public.ai_key_validation_cache
  ADD CONSTRAINT ai_key_validation_cache_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity'));
