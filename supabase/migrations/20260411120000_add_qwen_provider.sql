-- filepath: supabase/migrations/20260411120000_add_qwen_provider.sql
-- description: Add 'qwen' (Alibaba DashScope / 通義千問) to provider CHECK
--              constraints so Qwen API keys, model selections, evaluations
--              and validation cache rows can be persisted.
-- created: 2026-04-11

-- ============================================================================
-- Extend provider CHECK constraints to include 'qwen'
-- ============================================================================

-- ai_api_keys
ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;
ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity', 'qwen'));

-- ai_model_selections
ALTER TABLE public.ai_model_selections
  DROP CONSTRAINT IF EXISTS ai_model_selections_provider_check;
ALTER TABLE public.ai_model_selections
  ADD CONSTRAINT ai_model_selections_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity', 'qwen'));

-- ai_chat_logs
ALTER TABLE public.ai_chat_logs
  DROP CONSTRAINT IF EXISTS ai_chat_logs_provider_check;
ALTER TABLE public.ai_chat_logs
  ADD CONSTRAINT ai_chat_logs_provider_check
  CHECK (provider IS NULL OR provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity', 'qwen'));

-- ai_model_evaluations
ALTER TABLE public.ai_model_evaluations
  DROP CONSTRAINT IF EXISTS ai_model_evaluations_provider_check;
ALTER TABLE public.ai_model_evaluations
  ADD CONSTRAINT ai_model_evaluations_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity', 'qwen'));

-- ai_key_validation_cache
ALTER TABLE public.ai_key_validation_cache
  DROP CONSTRAINT IF EXISTS ai_key_validation_cache_provider_check;
ALTER TABLE public.ai_key_validation_cache
  ADD CONSTRAINT ai_key_validation_cache_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together', 'kimi', 'openrouter', 'zhipu', 'perplexity', 'qwen'));
