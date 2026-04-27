-- Allow transcript parser raw-result logging for all configured AI providers.

ALTER TABLE public.ocr_parse_results
  DROP CONSTRAINT IF EXISTS ocr_parse_results_provider_check;

ALTER TABLE public.ocr_parse_results
  ADD CONSTRAINT ocr_parse_results_provider_check CHECK (
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
      'ollama_cloud',
      'ollama_local',
      'kilo',
      'opencode',
      'local'
    )
  );
