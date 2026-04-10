-- Migration: create_ai_call_rate_limits
-- Purpose: Lightweight sliding-window rate limiter for expensive LLM
--          endpoints. See docs/ai-prompt-safety-guide.md §6.2.
--
-- Approach:
--   Each call inserts one row with (user_id, endpoint_key, called_at).
--   Before inserting, the caller prunes rows older than the window and
--   counts remaining rows. If count ≥ limit, the caller returns 429.
--
-- Why Postgres instead of Redis:
--   We already depend on Supabase. A dedicated cache is overkill for the
--   superadmin workload, and Postgres gives us durable audit + reset
--   semantics by default. Upgrade to Redis if we ever exceed 1000 qps.

CREATE TABLE IF NOT EXISTS public.ai_call_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_key TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary lookup: all calls by a user/endpoint within the sliding window.
CREATE INDEX IF NOT EXISTS idx_ai_call_rate_limits_user_endpoint_time
  ON public.ai_call_rate_limits (user_id, endpoint_key, called_at DESC);

-- Cleanup helper index: finding stale rows for bulk delete.
CREATE INDEX IF NOT EXISTS idx_ai_call_rate_limits_called_at
  ON public.ai_call_rate_limits (called_at);

-- RLS: only service_role writes; super_admin can read for debugging.
ALTER TABLE public.ai_call_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_call_rate_limits_super_admin_select" ON public.ai_call_rate_limits;
CREATE POLICY "ai_call_rate_limits_super_admin_select"
  ON public.ai_call_rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM iam_user_roles ur
      JOIN iam_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    )
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "ai_call_rate_limits_service_role_insert" ON public.ai_call_rate_limits;
CREATE POLICY "ai_call_rate_limits_service_role_insert"
  ON public.ai_call_rate_limits
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "ai_call_rate_limits_service_role_delete" ON public.ai_call_rate_limits;
CREATE POLICY "ai_call_rate_limits_service_role_delete"
  ON public.ai_call_rate_limits
  FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.ai_call_rate_limits IS
  'Sliding-window rate limiter rows. One row per LLM endpoint call. Pruned opportunistically by lib/ai/rate-limit.ts::assertRateLimit().';
