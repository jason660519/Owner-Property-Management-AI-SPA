-- Add Ollama provider to AI settings provider constraints.
-- Keep this list in sync with apps/superadmin/lib/ai-providers.ts.

ALTER TABLE IF EXISTS public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;
ALTER TABLE IF EXISTS public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (
    provider IN (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'grok',
      'together',
      'kimi',
      'openrouter',
      'zhipu',
      'perplexity',
      'qwen',
      'ollama',
      'kilo',
      'opencode'
    )
  );

ALTER TABLE IF EXISTS public.ai_model_selections
  DROP CONSTRAINT IF EXISTS ai_model_selections_provider_check;
ALTER TABLE IF EXISTS public.ai_model_selections
  ADD CONSTRAINT ai_model_selections_provider_check
  CHECK (
    provider IN (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'grok',
      'together',
      'kimi',
      'openrouter',
      'zhipu',
      'perplexity',
      'qwen',
      'ollama',
      'kilo',
      'opencode'
    )
  );

ALTER TABLE IF EXISTS public.ai_chat_logs
  DROP CONSTRAINT IF EXISTS ai_chat_logs_provider_check;
ALTER TABLE IF EXISTS public.ai_chat_logs
  ADD CONSTRAINT ai_chat_logs_provider_check
  CHECK (
    provider IS NULL OR provider IN (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'grok',
      'together',
      'kimi',
      'openrouter',
      'zhipu',
      'perplexity',
      'qwen',
      'ollama',
      'kilo',
      'opencode'
    )
  );

ALTER TABLE IF EXISTS public.ai_model_evaluations
  DROP CONSTRAINT IF EXISTS ai_model_evaluations_provider_check;
ALTER TABLE IF EXISTS public.ai_model_evaluations
  ADD CONSTRAINT ai_model_evaluations_provider_check
  CHECK (
    provider IN (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'grok',
      'together',
      'kimi',
      'openrouter',
      'zhipu',
      'perplexity',
      'qwen',
      'ollama',
      'kilo',
      'opencode'
    )
  );

ALTER TABLE IF EXISTS public.ai_key_validation_cache
  DROP CONSTRAINT IF EXISTS ai_key_validation_cache_provider_check;
ALTER TABLE IF EXISTS public.ai_key_validation_cache
  ADD CONSTRAINT ai_key_validation_cache_provider_check
  CHECK (
    provider IN (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'grok',
      'together',
      'kimi',
      'openrouter',
      'zhipu',
      'perplexity',
      'qwen',
      'ollama',
      'kilo',
      'opencode'
    )
  );
