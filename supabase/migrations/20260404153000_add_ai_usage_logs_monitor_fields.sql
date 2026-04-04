ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS prompt_name TEXT,
  ADD COLUMN IF NOT EXISTS prompt_source TEXT,
  ADD COLUMN IF NOT EXISTS prompt_module_key TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version INTEGER,
  ADD COLUMN IF NOT EXISTS final_prompt_hash TEXT,
  ADD COLUMN IF NOT EXISTS request_path TEXT,
  ADD COLUMN IF NOT EXISTS response_status INTEGER;

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_prompt_source_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_prompt_source_check
  CHECK (prompt_source IS NULL OR prompt_source IN ('ai_system_prompt', 'saved_prompt', 'default'));

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_module_key_created_at
  ON public.ai_usage_logs(module_key, created_at DESC);
