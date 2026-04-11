/**
 * Unit tests for lib/ai/agent-guardrail-filters.ts
 *
 * Covers:
 *   - applyForbidProviders (empty guardrail, match, no-match)
 *   - applyRequireTags (empty, all tags present, missing tag, missing index)
 *   - sanitizeChain composite: both filters + correct original-index mapping
 *     after the two-step pipeline
 */

import {
  applyForbidProviders,
  applyRequireTags,
  sanitizeChain,
  type ModelTagIndex,
} from '@/lib/ai/agent-guardrail-filters';
import type { ResolvedModelLink } from '@/lib/ai/resolve-agent-model';
import type { AgentGuardrails } from '@/lib/types/agent-assignment';

const CHAIN: ResolvedModelLink[] = [
  {
    provider: 'anthropic',
    model_id: 'claude-opus-4-20250514',
    config: { temperature: 0.2, max_tokens: 8192 },
  },
  {
    provider: 'openai',
    model_id: 'gpt-4o',
    config: {},
    trigger: 'rate_limit',
  },
  {
    provider: 'gemini',
    model_id: 'gemini-1.5-pro',
    config: {},
    trigger: 'error',
  },
  {
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-20250514',
    config: {},
    trigger: 'cost_over',
  },
];

// ---------------------------------------------------------------------------
// applyForbidProviders
// ---------------------------------------------------------------------------

