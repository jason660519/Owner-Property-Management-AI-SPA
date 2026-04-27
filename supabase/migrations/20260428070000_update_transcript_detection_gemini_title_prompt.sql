-- Move transcript/title detection away from GPT-4o and tighten title/parking
-- classification rules.

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
  'transcript_detection',
  true,
  'gemini',
  'gemini-3.1-pro-preview',
  '{"temperature":0,"max_tokens":4096,"reasoning_effort":"high"}'::jsonb,
  '[
    {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{"temperature":0,"max_tokens":4096}},
    {"provider":"openai","model_id":"gpt-5.5","trigger":"error","config":{"temperature":0,"max_tokens":4096,"reasoning_effort":"high"}},
    {"provider":"gemini","model_id":"gemini-2.0-flash","trigger":"cost_over","config":{"temperature":0,"max_tokens":4096,"reasoning_effort":"high"}}
  ]'::jsonb,
  '{"max_monthly_usd":5}'::jsonb,
  '謄本與權狀初判：Gemini 3.1 Pro Preview 為主，temperature 0、thinking level high；權狀需優先判為 land_title / building_title，沒有明確車位證據不得推測車位。'
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

UPDATE saved_prompts
SET
  content = concat(
    content,
    E'\n\n',
    '權狀與車位初判補強規則：', E'\n',
    '- 若看到「土地所有權狀」「土地標示」「地號」「權利範圍」等內容，documentKinds 必須包含 land_title，不要輸出 land_transcript。', E'\n',
    '- 若看到「建物所有權狀」「建物標示」「建號」「門牌」「共同使用部分」等內容，documentKinds 必須包含 building_title，不要輸出 building_transcript。', E'\n',
    '- 同一張權狀若同時含土地標示與建物標示，documentKinds 應同時包含 land_title 與 building_title。', E'\n',
    '- 只有看到明確車位文字（如「停車位」「車位」「停車空間」「車位編號」「停車場」「車位權利範圍」）時，才可判定 hasParkingEvidence=true 或 parkingTitleRights；不可只因出現「共同使用部分」就推測 shared_facility。', E'\n',
    '- 沒有明確車位證據時，parkingTitleRights 必須輸出 []，hasParkingEvidence 必須輸出 false。'
  ),
  updated_at = NOW()
WHERE module_key = 'transcript.intake.detect'
  AND content NOT LIKE '%權狀與車位初判補強規則%';
