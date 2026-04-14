-- RPC helpers for superadmin LLM monitor (aggregates over ai_usage_logs; service_role only)

CREATE OR REPLACE FUNCTION public.superadmin_ai_usage_overall_since(p_since timestamptz)
RETURNS TABLE (
  total_requests bigint,
  avg_latency_ms numeric,
  total_cost_usd numeric,
  error_rate numeric,
  distinct_models bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total_requests,
    COALESCE(AVG(l.duration_ms::numeric), 0) AS avg_latency_ms,
    COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd,
    COALESCE(
      (COUNT(*) FILTER (WHERE l.status IN ('error', 'timeout')))::numeric
        / NULLIF(COUNT(*), 0)::numeric,
      0
    ) AS error_rate,
    COUNT(DISTINCT (l.provider || '/' || l.model_id))::bigint AS distinct_models
  FROM public.ai_usage_logs l
  WHERE l.created_at >= p_since;
$$;

CREATE OR REPLACE FUNCTION public.superadmin_ai_usage_by_model_since(p_since timestamptz)
RETURNS TABLE (
  provider text,
  model_id text,
  total_requests bigint,
  success_count bigint,
  error_count bigint,
  timeout_count bigint,
  avg_latency_ms numeric,
  total_cost_usd numeric,
  avg_prompt_tokens numeric,
  avg_completion_tokens numeric,
  error_rate numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    u.provider,
    u.model_id,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE u.status = 'success')::bigint AS success_count,
    COUNT(*) FILTER (WHERE u.status = 'error')::bigint AS error_count,
    COUNT(*) FILTER (WHERE u.status = 'timeout')::bigint AS timeout_count,
    COALESCE(AVG(u.duration_ms::numeric), 0) AS avg_latency_ms,
    COALESCE(SUM(u.cost_usd), 0) AS total_cost_usd,
    COALESCE(AVG(u.tokens_input::numeric), 0) AS avg_prompt_tokens,
    COALESCE(AVG(u.tokens_output::numeric), 0) AS avg_completion_tokens,
    COALESCE(
      (COUNT(*) FILTER (WHERE u.status IN ('error', 'timeout')))::numeric
        / NULLIF(COUNT(*), 0)::numeric,
      0
    ) AS error_rate
  FROM public.ai_usage_logs u
  WHERE u.created_at >= p_since
  GROUP BY u.provider, u.model_id;
$$;

CREATE OR REPLACE FUNCTION public.superadmin_ai_usage_daily_series(p_days integer)
RETURNS TABLE (
  bucket_date date,
  total_tokens bigint,
  total_cost_usd numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (timezone('UTC', l.created_at))::date AS bucket_date,
    COALESCE(SUM(l.tokens_input + l.tokens_output), 0)::bigint AS total_tokens,
    COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd
  FROM public.ai_usage_logs l
  WHERE l.created_at >= (timezone('UTC', now()) - ((GREATEST(p_days, 1) || ' days')::interval))
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.superadmin_ai_usage_weekly_series(p_weeks integer)
RETURNS TABLE (
  week_start date,
  total_tokens bigint,
  total_cost_usd numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (date_trunc('week', timezone('UTC', l.created_at)))::date AS week_start,
    COALESCE(SUM(l.tokens_input + l.tokens_output), 0)::bigint AS total_tokens,
    COALESCE(SUM(l.cost_usd), 0) AS total_cost_usd
  FROM public.ai_usage_logs l
  WHERE l.created_at >= (timezone('UTC', now()) - ((GREATEST(p_weeks, 1) * 7) || ' days')::interval)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Voice / TTS: module_key voice_generation (or path contains voice)
CREATE OR REPLACE FUNCTION public.superadmin_voice_quality_daily(p_days integer)
RETURNS TABLE (
  bucket_date date,
  avg_latency_ms numeric,
  break_proxy_rate numeric,
  sample_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (timezone('UTC', l.created_at))::date AS bucket_date,
    COALESCE(AVG(l.duration_ms::numeric), 0) AS avg_latency_ms,
    COALESCE(
      (COUNT(*) FILTER (WHERE l.status IN ('error', 'timeout')))::numeric
        / NULLIF(COUNT(*), 0)::numeric,
      0
    ) AS break_proxy_rate,
    COUNT(*)::bigint AS sample_count
  FROM public.ai_usage_logs l
  WHERE l.created_at >= (timezone('UTC', now()) - ((GREATEST(p_days, 1) || ' days')::interval))
    AND (
      l.module_key = 'voice_generation'
      OR l.module_key ILIKE '%voice%'
      OR COALESCE(l.request_path, '') ILIKE '%voice%'
      OR COALESCE(l.request_path, '') ILIKE '%tts%'
    )
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.superadmin_ai_usage_cost_between(p_from timestamptz, p_to timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(l.cost_usd), 0)
  FROM public.ai_usage_logs l
  WHERE l.created_at >= p_from AND l.created_at < p_to;
$$;

REVOKE ALL ON FUNCTION public.superadmin_ai_usage_overall_since(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_ai_usage_by_model_since(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_ai_usage_daily_series(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_ai_usage_weekly_series(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_voice_quality_daily(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.superadmin_ai_usage_cost_between(timestamptz, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.superadmin_ai_usage_overall_since(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_ai_usage_by_model_since(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_ai_usage_daily_series(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_ai_usage_weekly_series(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_voice_quality_daily(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_ai_usage_cost_between(timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION public.superadmin_voice_quality_daily(integer) IS
  'Daily voice/TTS latency and proxy break-rate (failed+timeout / total) for llm-monitor charts.';