describe('applyForbidProviders', () => {
  it('returns the full chain when forbidProviders is undefined', () => {
    const res = applyForbidProviders(CHAIN, undefined);
    expect(res.allowed).toEqual(CHAIN);
    expect(res.dropped).toEqual([]);
  });

  it('returns the full chain when forbidProviders is empty', () => {
    const res = applyForbidProviders(CHAIN, []);
    expect(res.allowed).toEqual(CHAIN);
    expect(res.dropped).toEqual([]);
  });

  it('drops every link whose provider is in the forbidden set', () => {
    const res = applyForbidProviders(CHAIN, ['anthropic']);
    expect(res.allowed.map((l) => l.provider)).toEqual(['openai', 'gemini']);
    expect(res.dropped.map((d) => d.index)).toEqual([0, 3]);
    for (const d of res.dropped) {
      expect(d.reason).toBe('forbidden_provider');
    }
  });

  it('returns an empty allowed list when every link is forbidden', () => {
    const res = applyForbidProviders(CHAIN, ['anthropic', 'openai', 'gemini']);
    expect(res.allowed).toEqual([]);
    expect(res.dropped).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// applyRequireTags
// ---------------------------------------------------------------------------

describe('applyRequireTags', () => {
  // Tag index: opus has legal_contract; gpt-4o has legal_contract + general
  const tagIndex: ModelTagIndex = new Map([
    [
      'anthropic::claude-opus-4-20250514',
      new Set(['legal_contract', 'long_context']),
    ],
    ['openai::gpt-4o', new Set(['legal_contract', 'general'])],
    ['gemini::gemini-1.5-pro', new Set(['general'])],
  ]);

  it('returns the full chain when requireTags is undefined', () => {
    const res = applyRequireTags(CHAIN, undefined, tagIndex);
    expect(res.allowed).toEqual(CHAIN);
    expect(res.dropped).toEqual([]);
  });

  it('returns the full chain when requireTags is empty', () => {
    const res = applyRequireTags(CHAIN, [], tagIndex);
    expect(res.allowed).toEqual(CHAIN);
    expect(res.dropped).toEqual([]);
  });

  it('drops links missing any of the required tags', () => {
    const res = applyRequireTags(CHAIN, ['legal_contract'], tagIndex);
    // opus + gpt-4o carry legal_contract; gemini doesn't; sonnet isn't in the index
    expect(res.allowed.map((l) => l.model_id)).toEqual([
      'claude-opus-4-20250514',
      'gpt-4o',
    ]);
    expect(res.dropped.map((d) => d.link.model_id)).toEqual([
      'gemini-1.5-pro',
      'claude-sonnet-4-20250514',
    ]);
    for (const d of res.dropped) {
      expect(d.reason).toBe('missing_required_tag');
      expect(d.missingTags).toEqual(['legal_contract']);
    }
  });

  it('handles multi-tag requirements (ALL must be present)', () => {
    const res = applyRequireTags(
      CHAIN,
      ['legal_contract', 'long_context'],
      tagIndex,
    );
    // Only opus has BOTH
    expect(res.allowed.map((l) => l.model_id)).toEqual(['claude-opus-4-20250514']);
  });

  it('drops everything when no tagIndex is provided and requireTags is non-empty', () => {
    const res = applyRequireTags(CHAIN, ['legal_contract'], undefined);
    expect(res.allowed).toEqual([]);
    expect(res.dropped).toHaveLength(4);
    for (const d of res.dropped) {
      expect(d.missingTags).toEqual(['legal_contract']);
    }
  });
});

// ---------------------------------------------------------------------------
// sanitizeChain composite
// ---------------------------------------------------------------------------

describe('sanitizeChain', () => {
  const tagIndex: ModelTagIndex = new Map([
    ['anthropic::claude-opus-4-20250514', new Set(['legal_contract'])],
    ['openai::gpt-4o', new Set(['legal_contract'])],
    ['gemini::gemini-1.5-pro', new Set(['legal_contract'])],
    ['anthropic::claude-sonnet-4-20250514', new Set(['legal_contract'])],
  ]);

  it('is a no-op when both guardrails are empty', () => {
    const guardrails: AgentGuardrails = {};
    const res = sanitizeChain({ chain: CHAIN, guardrails });
    expect(res.allowed).toEqual(CHAIN);
    expect(res.dropped).toEqual([]);
  });

  it('applies forbid_providers AND require_tags in sequence', () => {
    const guardrails: AgentGuardrails = {
      forbid_providers: ['gemini'],
      require_tags: ['legal_contract'],
    };
    const res = sanitizeChain({ chain: CHAIN, guardrails, tagIndex });
    // Gemini dropped by forbid_providers. All three anthropic/openai links
    // carry legal_contract → all survive.
    expect(res.allowed.map((l) => l.model_id)).toEqual([
      'claude-opus-4-20250514',
      'gpt-4o',
      'claude-sonnet-4-20250514',
    ]);
    // The one dropped link should have the correct ORIGINAL index (2) AND
    // the correct reason.
    expect(res.dropped).toHaveLength(1);
    expect(res.dropped[0].index).toBe(2);
    expect(res.dropped[0].reason).toBe('forbidden_provider');
  });

  it('tracks original-chain indices even when earlier filters removed links', () => {
    // Narrow tagIndex so only sonnet (index 3 in original) survives tags.
    const narrowTagIndex: ModelTagIndex = new Map([
      ['anthropic::claude-sonnet-4-20250514', new Set(['legal_contract'])],
    ]);
    const guardrails: AgentGuardrails = {
      forbid_providers: ['gemini'],
      require_tags: ['legal_contract'],
    };
    const res = sanitizeChain({ chain: CHAIN, guardrails, tagIndex: narrowTagIndex });
    expect(res.allowed.map((l) => l.model_id)).toEqual(['claude-sonnet-4-20250514']);
    // Dropped indices should be 0 (opus: missing tag), 1 (gpt-4o: missing tag),
    // 2 (gemini: forbidden provider) — in original-chain order.
    expect(res.dropped.map((d) => d.index)).toEqual([0, 1, 2]);
    // Verify each reason is correctly attributed.
    expect(res.dropped[0].reason).toBe('missing_required_tag');
    expect(res.dropped[1].reason).toBe('missing_required_tag');
    expect(res.dropped[2].reason).toBe('forbidden_provider');
  });
});
