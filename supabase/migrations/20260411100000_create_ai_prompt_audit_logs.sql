-- Migration: create_ai_prompt_audit_logs
-- Purpose: Persistent audit trail for every LLM call made by the superadmin
--          app. See docs/ai-prompt-safety-guide.md §8 for the full spec.
--
-- Privacy:
--   * We store a SHA-256 hash of the user input, NOT the raw text, to avoid
--     persisting private content (addresses, transcript data, etc.).
--   * input_length lets us reason about size / cost without the plaintext.
--   * injection_flags records which detectInjectionAttempt() patterns hit,
--     useful for tracking attack attempts over time.

CREATE TABLE IF NOT EXISTS public.ai_prompt_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who and what module
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  module_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,

  -- SSoT traceability: which prompt row was actually used
  saved_prompt_id UUID REFERENCES saved_prompts(id) ON DELETE SET NULL,
  ai_system_prompt_id UUID REFERENCES ai_system_prompts(id) ON DELETE SET NULL,
  prompt_source TEXT,

  -- User input fingerprint (hash only, never plaintext)
  user_input_sha256 TEXT,
  user_input_length INTEGER,
  injection_flags TEXT[] NOT NULL DEFAULT '{}',

  -- Usage & performance
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,

  -- Outcome
  status TEXT NOT NULL CHECK (status IN (
    'success',
    'schema_mismatch',
    'api_error',
    'rate_limited',
    'blocked',
    'prompt_not_found'
  )),
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup indexes: recent calls per user, recent calls per module, injection search
CREATE INDEX IF NOT EXISTS idx_ai_prompt_audit_logs_user_created
  ON public.ai_prompt_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_audit_logs_module_created
  ON public.ai_prompt_audit_logs (module_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_audit_logs_injection
  ON public.ai_prompt_audit_logs USING GIN (injection_flags)
  WHERE array_length(injection_flags, 1) > 0;

-- RLS: super_admin can read everything; inserts go through service_role.
ALTER TABLE public.ai_prompt_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_prompt_audit_logs_super_admin_select" ON public.ai_prompt_audit_logs;
CREATE POLICY "ai_prompt_audit_logs_super_admin_select"
  ON public.ai_prompt_audit_logs
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

DROP POLICY IF EXISTS "ai_prompt_audit_logs_service_role_insert" ON public.ai_prompt_audit_logs;
CREATE POLICY "ai_prompt_audit_logs_service_role_insert"
  ON public.ai_prompt_audit_logs
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM iam_user_roles ur
      JOIN iam_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    )
  );

COMMENT ON TABLE public.ai_prompt_audit_logs IS
  'Audit trail for every LLM call made by the superadmin app. Written by lib/ai/audit.ts::logPromptAudit().';
