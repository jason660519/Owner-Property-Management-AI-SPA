-- ======================================================================================
-- Title: ai_chat_logs 增加對話時間與 token 等欄位
-- Date: 2026-02-16
-- Description: 對話起始/結束時間、輸入/輸出 token、費用、耗時
-- ======================================================================================

-- 對話起始時間、結束時間
ALTER TABLE public.ai_chat_logs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Token 與計費（與 ai_usage_logs 對齊）
ALTER TABLE public.ai_chat_logs
  ADD COLUMN IF NOT EXISTS tokens_input INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_output INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

COMMENT ON COLUMN public.ai_chat_logs.started_at IS '對話起始時間（第一則 user 訊息時間）';
COMMENT ON COLUMN public.ai_chat_logs.ended_at IS '對話結束時間（最後一則 assistant 回應時間）';
COMMENT ON COLUMN public.ai_chat_logs.tokens_input IS '輸入 token 數（user + system 等）';
COMMENT ON COLUMN public.ai_chat_logs.tokens_output IS '輸出 token 數（assistant 回應）';
COMMENT ON COLUMN public.ai_chat_logs.tokens_total IS '總 token（tokens_input + tokens_output）';
COMMENT ON COLUMN public.ai_chat_logs.cost_usd IS '預估費用（美元）';
COMMENT ON COLUMN public.ai_chat_logs.duration_ms IS '本次對話耗時（毫秒）';

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_started_at ON public.ai_chat_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_ended_at ON public.ai_chat_logs(ended_at DESC NULLS LAST);

-- 既有資料：用 created_at 推回 started_at / ended_at，並填入模擬 token
UPDATE public.ai_chat_logs
SET
  started_at = COALESCE(started_at, created_at - interval '1 minute'),
  ended_at = COALESCE(ended_at, created_at),
  tokens_input = CASE WHEN tokens_input = 0 THEN 80 + (jsonb_array_length(COALESCE(content->'messages', '[]'::jsonb)) / 2) * 60 ELSE tokens_input END,
  tokens_output = CASE WHEN tokens_output = 0 THEN 120 + (jsonb_array_length(COALESCE(content->'messages', '[]'::jsonb)) / 2) * 100 ELSE tokens_output END,
  duration_ms = CASE WHEN duration_ms IS NULL THEN 1500 + (jsonb_array_length(COALESCE(content->'messages', '[]'::jsonb)) / 2) * 800 ELSE duration_ms END
WHERE started_at IS NULL OR tokens_input = 0;

-- 更新 tokens_total 會由 generated column 自動計算；cost 可依 provider 另行計算
UPDATE public.ai_chat_logs
SET cost_usd = LEAST(0.01, (tokens_input * 0.000001 + tokens_output * 0.000003)::numeric(10,6))
WHERE cost_usd = 0 OR cost_usd IS NULL;
