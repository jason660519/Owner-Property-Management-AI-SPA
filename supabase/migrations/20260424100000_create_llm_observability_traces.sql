-- LLM observability trace/span schema.
-- Purpose: provide a Langfuse/Phoenix-inspired internal model without coupling
-- the app to any third-party observability vendor.

CREATE TABLE IF NOT EXISTS public.llm_observability_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path TEXT,
  company_id UUID,
  company_name TEXT,
  module_key TEXT,
  invocation_name TEXT,
  execution_name TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'timeout', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.llm_observability_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID REFERENCES public.llm_observability_traces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_kind TEXT NOT NULL DEFAULT 'llm_call' CHECK (source_kind IN ('llm_call', 'adapter_run', 'evaluator_run', 'tool_call', 'legacy_usage')),
  provider TEXT,
  adapter_id TEXT,
  adapter_model TEXT,
  requested_model TEXT,
  effective_model TEXT,
  input_prompt TEXT,
  test_prompt TEXT,
  test_file_name TEXT,
  raw_output TEXT,
  rendered_output TEXT,
  evaluation_label TEXT,
  evaluation_score DOUBLE PRECISION,
  evaluation_message TEXT,
  ttft_ms INTEGER,
  e2e_ms INTEGER,
  throughput_tokens_per_s DOUBLE PRECISION,
  http_status INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(12, 6),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'timeout', 'cancelled', 'warning', 'fail', 'pass', 'pending')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_observability_traces_started
  ON public.llm_observability_traces (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_observability_traces_page_started
  ON public.llm_observability_traces (page_path, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_observability_invocations_trace
  ON public.llm_observability_invocations (trace_id, started_at ASC);

CREATE INDEX IF NOT EXISTS idx_llm_observability_invocations_started
  ON public.llm_observability_invocations (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_observability_invocations_provider_model
  ON public.llm_observability_invocations (provider, effective_model, started_at DESC);

ALTER TABLE public.llm_observability_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_observability_invocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "llm_observability_traces_super_admin_select" ON public.llm_observability_traces;
CREATE POLICY "llm_observability_traces_super_admin_select"
  ON public.llm_observability_traces
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM iam_user_roles ur
      JOIN iam_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "llm_observability_invocations_super_admin_select" ON public.llm_observability_invocations;
CREATE POLICY "llm_observability_invocations_super_admin_select"
  ON public.llm_observability_invocations
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM iam_user_roles ur
      JOIN iam_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "llm_observability_traces_service_role_write" ON public.llm_observability_traces;
CREATE POLICY "llm_observability_traces_service_role_write"
  ON public.llm_observability_traces
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "llm_observability_invocations_service_role_write" ON public.llm_observability_invocations;
CREATE POLICY "llm_observability_invocations_service_role_write"
  ON public.llm_observability_invocations
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.llm_observability_traces IS
  'Workflow-level LLM observability traces for the superadmin app.';

COMMENT ON TABLE public.llm_observability_invocations IS
  'Invocation/span-level LLM observability rows attached to traces.';
