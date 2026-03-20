-- ======================================================================================
-- Title: Add property_description module key
-- Date: 2026-03-19
-- Description: Allow dedicated property description AI module assignments.
-- ======================================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_modules_assigned_function'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.ai_modules_assigned_function
        DROP CONSTRAINT IF EXISTS ai_modules_assigned_function_check
    $sql$;

    EXECUTE $sql$
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
            'property_description',
            'ad_generator'
          )
        )
    $sql$;

    EXECUTE $sql$
      COMMENT ON COLUMN public.ai_modules_assigned_function.assigned_function IS
      '指派的 AI 功能模組：online_ocr, online_ocr_parse, online_ocr_judge, local_ocr, web_assistant, contract_assistant, blog_generator, property_description, ad_generator'
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_feature_modules'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.ai_feature_modules
        DROP CONSTRAINT IF EXISTS ai_feature_modules_module_key_check
    $sql$;

    EXECUTE $sql$
      ALTER TABLE public.ai_feature_modules
        ADD CONSTRAINT ai_feature_modules_module_key_check
        CHECK (
          module_key IN (
            'online_ocr',
            'local_ocr',
            'web_assistant',
            'contract_assistant',
            'blog_generator',
            'property_description',
            'ad_generator'
          )
        )
    $sql$;

    EXECUTE $sql$
      INSERT INTO public.ai_feature_modules (user_id, module_key, is_enabled)
      SELECT DISTINCT user_id, 'property_description', false
      FROM public.ai_feature_modules
      ON CONFLICT (user_id, module_key) DO NOTHING
    $sql$;
  END IF;
END
$$;