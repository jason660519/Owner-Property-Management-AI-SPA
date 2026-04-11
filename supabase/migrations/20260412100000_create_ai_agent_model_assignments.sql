-- ============================================================
-- ai_agent_model_assignments: Global (platform-wide) agent → model
-- strategy config. NOT per-user.
--
-- Stores, for each AI Agent key (see apps/superadmin/lib/ai/agent-registry.ts),
-- which provider/model is the primary, fallbacks in priority order,
-- and guardrails. This is the single source of truth for the
-- "模型選擇與設定" sheet tab in Superadmin → Settings →
-- API key and model setting.
--
-- Phase 1 of the feature: UI + data layer only. Phase 2 will add a
-- `resolveAgentModel(agentKey)` helper and wire existing LLM call-sites
-- (property-description/stream, models/test, transcript-parse, etc.)
-- to read this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_model_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Corresponds to AI_AGENT_REGISTRY[].key (e.g. 'contract_assistant').
  -- Should equal the moduleKey used by lib/ai/prompt-safety.ts so that
  -- Phase 2 dispatcher can join prompt + model assignment on the same key.
  agent_key TEXT UNIQUE NOT NULL,

  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Primary model to call for this agent.
  primary_provider TEXT NOT NULL,
  primary_model_id TEXT NOT NULL,

  -- Per-call parameters applied to the primary model.
  -- Shape: { temperature?: number, max_tokens?: number, top_p?: number, reasoning_effort?: 'low'|'medium'|'high' }
  primary_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Ordered fallback chain. Each entry:
  -- { provider: string, model_id: string, trigger: 'rate_limit'|'error'|'cost_over', config?: object }
  fallbacks JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Runtime guardrails evaluated by the future dispatcher.
  -- Shape: { max_monthly_usd?: number, require_tags?: string[], forbid_providers?: string[] }
  guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,

  notes TEXT,

  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------
ALTER TABLE ai_agent_model_assignments ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read the global config.
CREATE POLICY "ai_agent_model_assignments_select"
  ON ai_agent_model_assignments FOR SELECT
  TO authenticated
  USING (true);

-- Writes go through the service-role admin client (the superadmin app's
-- API routes verify caller identity before calling this table).
CREATE POLICY "ai_agent_model_assignments_service_all"
  ON ai_agent_model_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------
-- Indexes + triggers
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_agent_model_assignments_agent_key
  ON ai_agent_model_assignments (agent_key);

-- Reuse shared updated_at helper defined in an earlier migration.
CREATE TRIGGER set_updated_at_ai_agent_model_assignments
  BEFORE UPDATE ON ai_agent_model_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------
-- Comments (pg_catalog) — helps future migrations and SQL explorers.
-- -----------------------------------------------------------------
COMMENT ON TABLE ai_agent_model_assignments IS
  'Global (platform-wide) agent → model strategy. One row per agent_key. Read by the "模型選擇與設定" sheet tab.';
COMMENT ON COLUMN ai_agent_model_assignments.agent_key IS
  'Must equal AI_AGENT_REGISTRY[].key and lib/ai/prompt-safety.ts moduleKey (snake_case).';
COMMENT ON COLUMN ai_agent_model_assignments.primary_config IS
  'JSON: { temperature?, max_tokens?, top_p?, reasoning_effort? }';
COMMENT ON COLUMN ai_agent_model_assignments.fallbacks IS
  'JSON array in priority order: [{ provider, model_id, trigger, config? }]';
COMMENT ON COLUMN ai_agent_model_assignments.guardrails IS
  'JSON: { max_monthly_usd?, require_tags?, forbid_providers? }';
