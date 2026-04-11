/**
 * Unit tests for lib/ai/resolve-agent-model.ts
 *
 * These exercise:
 *   - Happy path: DB row → chain (primary + 3 fallbacks) with `source='db'`
 *   - Factory fallback: missing row → `AGENT_DEFAULTS` with `source='factory_default'`
 *   - Invalid agent_key → `InvalidAgentKeyError`
 *   - Disabled agent → `AgentDisabledError`
 *   - Legacy module_key aliases (transcript.parse → transcript_visual_parse)
 *   - DB error swallowed by default, rethrown when fallbackOnDbError=false
 *   - resolveFirstAgentModel: precedence chain + all-failed error
 */

import {
  resolveAgentModel,
  resolveFirstAgentModel,
  canonicalizeAgentKey,
  LEGACY_MODULE_KEY_ALIASES,
  InvalidAgentKeyError,
  AgentDisabledError,
  type AgentAssignmentReader,
} from '@/lib/ai/resolve-agent-model';
import type { AgentAssignment } from '@/lib/types/agent-assignment';
import { AGENT_DEFAULTS } from '@/lib/ai/agent-defaults';

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

interface MockConfig {
  /** Rows keyed by agent_key — the mock returns whichever matches the .eq() arg. */
  rows?: Record<string, AgentAssignment>;
  /** When set, .maybeSingle() returns { data: null, error } to simulate a DB error. */
  error?: unknown;
  /** Spy — the arguments passed to .eq() so tests can assert. */
  eqCalls?: Array<{ column: string; value: string }>;
}

function makeMockReader(config: MockConfig): AgentAssignmentReader {
  const eqCalls = config.eqCalls ?? [];
  const tableCalls: string[] = [];
  const reader: AgentAssignmentReader = {
    from: (table) => {
      tableCalls.push(table);
      return {
        select: (_cols: string) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
          eq: (column, value) => {
            eqCalls.push({ column, value });
            return {
              maybeSingle: async () => {
                if (config.error) return { data: null, error: config.error };
                const row = config.rows?.[value] ?? null;
                return { data: row, error: null };
              },
            };
          },
        }),
      };
    },
  };
  // Expose the table-name log so tests can assert on the same call.
  (reader as unknown as { tableCalls: string[] }).tableCalls = tableCalls;
  return reader;
}

// ---------------------------------------------------------------------------
// Fixture rows
// ---------------------------------------------------------------------------

const contractRow: AgentAssignment = {
  id: 'row-contract',
  agent_key: 'contract_assistant',
  is_enabled: true,
  primary_provider: 'anthropic',
  primary_model_id: 'claude-opus-4-20250514',
  primary_config: { temperature: 0.2, max_tokens: 8192 },
  fallbacks: [
    { provider: 'openai', model_id: 'gpt-4o', trigger: 'rate_limit', config: {} },
    { provider: 'gemini', model_id: 'gemini-1.5-pro', trigger: 'error', config: {} },
    {
      provider: 'anthropic',
      model_id: 'claude-sonnet-4-20250514',
      trigger: 'cost_over',
      config: {},
    },
  ],
  guardrails: { max_monthly_usd: 5 },
  notes: 'DB-stored note',
  updated_by: null,
  updated_at: '2026-04-12T00:00:00Z',
  created_at: '2026-04-12T00:00:00Z',
};

