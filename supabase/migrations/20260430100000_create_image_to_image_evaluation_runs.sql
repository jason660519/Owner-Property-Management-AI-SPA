CREATE TABLE IF NOT EXISTS public.image_to_image_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  row_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT '',
  output_mode TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  success BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL DEFAULT '',
  result_text TEXT NOT NULL DEFAULT '',
  result_image_url TEXT NOT NULL DEFAULT '',
  e2e_ms INTEGER,
  http_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.image_to_image_evaluation_runs IS
  '圖生圖模型評估單次執行紀錄（格局圖轉 2D/3D 彩繪參考圖；per superadmin user）';

CREATE INDEX IF NOT EXISTS idx_image_to_image_eval_runs_user_created
  ON public.image_to_image_evaluation_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_to_image_eval_runs_user_row_created
  ON public.image_to_image_evaluation_runs (user_id, row_id, created_at DESC);

ALTER TABLE public.image_to_image_evaluation_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'image_to_image_evaluation_runs'
      AND policyname = 'Users manage own image to image evaluation runs'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users manage own image to image evaluation runs"
        ON public.image_to_image_evaluation_runs FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'image_to_image_evaluation_runs'
      AND policyname = 'Service role full access image to image evaluation runs'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role full access image to image evaluation runs"
        ON public.image_to_image_evaluation_runs FOR ALL
        USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;
