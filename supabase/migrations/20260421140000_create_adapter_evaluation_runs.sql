-- Per-superadmin adapter test run history (append-only), keyed by adapter_id + channel (cli/http).

CREATE TABLE IF NOT EXISTS public.adapter_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adapter_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('cli', 'http')),
  provider TEXT NOT NULL,
  adapter_option_label TEXT NOT NULL,
  requested_model TEXT NOT NULL DEFAULT '',
  effective_model TEXT NOT NULL DEFAULT '',
  model_source TEXT NOT NULL DEFAULT '',
  evaluation_level TEXT NOT NULL CHECK (evaluation_level IN ('pass', 'warning', 'fail', 'pending')),
  evaluation_message TEXT NOT NULL DEFAULT '',
  result_summary TEXT NOT NULL DEFAULT '',
  ttft_ms INTEGER,
  e2e_ms INTEGER,
  tokens_per_sec DOUBLE PRECISION,
  http_status INTEGER,
  error_type TEXT,
  rendered_output TEXT,
  raw_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.adapter_evaluation_runs IS
  'LLM Adapter 單次測試完成紀錄（per superadmin user；append-only）';

CREATE INDEX IF NOT EXISTS idx_adapter_evaluation_runs_user_created
  ON public.adapter_evaluation_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adapter_evaluation_runs_user_adapter_channel
  ON public.adapter_evaluation_runs (user_id, adapter_id, channel, created_at DESC);

ALTER TABLE public.adapter_evaluation_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'adapter_evaluation_runs'
      AND policyname = 'Users manage own adapter evaluation runs'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users manage own adapter evaluation runs"
        ON public.adapter_evaluation_runs FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'adapter_evaluation_runs'
      AND policyname = 'Service role full access adapter evaluation runs'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role full access adapter evaluation runs"
        ON public.adapter_evaluation_runs FOR ALL
        USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- Aggregated summary for superadmin settings UI (called with service_role from API).
CREATE OR REPLACE FUNCTION public.adapter_evaluation_group_summary(p_user_id uuid)
RETURNS TABLE (
  adapter_id text,
  channel text,
  total_runs bigint,
  last_at timestamptz,
  last_summary text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.adapter_id,
    r.channel,
    COUNT(*)::bigint AS total_runs,
    MAX(r.created_at) AS last_at,
    (ARRAY_AGG(r.result_summary ORDER BY r.created_at DESC))[1] AS last_summary
  FROM public.adapter_evaluation_runs r
  WHERE r.user_id = p_user_id
  GROUP BY r.adapter_id, r.channel;
$$;

REVOKE ALL ON FUNCTION public.adapter_evaluation_group_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adapter_evaluation_group_summary(uuid) TO service_role;
