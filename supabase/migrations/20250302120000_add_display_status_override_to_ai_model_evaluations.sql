-- Allow superadmin to manually override AI-inferred model status (e.g. when detection is wrong).
-- Values: vlm_ok, llm_ok, working, not_working, untested

ALTER TABLE ai_model_evaluations
  ADD COLUMN IF NOT EXISTS display_status_override TEXT
  CHECK (display_status_override IS NULL OR display_status_override IN (
    'vlm_ok', 'llm_ok', 'working', 'not_working', 'untested'
  ));

COMMENT ON COLUMN ai_model_evaluations.display_status_override IS
  '使用者手動覆寫的顯示狀態：vlm_ok=VLM可用, llm_ok=LLM可用, working=通用模型可用, not_working=不可用, untested=尚未測試';
