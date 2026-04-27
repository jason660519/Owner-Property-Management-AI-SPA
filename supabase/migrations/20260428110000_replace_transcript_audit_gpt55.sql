-- Replace GPT-5.5 in transcript audit after repeated incomplete JSON output.

UPDATE ai_agent_model_assignments
SET
  primary_provider = 'anthropic',
  primary_model_id = 'claude-opus-4-5-20251101',
  primary_config = '{"temperature":0,"max_tokens":8192}'::jsonb,
  fallbacks = '[
    {"provider":"gemini","model_id":"gemini-3.1-pro-preview","trigger":"rate_limit","config":{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}},
    {"provider":"grok","model_id":"grok-4.20-reasoning","trigger":"error","config":{"temperature":0,"max_tokens":8192}},
    {"provider":"openai","model_id":"gpt-5.3-chat-latest","trigger":"cost_over","config":{"temperature":0,"max_tokens":8192}}
  ]'::jsonb,
  notes = '解析結果審核：移除持續輸出不完整 JSON 的 GPT-5.5；預設由 Claude Opus 4.5、Gemini 3.1 Pro Preview、Grok 4.20 三家 reviewer 交叉審查，OpenAI GPT-5.3 作為補位。',
  updated_at = NOW()
WHERE agent_key = 'transcript_audit';
