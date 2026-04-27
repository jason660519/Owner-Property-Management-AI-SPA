-- Update transcript parser/reviewer model assignments to the VLM ensemble
-- selected for the unified transcript workbench.

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
VALUES
  (
    'transcript_visual_parse',
    true,
    'qwen',
    'qwen3.6-plus',
    '{"temperature":0.1,"max_tokens":4096}'::jsonb,
    '[
      {"provider":"kimi","model_id":"kimi-k2.6","trigger":"rate_limit","config":{}},
      {"provider":"gemini","model_id":"gemini-3.1-pro-preview","trigger":"error","config":{}},
      {"provider":"qwen","model_id":"qwen-vl-max","trigger":"cost_over","config":{}}
    ]'::jsonb,
    '{"max_monthly_usd":5}'::jsonb,
    '謄本與權狀視覺解析：Qwen 3.6 Plus、Kimi K2.6、Gemini 3.1 Pro 三家 VLM 非同步解析。'
  ),
  (
    'transcript_audit',
    true,
    'openai',
    'gpt-5.5',
    '{"temperature":0.1,"max_tokens":4096}'::jsonb,
    '[
      {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{}},
      {"provider":"grok","model_id":"grok-4.20-reasoning","trigger":"error","config":{}},
      {"provider":"openai","model_id":"gpt-5.3-chat-latest","trigger":"cost_over","config":{}}
    ]'::jsonb,
    '{"max_monthly_usd":5}'::jsonb,
    '解析結果審核：OpenAI GPT-5.5、Claude Opus 4.5、Grok 4.20 三家 reviewer 交叉審查。'
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
