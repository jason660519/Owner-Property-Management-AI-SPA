-- Remove Gemini 2.0 Flash from transcript visual parsing after title-deed
-- samples showed poor extraction quality. Keep stronger VLMs only.

UPDATE ai_agent_model_assignments
SET
  fallbacks = '[
    {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{"temperature":0,"max_tokens":8192}},
    {"provider":"openai","model_id":"gpt-5.5","trigger":"error","config":{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}},
    {"provider":"gemini","model_id":"gemini-1.5-pro","trigger":"cost_over","config":{"temperature":0,"max_tokens":8192}}
  ]'::jsonb,
  notes = '謄本與權狀視覺解析：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；移除 Kimi/DeepSeek/Gemini Flash，備援保留 GPT-5.5、Claude Opus 與 Gemini Pro。',
  updated_at = NOW()
WHERE agent_key = 'transcript_visual_parse';
