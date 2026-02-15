-- ======================================================================================
-- Title: ai_modules_assigned_function 欄位更新 — module_key 改為 assigned_function
-- Date: 2026-02-16
-- Description: 欄位語意改為「指派的功能」，約束與索引一併更新
-- ======================================================================================

-- 0. 若表名仍為 ai_feature_modules，先改為 ai_modules_assigned_function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_feature_modules') THEN
    ALTER TABLE public.ai_feature_modules RENAME TO ai_modules_assigned_function;
  END IF;
END $$;

-- 1. 移除依賴 module_key 的 unique 與 check 約束
ALTER TABLE public.ai_modules_assigned_function
  DROP CONSTRAINT IF EXISTS unique_feature_module_per_user,
  DROP CONSTRAINT IF EXISTS ai_feature_modules_module_key_check;

-- 2. 重新命名欄位（若仍為 module_key）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_modules_assigned_function' AND column_name = 'module_key'
  ) THEN
    ALTER TABLE public.ai_modules_assigned_function RENAME COLUMN module_key TO assigned_function;
  END IF;
END $$;

-- 3. 重新建立 check 與 unique
ALTER TABLE public.ai_modules_assigned_function
  ADD CONSTRAINT ai_modules_assigned_function_check
  CHECK (assigned_function IN (
    'online_ocr', 'local_ocr', 'web_assistant',
    'contract_assistant', 'blog_generator', 'ad_generator'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS unique_assigned_function_per_user
  ON public.ai_modules_assigned_function(user_id, assigned_function);

-- 若舊 unique 是以 INDEX 存在則移除重複
DROP INDEX IF EXISTS public.unique_feature_module_per_user;

-- 4. 索引與註解
CREATE INDEX IF NOT EXISTS idx_ai_modules_assigned_function_assigned
  ON public.ai_modules_assigned_function(assigned_function);

COMMENT ON COLUMN public.ai_modules_assigned_function.assigned_function IS '指派的 AI 功能模組：online_ocr, local_ocr, web_assistant, contract_assistant, blog_generator, ad_generator';
