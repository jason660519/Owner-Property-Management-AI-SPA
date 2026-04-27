/**
 * resolveAgentModel — Phase 2 dispatcher for the "模型選擇與設定" feature.
 *
 * Every server-side LLM call-site should route through this helper instead of
 * hard-coding `(provider, model)` pairs. It returns the ordered chain
 * `[primary, ...fallbacks]` that the caller then walks, swapping to the next
 * link when the current one fails.
 *
 * Data precedence:
 *   1. `ai_agent_model_assignments` row keyed by `agent_key` (global, SSoT)
 *   2. `AGENT_DEFAULTS` from `lib/ai/agent-defaults.ts` (in-memory factory)
 *
 * Legacy module_key compatibility:
 *   The resolver accepts both canonical agent_keys (e.g. `property_description`)
 *   and historical dotted module_keys used by the transcript pipeline
 *   (e.g. `transcript.parse`). See `LEGACY_MODULE_KEY_ALIASES`.
 *
 * What this helper DOES:
 *   - Loads the chain (primary + fallbacks) from DB with in-memory fallback
 *   - Validates `is_enabled` (throws `AgentDisabledError`)
 *   - Canonicalizes legacy module_keys via alias table
 *   - Reports the data source (`'db'` vs `'factory_default'`) for audit logs
 *
 * What this helper does NOT do (intentionally — caller's job):
 *   - Fetch / decrypt API keys
 *   - Enforce guardrails (rate limit, $/month cap) — exposed on the return
 *     value for the caller to evaluate
 *   - Execute the actual LLM call
 *   - Record audit logs
 *
 * This separation keeps the resolver pure and unit-testable with a minimal
 * Supabase mock.
 */

import { VALID_AGENT_KEYS } from '@/lib/ai/agent-registry';
import { AGENT_DEFAULTS } from '@/lib/ai/agent-defaults';
import type {
  AgentAssignment,
  AgentModelConfig,
  AgentGuardrails,
  FallbackTrigger,
} from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidAgentKeyError extends Error {
  constructor(agentKey: string) {
    super(`Unknown agent_key: ${agentKey}`);
    this.name = 'InvalidAgentKeyError';
  }
}

export class AgentDisabledError extends Error {
  constructor(agentKey: string) {
    super(`Agent "${agentKey}" is disabled (is_enabled = false)`);
    this.name = 'AgentDisabledError';
  }
}

// ---------------------------------------------------------------------------
// Return shapes
// ---------------------------------------------------------------------------

export interface ResolvedModelLink {
  provider: string;
  model_id: string;
  config: AgentModelConfig;
  /**
   * `undefined` for the primary link; for fallbacks, the trigger that causes
   * the dispatcher to move to THIS link from the PREVIOUS one.
   */
  trigger?: FallbackTrigger;
}

export type ResolvedSource = 'db' | 'factory_default';

