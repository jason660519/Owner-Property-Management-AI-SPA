/**
 * Tests for lib/ai/agent-cost-guard.ts
 *
 * Covers:
 *   - computeCostUsd for known/unknown provider-model pairs
 *   - startOfCurrentMonthUtc boundary
 *   - legacyKeysForAgent reverse lookup (incl. transcript_visual_parse → 3 aliases)
 *   - getAgentMonthlySpendUsd: DB shape, error swallowing, aggregation across legacy keys
 *   - evaluateMonthlyCap: boundary (equal / over / under / cap=0 / cap=undefined)
 *   - checkAgentBudget end-to-end
 */

import {
  computeCostUsd,
  startOfCurrentMonthUtc,
  legacyKeysForAgent,
  getAgentMonthlySpendUsd,
  evaluateMonthlyCap,
  checkAgentBudget,
  selectAffordableLink,
  estimateChainCosts,
  type AuditLogReader,
  type LinkCostEstimate,
} from '@/lib/ai/agent-cost-guard';
import type { AgentGuardrails } from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// computeCostUsd
// ---------------------------------------------------------------------------

describe('computeCostUsd', () => {
  it('computes USD for a known provider/model using AI_PROVIDERS pricing', () => {
    // gpt-4o is priced at $2.50 / 1M input, $10.00 / 1M output.
    // 100,000 input + 50,000 output → 0.1*2.5 + 0.05*10 = 0.25 + 0.50 = $0.75
    const cost = computeCostUsd('openai', 'gpt-4o', 100_000, 50_000);
    expect(cost).toBeCloseTo(0.75, 6);
  });

  it('returns 0 for unknown (provider, model_id) pairs and warns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(computeCostUsd('fake', 'no-such-model', 1000, 1000)).toBe(0);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('returns 0 for zero tokens without warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(computeCostUsd('fake', 'no-such-model', 0, 0)).toBe(0);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('clamps negative token counts to 0', () => {
    expect(computeCostUsd('openai', 'gpt-4o', -50, -20)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// startOfCurrentMonthUtc
// ---------------------------------------------------------------------------

describe('startOfCurrentMonthUtc', () => {
  it('returns midnight UTC of the 1st of the given month', () => {
    const ref = new Date('2026-04-12T15:37:22.123Z');
    const start = startOfCurrentMonthUtc(ref);
    expect(start.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('defaults to "now" when no date passed', () => {
    const start = startOfCurrentMonthUtc();
    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// legacyKeysForAgent
// ---------------------------------------------------------------------------

describe('legacyKeysForAgent', () => {
  it('includes the canonical key itself', () => {
    const keys = legacyKeysForAgent('property_description');
    expect(keys).toContain('property_description');
  });

  it('includes all legacy aliases that map to transcript_visual_parse', () => {
    const keys = legacyKeysForAgent('transcript_visual_parse');
    // Canonical + three legacy aliases (transcript.parse, online_ocr_parse, online_ocr)
    expect(keys).toEqual(
      expect.arrayContaining([
        'transcript_visual_parse',
        'transcript.parse',
        'online_ocr_parse',
        'online_ocr',
      ]),
    );
    expect(keys).toHaveLength(4);
  });

  it('returns just the canonical key when no aliases exist', () => {
    const keys = legacyKeysForAgent('ad_generator');
    expect(keys).toEqual(['ad_generator']);
  });
});

// ---------------------------------------------------------------------------
// getAgentMonthlySpendUsd — DB mock
// ---------------------------------------------------------------------------

interface MockAuditConfig {
  rows?: Array<{
    provider: string;
    model_id: string;
    input_tokens: number | null;
    output_tokens: number | null;
  }>;
  error?: unknown;
  capturedOrFilter?: { value: string };
  capturedGteValue?: { value: string };
}

function makeAuditReader(config: MockAuditConfig): AuditLogReader {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // Shared terminal chain so both the .in() and .or() paths resolve to the
  // same eq() predicate — keeps the mock focused on what the test asserts.
  const makeGteEq = () => ({
    gte: (_col2: string, value: string) => {
      if (config.capturedGteValue) config.capturedGteValue.value = value;
      return {
        eq: async (_col3: string, _value: string) => {
          if (config.error) return { data: null, error: config.error };
          return { data: config.rows ?? [], error: null };
        },
      };
    },
  });

  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        in: (_col: string, _values: string[]) => makeGteEq(),
        or: (filters: string) => {
          if (config.capturedOrFilter) config.capturedOrFilter.value = filters;
          return makeGteEq();
        },
      }),
    }),
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

describe('getAgentMonthlySpendUsd', () => {
  it('sums USD across audit rows and returns a correct total', async () => {
    // Two rows: gpt-4o + claude-3-5-haiku (priced at $0.80/$4.00)
    //   Row 1: gpt-4o / 200k in, 100k out → 0.2*2.5 + 0.1*10 = 0.5 + 1 = $1.50
    //   Row 2: claude-3-5-haiku / 1M in, 500k out → 1*0.8 + 0.5*4 = 0.8 + 2 = $2.80
    // Total = $4.30
    const supabase = makeAuditReader({
      rows: [
        { provider: 'openai', model_id: 'gpt-4o', input_tokens: 200_000, output_tokens: 100_000 },
        {
          provider: 'anthropic',
          model_id: 'claude-3-5-haiku-20241022',
          input_tokens: 1_000_000,
          output_tokens: 500_000,
        },
      ],
    });
    const total = await getAgentMonthlySpendUsd(supabase, 'property_description');
    expect(total).toBeCloseTo(4.3, 6);
  });

  it('builds an .or() filter that matches both the canonical agent_key and every legacy module_key', async () => {
    const capturedOrFilter = { value: '' };
    const supabase = makeAuditReader({ rows: [], capturedOrFilter });
    await getAgentMonthlySpendUsd(supabase, 'transcript_visual_parse');

    // Phase 2.5 rows: agent_key column.
    expect(capturedOrFilter.value).toContain('agent_key.eq.transcript_visual_parse');
    // Phase 1 rows: legacy module_key values.
    expect(capturedOrFilter.value).toContain('module_key.in.');
    expect(capturedOrFilter.value).toContain('transcript_visual_parse');
    expect(capturedOrFilter.value).toContain('transcript.parse');
    expect(capturedOrFilter.value).toContain('online_ocr_parse');
    expect(capturedOrFilter.value).toContain('online_ocr');
  });

  it('uses the start of the current month as the gte lower bound', async () => {
    const captured = { value: '' };
    const supabase = makeAuditReader({ rows: [], capturedGteValue: captured });
    const monthStart = new Date('2026-04-01T00:00:00.000Z');
    await getAgentMonthlySpendUsd(supabase, 'property_description', { monthStart });
    expect(captured.value).toBe('2026-04-01T00:00:00.000Z');
  });

  it('swallows DB errors and returns 0 by default', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const supabase = makeAuditReader({ error: new Error('db down') });
      const total = await getAgentMonthlySpendUsd(supabase, 'property_description');
      expect(total).toBe(0);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('rethrows DB errors when fallbackOnDbError=false', async () => {
    const supabase = makeAuditReader({ error: new Error('db down') });
    await expect(
      getAgentMonthlySpendUsd(supabase, 'property_description', {
        fallbackOnDbError: false,
      }),
    ).rejects.toThrow('db down');
  });
});

// ---------------------------------------------------------------------------
// evaluateMonthlyCap
// ---------------------------------------------------------------------------

describe('evaluateMonthlyCap', () => {
  const caps = (max: number | undefined): AgentGuardrails => ({ max_monthly_usd: max });

  it('allows all spend when max_monthly_usd is undefined', () => {
    const v = evaluateMonthlyCap(100, caps(undefined));
    expect(v.allowed).toBe(true);
    expect(v.capUsd).toBeNull();
  });

  it('allows all spend when max_monthly_usd is 0', () => {
    const v = evaluateMonthlyCap(100, caps(0));
    expect(v.allowed).toBe(true);
    expect(v.capUsd).toBeNull();
  });

  it('allows when spent is strictly below cap', () => {
    const v = evaluateMonthlyCap(4.99, caps(5));
    expect(v.allowed).toBe(true);
  });

  it('blocks when spent equals cap', () => {
    const v = evaluateMonthlyCap(5, caps(5));
    expect(v.allowed).toBe(false);
    expect(v.reason).toBe('monthly_cap_exceeded');
  });

  it('blocks when spent exceeds cap', () => {
    const v = evaluateMonthlyCap(5.01, caps(5));
    expect(v.allowed).toBe(false);
    expect(v.reason).toBe('monthly_cap_exceeded');
  });
});

// ---------------------------------------------------------------------------
// checkAgentBudget end-to-end
// ---------------------------------------------------------------------------

describe('checkAgentBudget', () => {
  it('combines DB query + cap evaluation into a single verdict', async () => {
    // One audit row that sums to exactly $5 against a cap of $5 → blocked.
    const supabase = makeAuditReader({
      rows: [
        {
          provider: 'openai',
          model_id: 'gpt-4o',
          input_tokens: 2_000_000, // $5.00 input = 2M * $2.50/1M
          output_tokens: 0,
        },
      ],
    });
    const verdict = await checkAgentBudget(supabase, 'contract_assistant', {
      max_monthly_usd: 5,
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.spentUsd).toBeCloseTo(5, 6);
    expect(verdict.capUsd).toBe(5);
    expect(verdict.reason).toBe('monthly_cap_exceeded');
  });

  it('allows when spend is comfortably under cap', async () => {
    const supabase = makeAuditReader({
      rows: [
        { provider: 'openai', model_id: 'gpt-4o-mini', input_tokens: 10_000, output_tokens: 5_000 },
      ],
    });
    const verdict = await checkAgentBudget(supabase, 'contract_assistant', {
      max_monthly_usd: 5,
    });
    expect(verdict.allowed).toBe(true);
    expect(verdict.spentUsd).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// selectAffordableLink (Phase 2.5+ cost-aware fallback walker)
// ---------------------------------------------------------------------------

describe('selectAffordableLink', () => {
  const chain = [
    { provider: 'anthropic', model_id: 'claude-opus-4-20250514' },
    { provider: 'openai', model_id: 'gpt-4o' },
    { provider: 'openai', model_id: 'gpt-4o-mini' },
  ];

  const estimates: LinkCostEstimate[] = [
    { provider: 'anthropic', model_id: 'claude-opus-4-20250514', estimateUsd: 3.0 },
    { provider: 'openai', model_id: 'gpt-4o', estimateUsd: 1.0 },
    { provider: 'openai', model_id: 'gpt-4o-mini', estimateUsd: 0.05 },
  ];

  it('returns the first link whose estimate fits into the remaining budget', () => {
    // cap $5, spent $1 → remaining $4. Primary costs $3 → fits.
    const pick = selectAffordableLink(chain, {
      spentUsd: 1,
      capUsd: 5,
      estimates,
    });
    expect(pick).not.toBeNull();
    expect(pick!.index).toBe(0);
    expect(pick!.link.model_id).toBe('claude-opus-4-20250514');
    expect(pick!.skipped).toEqual([]);
    expect(pick!.estimatedUsd).toBeCloseTo(3.0);
    expect(pick!.remainingUsd).toBeCloseTo(4.0);
  });

  it('skips the primary when it would blow the budget and falls through', () => {
    // cap $5, spent $3 → remaining $2. Opus ($3) > $2 → skip. GPT-4o ($1) → fits.
    const pick = selectAffordableLink(chain, {
      spentUsd: 3,
      capUsd: 5,
      estimates,
    });
    expect(pick).not.toBeNull();
    expect(pick!.index).toBe(1);
    expect(pick!.link.model_id).toBe('gpt-4o');
    expect(pick!.skipped).toEqual([0]);
  });

  it('walks all the way down to the cheapest link when the budget is nearly depleted', () => {
    // cap $5, spent $4.5 → remaining $0.5. Opus/gpt-4o both too expensive → mini ($0.05) wins.
    const pick = selectAffordableLink(chain, {
      spentUsd: 4.5,
      capUsd: 5,
      estimates,
    });
    expect(pick!.index).toBe(2);
    expect(pick!.link.model_id).toBe('gpt-4o-mini');
    expect(pick!.skipped).toEqual([0, 1]);
  });

  it('returns null when no link fits', () => {
    // cap $5, spent $4.99 → remaining $0.01. Every link > $0.01 → null.
    const pick = selectAffordableLink(chain, {
      spentUsd: 4.99,
      capUsd: 5,
      estimates,
    });
    expect(pick).toBeNull();
  });

  it('always returns the primary when capUsd is null (no cap)', () => {
    const pick = selectAffordableLink(chain, {
      spentUsd: 9999,
      capUsd: null,
      estimates,
    });
    expect(pick!.index).toBe(0);
    expect(pick!.remainingUsd).toBeNull();
  });

  it('treats missing estimates as 0 cost (worst case: every link is free)', () => {
    const pick = selectAffordableLink(chain, {
      spentUsd: 5,
      capUsd: 5,
      estimates: [], // nothing known → every link estimated at 0
    });
    // spent ($5) + 0 = 5 ≤ cap 5 → primary allowed
    expect(pick!.index).toBe(0);
  });
});

describe('estimateChainCosts', () => {
  it('builds per-link estimates for a uniform prompt shape', () => {
    const chain = [
      { provider: 'openai', model_id: 'gpt-4o' },
      { provider: 'openai', model_id: 'gpt-4o-mini' },
    ];
    // 100k prompt + 10k output
    // gpt-4o: 0.1 * 2.50 + 0.01 * 10 = 0.25 + 0.10 = 0.35
    // gpt-4o-mini: 0.1 * 0.15 + 0.01 * 0.60 = 0.015 + 0.006 = 0.021
    const out = estimateChainCosts(chain, 100_000, 10_000);
    expect(out).toHaveLength(2);
    expect(out[0].estimateUsd).toBeCloseTo(0.35, 6);
    expect(out[1].estimateUsd).toBeCloseTo(0.021, 6);
  });
});
