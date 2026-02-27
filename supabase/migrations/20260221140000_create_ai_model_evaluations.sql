-- Model evaluation table: stores user assessments of which models are operational
-- and what their specialties are, serving as a candidate list for AI features.

CREATE TABLE IF NOT EXISTS ai_model_evaluations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('openai','anthropic','gemini','deepseek','grok')),
  model_id      TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  is_working    BOOLEAN NOT NULL DEFAULT false,
  specialties   TEXT[] NOT NULL DEFAULT '{}',
  is_candidate  BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT DEFAULT '',
  last_tested_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, provider, model_id)
);

COMMENT ON TABLE  ai_model_evaluations IS '可選模型評估：記錄各模型的運作狀態、強項分類及候選資格';
COMMENT ON COLUMN ai_model_evaluations.is_working   IS '模型是否目前可正常運作';
COMMENT ON COLUMN ai_model_evaluations.specialties   IS '模型強項分類，如 language_analysis, image_generation, coding, reasoning, vision, general';
COMMENT ON COLUMN ai_model_evaluations.is_candidate  IS '是否被選為後續 AI 功能的候選模型';

ALTER TABLE ai_model_evaluations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_model_evaluations'
    AND policyname = 'Users can manage own model evaluations'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can manage own model evaluations"
      ON ai_model_evaluations FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_model_evaluations'
    AND policyname = 'Service role full access to model evaluations'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role full access to model evaluations"
      ON ai_model_evaluations FOR ALL
      USING (auth.role() = ''service_role'')';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_model_evaluations_user    ON ai_model_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_evaluations_candidate ON ai_model_evaluations(user_id, is_candidate) WHERE is_candidate = true;

CREATE OR REPLACE FUNCTION update_ai_model_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_model_evaluations_updated_at ON ai_model_evaluations;
CREATE TRIGGER trg_ai_model_evaluations_updated_at
  BEFORE UPDATE ON ai_model_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_model_evaluations_updated_at();
