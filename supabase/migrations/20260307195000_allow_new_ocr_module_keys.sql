-- ======================================================================================
-- Title: Allow online_ocr_parse and online_ocr_judge module keys
-- Date: 2026-03-07
-- Description: Update ai_modules_assigned_function constraint/comment for the split OCR modules.
-- ======================================================================================

ALTER TABLE public.ai_modules_assigned_function
  DROP CONSTRAINT IF EXISTS ai_modules_assigned_function_check;

ALTER TABLE public.ai_modules_assigned_function
  ADD CONSTRAINT ai_modules_assigned_function_check
  CHECK (
    assigned_function IN (
      'online_ocr',
      'online_ocr_parse',
      'online_ocr_judge',
      'local_ocr',
      'web_assistant',
      'contract_assistant',
      'blog_generator',
      'ad_generator'
    )
  );

COMMENT ON COLUMN public.ai_modules_assigned_function.assigned_function IS
  '指派的 AI 功能模組：online_ocr, online_ocr_parse, online_ocr_judge, local_ocr, web_assistant, contract_assistant, blog_generator, ad_generator';