export interface ResolvedAgentModel {
  /** Canonicalized agent key (legacy aliases resolved). */
  agent_key: string;
  source: ResolvedSource;
  /** Primary first, then fallbacks in priority order. */
  chain: ResolvedModelLink[];
  guardrails: AgentGuardrails;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Legacy alias table
// ---------------------------------------------------------------------------

/**
 * Historical module_keys → canonical agent_keys.
 * Extend when migrating more call-sites to the resolver.
 *
 * Two forms appear in the wild:
 *   - Dotted (prompt-safety.ts style): `transcript.parse`, `property.description.default`
 *   - Flat snake_case (ai_modules_assigned_function rows): `online_ocr_parse`,
 *     `online_ocr_judge`, `online_ocr`
 * Both map to the same canonical `agent_key` in `AI_AGENT_REGISTRY`.
 */
export const LEGACY_MODULE_KEY_ALIASES: Readonly<Record<string, string>> = {
  // Dotted forms used by prompt-safety.ts
  'transcript.parse': 'transcript_visual_parse',
  'transcript.judge': 'transcript_audit',
  'transcript.detect_building_count': 'transcript_detection',
  'transcript.detect_land_count': 'transcript_detection',
  'transcript.intake.detail_builder': 'transcript_detail_builder',
  'property.description.default': 'property_description',
  // Flat forms used by run-transcript-parse-core.ts + the superadmin
  // Feature Modules section in ai-providers.ts
  online_ocr_parse: 'transcript_visual_parse',
  online_ocr: 'transcript_visual_parse',
  online_ocr_judge: 'transcript_audit',
};

export function canonicalizeAgentKey(rawKey: string): string {
  return LEGACY_MODULE_KEY_ALIASES[rawKey] ?? rawKey;
}

// ---------------------------------------------------------------------------
// Supabase surface we depend on
// ---------------------------------------------------------------------------

/**
 * Minimal contract the resolver needs. Accepting a loose shape lets the real
 * Supabase admin client (whose `from(...).select(...).eq(...).maybeSingle()`
 * returns a `PostgrestBuilder` thenable — not a full `Promise`) satisfy it,
 * AND lets tests pass a plain object without pulling in the real
 * `SupabaseClient` type.
 *
 * - `from()` accepts `string` (not a literal) so TS doesn't have to reconcile
 *   Supabase's generated per-table union → avoids TS2589.
 * - `maybeSingle()` returns `PromiseLike`, which is all `await` requires.
 */
export interface AgentAssignmentReader {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
}

export interface ResolveOptions {
  supabase: AgentAssignmentReader;
  /**
   * When true, DB read errors are swallowed and the resolver falls through
   * to factory defaults. Default: true (we always want a working chain).
   */
  fallbackOnDbError?: boolean;
}

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

function buildFromAssignment(
  agentKey: string,
  row: AgentAssignment,
): ResolvedAgentModel {
  const chain: ResolvedModelLink[] = [
    {
      provider: row.primary_provider,
      model_id: row.primary_model_id,
      config: row.primary_config ?? {},
    },
    ...row.fallbacks.map((f) => ({
      provider: f.provider,
      model_id: f.model_id,
      config: f.config ?? {},
      trigger: f.trigger,
    })),
  ];
  return {
    agent_key: agentKey,
    source: 'db',
    chain,
    guardrails: row.guardrails ?? {},
    notes: row.notes ?? null,
  };
}

function buildFromFactoryDefault(agentKey: string): ResolvedAgentModel {
  const def = AGENT_DEFAULTS[agentKey];
  if (!def) {
    // Should never happen: VALID_AGENT_KEYS and AGENT_DEFAULTS are both
    // derived from AI_AGENT_REGISTRY, and agent-defaults.test.ts enforces
    // the invariant. Still throw for safety.
    throw new InvalidAgentKeyError(agentKey);
  }
  return {
    agent_key: agentKey,
    source: 'factory_default',
    chain: [
      {
        provider: def.primary_provider,
        model_id: def.primary_model_id,
        config: def.primary_config,
      },
      ...def.fallbacks.map((f) => ({
        provider: f.provider,
        model_id: f.model_id,
        config: f.config ?? {},
        trigger: f.trigger,
      })),
    ],
    guardrails: def.guardrails,
    notes: def.notes,
  };
}

/**
 * Resolve a canonical agent key (or a legacy module_key) to its ordered
 * fallback chain. See the module-level docstring for semantics.
 */
export async function resolveAgentModel(
  rawAgentKey: string,
  options: ResolveOptions,
): Promise<ResolvedAgentModel> {
  const agentKey = canonicalizeAgentKey(rawAgentKey);
  if (!VALID_AGENT_KEYS.has(agentKey)) {
    throw new InvalidAgentKeyError(rawAgentKey);
  }

  const fallbackOnDbError = options.fallbackOnDbError ?? true;

  let dbRow: AgentAssignment | null = null;
  try {
    const { data, error } = await options.supabase
      .from('ai_agent_model_assignments')
      .select('*')
      .eq('agent_key', agentKey)
      .maybeSingle();

    if (error) {
      if (!fallbackOnDbError) throw error;
      console.warn(
        `[resolveAgentModel] DB read failed for agent_key=${agentKey}; falling back to factory defaults`,
        error,
      );
    } else if (data && typeof data === 'object') {
      dbRow = data as AgentAssignment;
    }
  } catch (err) {
    if (!fallbackOnDbError) throw err;
    console.warn(
      `[resolveAgentModel] exception reading DB for agent_key=${agentKey}; falling back`,
      err,
    );
  }

  if (dbRow) {
    if (dbRow.is_enabled === false) {
      throw new AgentDisabledError(agentKey);
    }
    return buildFromAssignment(agentKey, dbRow);
  }

  return buildFromFactoryDefault(agentKey);
}

/**
 * Convenience for callers that previously used a list of module_keys as a
 * precedence chain (e.g. property-description/stream used
 * `['property_description', 'blog_generator']`). Tries each key in order,
 * returning the first one that resolves successfully. Disabled agents and
 * unknown keys are skipped; an exception is thrown only if all candidates
 * fail.
 */
export async function resolveFirstAgentModel(
  candidateKeys: readonly string[],
  options: ResolveOptions,
): Promise<ResolvedAgentModel> {
  const errors: string[] = [];
  for (const key of candidateKeys) {
    try {
      return await resolveAgentModel(key, options);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      errors.push(`${key} → ${msg}`);
    }
  }
  throw new Error(
    `resolveFirstAgentModel: all candidates failed: ${errors.join('; ')}`,
  );
}
