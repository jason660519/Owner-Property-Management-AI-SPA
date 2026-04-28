-- Replace Gemini 2.0 Flash in transcript detection.
-- Detection needs reliable document-kind and parking-right judgment, so keep
-- the fallback chain on stronger reasoning / vision models.

UPDATE ai_agent_model_assignments
SET
  fallbacks = '[
    {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{"temperature":0,"max_tokens":4096}},
    {"provider":"openai","model_id":"gpt-5.5","trigger":"error","config":{"temperature":0,"max_tokens":4096,"reasoning_effort":"high"}},
    {"provider":"gemini","model_id":"gemini-1.5-pro","trigger":"cost_over","config":{"temperature":0,"max_tokens":4096,"reasoning_effort":"high"}}
  ]'::jsonb,
  notes = '謄本與權狀初判：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；移除 Gemini 2.0 Flash，fallback 保留 Claude Opus、GPT-5.5 與 Gemini Pro；權狀需優先判為 land_title / building_title，沒有明確車位證據不得推測車位。',
  updated_at = NOW()
WHERE agent_key = 'transcript_detection';
