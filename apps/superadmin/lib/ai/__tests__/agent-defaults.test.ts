/**
 * Structural tests for AGENT_DEFAULTS. These tests guard the invariants
 * the product relies on — future edits to agent-defaults.ts will fail
 * CI if any of these break:
 *
 *   1. Every agent in AI_AGENT_REGISTRY has a factory default.
 *   2. Every default has exactly 3 fallbacks with distinct triggers
 *      (rate_limit, error, cost_over).
 *   3. Every default's max_monthly_usd is 5.
 *   4. Every model ID referenced (primary + fallbacks) exists in
 *      AI_PROVIDERS — i.e. the dropdown will actually show them.
 *   5. getAgentDefault() returns null for unknown keys.
 */

import { AI_AGENT_REGISTRY } from '@/lib/ai/agent-registry';
import { AGENT_DEFAULTS, getAgentDefault } from '@/lib/ai/agent-defaults';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { FallbackTrigger } from '@/lib/types/agent-assignment';

const REQUIRED_TRIGGERS: ReadonlySet<FallbackTrigger> = new Set([
  'rate_limit',
  'error',
  'cost_over',
]);

function buildModelIndex(): Set<string> {
  const set = new Set<string>();
  for (const p of AI_PROVIDERS) {
    for (const m of p.models) {
      set.add(`${p.id}::${m.id}`);
    }
  }
  return set;
}

describe('AGENT_DEFAULTS', () => {
  const modelIndex = buildModelIndex();

  it('covers every agent in AI_AGENT_REGISTRY', () => {
    const missing = AI_AGENT_REGISTRY.filter((a) => !AGENT_DEFAULTS[a.key]).map(
      (a) => a.key,
    );
    expect(missing).toEqual([]);
  });

  it.each(AI_AGENT_REGISTRY.map((a) => [a.key] as const))(
    'default for %s has primary + 3 fallbacks + $5 cap',
    (agentKey) => {
      const def = AGENT_DEFAULTS[agentKey];
      expect(def).toBeDefined();
      expect(def.primary_provider).toBeTruthy();
      expect(def.primary_model_id).toBeTruthy();
      expect(def.fallbacks).toHaveLength(3);
      expect(def.guardrails.max_monthly_usd).toBe(5);
    },
  );

  it.each(AI_AGENT_REGISTRY.map((a) => [a.key] as const))(
    '%s fallbacks cover all three trigger types exactly once',
    (agentKey) => {
      const triggers = AGENT_DEFAULTS[agentKey].fallbacks.map((f) => f.trigger);
      expect(new Set(triggers)).toEqual(REQUIRED_TRIGGERS);
      expect(triggers).toHaveLength(3);
    },
  );

  it.each(AI_AGENT_REGISTRY.map((a) => [a.key] as const))(
    '%s primary and fallback model IDs all exist in AI_PROVIDERS',
    (agentKey) => {
      const def = AGENT_DEFAULTS[agentKey];
      const refs = [
        { provider: def.primary_provider, model: def.primary_model_id },
        ...def.fallbacks.map((f) => ({ provider: f.provider, model: f.model_id })),
      ];
      for (const { provider, model } of refs) {
        const key = `${provider}::${model}`;
        if (!modelIndex.has(key)) {
          throw new Error(
            `Default for agent "${agentKey}" references unknown model "${key}". ` +
              `Update agent-defaults.ts or add the model to lib/ai-providers.ts.`,
          );
        }
      }
    },
  );

  it('getAgentDefault() returns null for unknown agent_key', () => {
    expect(getAgentDefault('not_a_real_agent')).toBeNull();
  });

  it('getAgentDefault() returns the registered default for a valid key', () => {
    const key = AI_AGENT_REGISTRY[0].key;
    const def = getAgentDefault(key);
    expect(def).not.toBeNull();
    expect(def?.primary_provider).toBe(AGENT_DEFAULTS[key].primary_provider);
  });

  it('does not use GPT-5.5 in the transcript audit reviewer chain', () => {
    const audit = AGENT_DEFAULTS.transcript_audit;
    const modelIds = [
      audit.primary_model_id,
      ...audit.fallbacks.map((fallback) => fallback.model_id),
    ];

    expect(audit.primary_provider).toBe('anthropic');
    expect(audit.primary_model_id).toBe('claude-opus-4-5-20251101');
    expect(modelIds).not.toContain('gpt-5.5');
    expect(modelIds).toContain('gpt-5.3-chat-latest');
  });
});
