-- Cache per-key validation results (including available models list) for 6 hours
-- so the model dropdown stays visible after refresh or when coming from another page.

CREATE TABLE IF NOT EXISTS public.ai_key_validation_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES public.ai_api_keys(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai','anthropic','gemini','deepseek','grok')),
  available_models TEXT[] NOT NULL DEFAULT '{}',
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key_id)
);

COMMENT ON TABLE public.ai_key_validation_cache IS 'Per-key validation cache: available models list, used for 6h to show model menu without re-validating';

CREATE INDEX IF NOT EXISTS idx_ai_key_validation_cache_validated_at
  ON public.ai_key_validation_cache(user_id, validated_at DESC);

ALTER TABLE public.ai_key_validation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own validation cache"
  ON public.ai_key_validation_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to validation cache"
  ON public.ai_key_validation_cache FOR ALL
  USING (auth.role() = 'service_role');
