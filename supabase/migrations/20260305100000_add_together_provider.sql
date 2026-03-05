-- filepath: supabase/migrations/20260305100000_add_together_provider.sql
-- description: Add 'together' (Together AI) as a supported AI provider in DB constraints
-- created: 2026-03-05

-- ============================================================================
-- Extend provider CHECK constraints to include 'together'
-- ============================================================================

-- ai_api_keys
ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;
ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together'));

-- ai_model_selections
ALTER TABLE public.ai_model_selections
  DROP CONSTRAINT IF EXISTS ai_model_selections_provider_check;
ALTER TABLE public.ai_model_selections
  ADD CONSTRAINT ai_model_selections_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok', 'together'));