const disabledRow: AgentAssignment = {
  ...contractRow,
  id: 'row-disabled',
  is_enabled: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAgentModel', () => {
  it('returns a db-sourced chain for an existing assignment row', async () => {
    const supabase = makeMockReader({ rows: { contract_assistant: contractRow } });
    const res = await resolveAgentModel('contract_assistant', { supabase });

    expect(res.source).toBe('db');
    expect(res.agent_key).toBe('contract_assistant');
    expect(res.chain).toHaveLength(4);
    expect(res.chain[0]).toEqual({
      provider: 'anthropic',
      model_id: 'claude-opus-4-20250514',
      config: { temperature: 0.2, max_tokens: 8192 },
    });
    expect(res.chain[1].trigger).toBe('rate_limit');
    expect(res.chain[2].trigger).toBe('error');
    expect(res.chain[3].trigger).toBe('cost_over');
    expect(res.guardrails).toEqual({ max_monthly_usd: 5 });
    expect(res.notes).toBe('DB-stored note');
  });

  it('falls back to AGENT_DEFAULTS when no DB row exists', async () => {
    const supabase = makeMockReader({ rows: {} });
    const res = await resolveAgentModel('property_description', { supabase });

    expect(res.source).toBe('factory_default');
    const def = AGENT_DEFAULTS.property_description;
    expect(res.chain[0].provider).toBe(def.primary_provider);
    expect(res.chain[0].model_id).toBe(def.primary_model_id);
    expect(res.chain).toHaveLength(1 + def.fallbacks.length);
  });

  it('throws InvalidAgentKeyError for an unknown key', async () => {
    const supabase = makeMockReader({ rows: {} });
    await expect(
      resolveAgentModel('not_a_real_agent', { supabase }),
    ).rejects.toBeInstanceOf(InvalidAgentKeyError);
  });

  it('throws AgentDisabledError when is_enabled === false', async () => {
    const supabase = makeMockReader({ rows: { contract_assistant: disabledRow } });
    await expect(
      resolveAgentModel('contract_assistant', { supabase }),
    ).rejects.toBeInstanceOf(AgentDisabledError);
  });

  it('canonicalizes legacy module_keys before resolution', async () => {
    const eqCalls: Array<{ column: string; value: string }> = [];
    // The DB query should hit 'transcript_visual_parse', not 'transcript.parse'.
    const supabase = makeMockReader({ eqCalls, rows: {} });
    const res = await resolveAgentModel('transcript.parse', { supabase });

    expect(eqCalls).toHaveLength(1);
    expect(eqCalls[0]).toEqual({ column: 'agent_key', value: 'transcript_visual_parse' });
    expect(res.agent_key).toBe('transcript_visual_parse');
    expect(res.source).toBe('factory_default');
  });

  it('swallows DB errors and falls through to factory defaults by default', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const supabase = makeMockReader({ error: new Error('db timeout') });
      const res = await resolveAgentModel('contract_assistant', { supabase });
      expect(res.source).toBe('factory_default');
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('rethrows DB errors when fallbackOnDbError=false', async () => {
    const supabase = makeMockReader({ error: new Error('db timeout') });
    await expect(
      resolveAgentModel('contract_assistant', { supabase, fallbackOnDbError: false }),
    ).rejects.toThrow('db timeout');
  });
});

describe('canonicalizeAgentKey', () => {
  it('maps every entry in LEGACY_MODULE_KEY_ALIASES to a canonical key', () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_MODULE_KEY_ALIASES)) {
      expect(canonicalizeAgentKey(legacy)).toBe(canonical);
    }
  });

  it('passes through unknown keys unchanged', () => {
    expect(canonicalizeAgentKey('property_description')).toBe('property_description');
    expect(canonicalizeAgentKey('anything_new')).toBe('anything_new');
  });
});

describe('resolveFirstAgentModel', () => {
  it('returns the first successful resolution', async () => {
    const supabase = makeMockReader({
      rows: { blog_generator: { ...contractRow, agent_key: 'blog_generator' } },
    });
    // property_description has no row → falls through to factory default.
    // But factory default is still a valid resolution, so the first candidate
    // will actually resolve via factory default. To test the skip-on-error
    // path we need a candidate that throws.
    const res = await resolveFirstAgentModel(
      ['not_a_real_agent', 'property_description'],
      { supabase },
    );
    expect(res.agent_key).toBe('property_description');
  });

  it('throws when every candidate fails', async () => {
    const supabase = makeMockReader({ rows: {} });
    await expect(
      resolveFirstAgentModel(['bogus1', 'bogus2'], { supabase }),
    ).rejects.toThrow(/all candidates failed/);
  });
});
