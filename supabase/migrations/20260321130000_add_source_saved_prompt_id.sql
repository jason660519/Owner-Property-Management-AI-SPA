-- Migration: add_source_saved_prompt_id
-- Purpose: Track which saved_prompt was promoted to become the active system prompt,
--          so Prompt 管理 can show a badge on the currently-active entry.

ALTER TABLE public.ai_system_prompts
  ADD COLUMN IF NOT EXISTS source_saved_prompt_id UUID
    REFERENCES saved_prompts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ai_system_prompts.source_saved_prompt_id IS
  'When this system prompt was promoted from saved_prompts, stores the source row id. NULL = set directly via OcrSystemPromptPanel.';
