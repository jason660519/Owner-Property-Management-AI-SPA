/**
 * Types for the "模型選擇與設定" (Agent Model Assignment) feature.
 *
 * Stored in the `ai_agent_model_assignments` table — one row per
 * agent_key, global across the whole platform (no user_id).
 *
 * See: supabase/migrations/20260412100000_create_ai_agent_model_assignments.sql
 */

/** Reason that causes the dispatcher to move from primary to a fallback. */
export type FallbackTrigger = 'rate_limit' | 'error' | 'cost_over';

/** Runtime parameters passed to the underlying LLM. */
export interface AgentModelConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  /** Only honoured by reasoning-capable models (e.g. o-series). */
  reasoning_effort?: 'low' | 'medium' | 'high';
}

/** One entry in the ordered fallback chain. */
export interface AgentFallbackEntry {
  provider: string;
  model_id: string;
  trigger: FallbackTrigger;
  config?: AgentModelConfig;
}

/** Runtime guardrails evaluated by the future dispatcher. */
export interface AgentGuardrails {
  /** Hard cap on USD spent per calendar month. */
  max_monthly_usd?: number;
  /** Require the chosen model to carry all of these role tag_keys. */
  require_tags?: string[];
  /** Never route to these providers, even if the primary/fallback says so. */
  forbid_providers?: string[];
}

/** Full row shape returned from the API. */
export interface AgentAssignment {
  id: string;
  agent_key: string;
  is_enabled: boolean;
  primary_provider: string;
  primary_model_id: string;
  primary_config: AgentModelConfig;
  fallbacks: AgentFallbackEntry[];
  guardrails: AgentGuardrails;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Patch payload accepted by the PUT endpoint. `agent_key` is required to
 * identify the row; every other field is optional — unspecified fields are
 * preserved.
 */
export interface AgentAssignmentPatch {
  agent_key: string;
  is_enabled?: boolean;
  primary_provider?: string;
  primary_model_id?: string;
  primary_config?: AgentModelConfig;
  fallbacks?: AgentFallbackEntry[];
  guardrails?: AgentGuardrails;
  notes?: string | null;
}

/** API response shapes. */
export interface AgentAssignmentsGetResponse {
  assignments: AgentAssignment[];
}

export interface AgentAssignmentPutResponse {
  ok: true;
  assignment: AgentAssignment;
}

export interface AgentAssignmentErrorResponse {
  error: string;
  details?: string;
}
