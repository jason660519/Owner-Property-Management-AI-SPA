-- Switch transcript visual parsing away from Kimi/DeepSeek and make
-- Gemini 3.1 Pro Preview the primary parser with deterministic high thinking.

INSERT INTO ai_agent_model_assignments (
  agent_key,
  is_enabled,
  primary_provider,
  primary_model_id,
  primary_config,
  fallbacks,
  guardrails,
  notes
)
VALUES (
  'transcript_visual_parse',
  true,
  'gemini',
  'gemini-3.1-pro-preview',
  '{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}'::jsonb,
  '[
    {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{"temperature":0,"max_tokens":8192}},
    {"provider":"gemini","model_id":"gemini-2.0-flash","trigger":"error","config":{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}},
    {"provider":"gemini","model_id":"gemini-1.5-pro","trigger":"cost_over","config":{"temperature":0,"max_tokens":8192}}
  ]'::jsonb,
  '{"max_monthly_usd":5}'::jsonb,
  '謄本與權狀視覺解析：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；移除 Kimi/DeepSeek，備援保留 Claude Opus 與 Gemini 系列。'
)
ON CONFLICT (agent_key) DO UPDATE
SET
  is_enabled = EXCLUDED.is_enabled,
  primary_provider = EXCLUDED.primary_provider,
  primary_model_id = EXCLUDED.primary_model_id,
  primary_config = EXCLUDED.primary_config,
  fallbacks = EXCLUDED.fallbacks,
  guardrails = EXCLUDED.guardrails,
  notes = EXCLUDED.notes,
  updated_at = NOW();
