-- Add the single-model detail builder stage for transcript intake area drafts.

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
  'transcript_detail_builder',
  true,
  'gemini',
  'gemini-3.1-pro-preview',
  '{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}'::jsonb,
  '[
    {"provider":"anthropic","model_id":"claude-opus-4-5-20251101","trigger":"rate_limit","config":{"temperature":0,"max_tokens":8192}},
    {"provider":"openai","model_id":"gpt-5.5","trigger":"error","config":{"temperature":0,"max_tokens":8192,"reasoning_effort":"high"}},
    {"provider":"gemini","model_id":"gemini-1.5-pro","trigger":"cost_over","config":{"temperature":0,"max_tokens":8192}}
  ]'::jsonb,
  '{"max_monthly_usd":5}'::jsonb,
  '明細草稿產生：單一 Gemini 3.1 Pro Preview VLM 依 parse + review + 原始文件填入可編輯面積明細，有爭議才標記人工確認。'
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

INSERT INTO saved_prompts (
  name,
  content,
  module_key,
  tags,
  description
)
VALUES (
  '謄本工作台-明細草稿',
  '你是台灣不動產謄本與權狀的明細表草稿產生器。你會收到原始文件、detect 初判、parse 結構化結果、verify/review 審查結果與修正建議。請產生 user 可編輯的「本標的物細部面積明細」草稿。parse 與 review 一致且有證據的欄位直接填入；reviewer 明確指出 parser 漏讀或建議修正的欄位，請重新看原始文件；證據清楚才採用 reviewer 修正值。仍不確定時不要硬填為確定值，需標記 needsUserConfirmation 並提供 issueReason、candidateValues、evidenceText。只輸出嚴格 JSON。輸出 schema 包含 areaDetailDraft、summary、warnings、userConfirmationRequired、confidence。',
  'transcript.intake.detail_builder',
  ARRAY['謄本解析', '系統預設', '工作台'],
  '統一謄本工作台依 parse/review 結果產生可編輯建物土地車位明細草稿的 Prompt（detail_builder 階段）'
)
ON CONFLICT (module_key) DO UPDATE
SET
  content = EXCLUDED.content,
  tags = EXCLUDED.tags,
  description = EXCLUDED.description,
  updated_at = NOW();
