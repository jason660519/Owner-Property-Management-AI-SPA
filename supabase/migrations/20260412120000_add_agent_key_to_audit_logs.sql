-- ============================================================
-- Add `agent_key` to ai_prompt_audit_logs so post-Phase-2 audit
-- rows can be queried by the canonical agent_key directly — no
-- more reverse alias expansion in `agent-cost-guard.ts`.
--
-- Historical rows keep their existing `module_key` (which holds
-- the flat/dotted legacy name) and a NULL `agent_key`. The
-- cost-guard query therefore uses an OR clause:
--
--   agent_key = $1  OR  module_key IN (<legacy aliases for $1>)
--
-- so both pre- and post-Phase-2 rows count towards the same
-- monthly budget.
-- ============================================================

ALTER TABLE ai_prompt_audit_logs
  ADD COLUMN IF NOT EXISTS agent_key TEXT;

-- Fast lookup for the new cost-guard query path.
CREATE INDEX IF NOT EXISTS idx_ai_prompt_audit_logs_agent_created
  ON ai_prompt_audit_logs (agent_key, created_at DESC)
  WHERE agent_key IS NOT NULL;

COMMENT ON COLUMN ai_prompt_audit_logs.agent_key IS
  'Canonical agent_key from AI_AGENT_REGISTRY. NULL for rows written before Phase 2 (legacy rows still use module_key).';
