/**
 * Phase 2.5: static (non-budget) guardrail filters for the resolved
 * agent model chain.
 *
 * The resolver (`resolveAgentModel`) returns every chain link the admin
 * configured, plus any factory defaults. Some of those links may be
 * disallowed by the agent's guardrails — this module filters them out
 * BEFORE the caller walks the chain.
 *
 * Two filters are implemented:
 *
 *   1. `applyForbidProviders` — strip any link whose provider appears in
 *      `guardrails.forbid_providers`. This is the "never call OpenAI for
 *      this agent" style rule.
 *
 *   2. `applyRequireTags` — strip any link whose model does NOT carry ALL
 *      `guardrails.require_tags`. This enforces, e.g., "every model used
 *      for contract_assistant must be tagged legal_contract". It needs
 *      role-catalog data (a map from `provider::model_id` → tag_keys[]),
 *      which the caller must fetch and pass in.
 *
 * `sanitizeChain` runs both filters in one pass and reports which links
 * were dropped + why, so callers can surface meaningful error messages
 * when every link has been filtered out.
 */

import type {
  AgentGuardrails,
  AgentModelConfig,
  FallbackTrigger,
} from '@/lib/types/agent-assignment';
import type { ResolvedModelLink } from '@/lib/ai/resolve-agent-model';

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

/**
 * Map from `${provider}::${model_id}` → tag_keys[], used by
 * `applyRequireTags` to answer "does this model carry all required tags?".
 * Callers typically build it by reading `ai_model_role_assignments`.
 */
export type ModelTagIndex = ReadonlyMap<string, ReadonlySet<string>>;

export interface SanitizeChainInput {
  chain: readonly ResolvedModelLink[];
  guardrails: AgentGuardrails;
  /** Required only when `guardrails.require_tags` is non-empty. */
  tagIndex?: ModelTagIndex;
}

export type DropReason = 'forbidden_provider' | 'missing_required_tag';

export interface DroppedLink {
  /** Index in the ORIGINAL chain (not the filtered one). */
  index: number;
  link: ResolvedModelLink;
  reason: DropReason;
  /** For `missing_required_tag`: the specific tags that were missing. */
  missingTags?: string[];
}

export interface SanitizeChainResult {
  allowed: ResolvedModelLink[];
  dropped: DroppedLink[];
}

// ---------------------------------------------------------------------------
// Individual filters (exported so callers can use them alone)
// ---------------------------------------------------------------------------

export function applyForbidProviders(
  chain: readonly ResolvedModelLink[],
  forbidProviders: readonly string[] | undefined,
): SanitizeChainResult {
  if (!forbidProviders || forbidProviders.length === 0) {
    return { allowed: [...chain], dropped: [] };
  }
  const forbidden = new Set(forbidProviders);
  const allowed: ResolvedModelLink[] = [];
  const dropped: DroppedLink[] = [];
  chain.forEach((link, index) => {
    if (forbidden.has(link.provider)) {
      dropped.push({ index, link, reason: 'forbidden_provider' });
    } else {
      allowed.push(link);
    }
  });
  return { allowed, dropped };
}

export function applyRequireTags(
  chain: readonly ResolvedModelLink[],
  requireTags: readonly string[] | undefined,
  tagIndex: ModelTagIndex | undefined,
): SanitizeChainResult {
  if (!requireTags || requireTags.length === 0) {
    return { allowed: [...chain], dropped: [] };
  }
  // If the caller didn't provide a tag index we cannot evaluate the rule —
  // be strict: drop everything with a clear reason so the caller realises
  // it needs to supply a tagIndex.
  if (!tagIndex) {
    return {
      allowed: [],
      dropped: chain.map((link, index) => ({
        index,
        link,
        reason: 'missing_required_tag',
        missingTags: [...requireTags],
      })),
    };
  }
  const allowed: ResolvedModelLink[] = [];
  const dropped: DroppedLink[] = [];
  chain.forEach((link, index) => {
    const key = `${link.provider}::${link.model_id}`;
    const tags = tagIndex.get(key) ?? new Set<string>();
    const missing = requireTags.filter((t) => !tags.has(t));
    if (missing.length > 0) {
      dropped.push({ index, link, reason: 'missing_required_tag', missingTags: missing });
    } else {
      allowed.push(link);
    }
  });
  return { allowed, dropped };
}

// ---------------------------------------------------------------------------
// Composite sanitizer
// ---------------------------------------------------------------------------

/**
 * Run every relevant guardrail filter in sequence and return a single
 * combined result. Filters are applied in this order:
 *   1. forbid_providers
 *   2. require_tags
 *
 * Dropped-link indices refer to the INPUT chain (pre-filter) so caller
 * error messages can reference the original positions.
 *
 * The primary link's `trigger` is always `undefined`; fallbacks keep
 * their original triggers. `sanitizeChain` does NOT reassign triggers if
 * the primary gets dropped — it's a pure filter, and the caller decides
 * whether the resulting head is still usable.
 */
export function sanitizeChain(input: SanitizeChainInput): SanitizeChainResult {
  const step1 = applyForbidProviders(input.chain, input.guardrails.forbid_providers);
  const step2 = applyRequireTags(
    step1.allowed,
    input.guardrails.require_tags,
    input.tagIndex,
  );
  // step2.dropped indices reference positions within step1.allowed (the
  // filtered intermediate), but callers need indices in the ORIGINAL chain.
  // Re-project by looking each dropped link back up in the input chain.
  const projectedStep2Dropped: DroppedLink[] = step2.dropped.map((d) => ({
    ...d,
    index: input.chain.indexOf(d.link),
  }));

  return {
    allowed: step2.allowed,
    dropped: [...step1.dropped, ...projectedStep2Dropped].sort(
      (a, b) => a.index - b.index,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tiny type re-exports so callers don't need to import from multiple modules
// ---------------------------------------------------------------------------

export type { AgentGuardrails, AgentModelConfig, FallbackTrigger };
