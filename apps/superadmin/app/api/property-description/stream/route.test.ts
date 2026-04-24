import type { NextRequest } from 'next/server';
import { Response as UndiciResponse } from 'undici';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/resolve-ai-settings-user', () => ({
  resolveUserId: jest.fn(),
}));

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(),
}));

jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/ai/audit', () => ({
  startPromptAudit: jest.fn(() => ({
    complete: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { POST } from './route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { checkRateLimit } from '@/lib/ai/rate-limit';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;
const mockResolveUserId = resolveUserId as jest.MockedFunction<typeof resolveUserId>;
const mockRequireSuperadmin = requireSuperadmin as jest.MockedFunction<typeof requireSuperadmin>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

if (typeof Response === 'undefined' || typeof (Response as unknown as { prototype?: { text?: unknown } }).prototype?.text !== 'function') {
  (global as unknown as { Response: typeof Response }).Response = UndiciResponse as unknown as typeof Response;
}

function createSupabaseAdminMock(options: {
  promptVersion?: number | null;
  promptContent?: string | null;
  /** Seed rows for `ai_prompt_audit_logs`; cost-guard sums these. Default empty. */
  auditLogs?: Array<{
    provider: string;
    model_id: string;
    input_tokens: number | null;
    output_tokens: number | null;
  }>;
}) {
  const insertMock = jest.fn().mockResolvedValue({ error: null });
  const observabilityInsertMock = jest.fn().mockResolvedValue({ error: null });
  const observabilityTraceUpsertMock = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'trace-id' },
        error: null,
      }),
    }),
  });

  const aiSystemPromptsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: options.promptContent
        ? { prompt_content: options.promptContent, version: options.promptVersion ?? null }
        : null,
    }),
  };

  const emptySingleQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null }),
  };

  const savedPromptsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  };

  // Phase 2 resolver reads the global agent config table. Returning { data: null }
  // forces resolveAgentModel() to fall through to its in-memory factory default
  // (`AGENT_DEFAULTS.property_description` → anthropic/claude-sonnet-4-20250514).
  const agentAssignmentsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  // Phase 2.5 cost guard reads ai_prompt_audit_logs to compute monthly spend.
  // Migration 20260412120000 switched the query from .from().select().in()
  // to .from().select().or() so it matches BOTH the new agent_key column AND
  // legacy module_key rows in one round-trip. Mock both chain shapes so any
  // future refactor doesn't need to touch this file.
  const auditRows = options.auditLogs ?? [];
  const auditLogsQuery = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: auditRows, error: null }),
  };

  const adminClient = {
    from: jest.fn((table: string) => {
      if (table === 'ai_system_prompts') return aiSystemPromptsQuery;
      if (table === 'ai_modules_assigned_function') return emptySingleQuery;
      if (table === 'ai_agent_model_assignments') return agentAssignmentsQuery;
      if (table === 'ai_prompt_audit_logs') return auditLogsQuery;
      if (table === 'ai_api_keys') return emptySingleQuery;
      if (table === 'saved_prompts') return savedPromptsQuery;
      if (table === 'ai_usage_logs') {
        return {
          insert: insertMock,
        };
      }
      if (table === 'llm_observability_traces') {
        return {
          upsert: observabilityTraceUpsertMock,
        };
      }
      if (table === 'llm_observability_invocations') {
        return {
          insert: observabilityInsertMock,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { adminClient, insertMock, observabilityInsertMock, observabilityTraceUpsertMock };
}

describe('POST /api/property-description/stream (usage logs)', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
    mockRequireSuperadmin.mockResolvedValue({
      ok: true,
      userId: 'superadmin-user-id',
      source: 'session',
      viaSession: true,
    });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(Date.now() + 60_000),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('writes ai_usage_logs with prompt/model metadata when generation succeeds', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';

    const { adminClient, insertMock } = createSupabaseAdminMock({
      promptContent: 'PROMPT {物件資料}',
      promptVersion: 3,
    });

    mockCreateAdminClient.mockReturnValue(adminClient as unknown as ReturnType<typeof createAdminClient>);
    mockResolveUserId.mockResolvedValue('effective-user-id');
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          content: [{ type: 'text', text: 'draft-text' }],
          usage: { input_tokens: 12, output_tokens: 34 },
        }),
      ),
    });

    const request = {
      json: async () => ({ listingType: 'sale', title: '測試物件', generationLength: 'short' }),
      signal: new AbortController().signal,
    } as unknown as NextRequest;

    const response = await POST(request);
    const sseText = await response.text();

    expect(sseText).toContain('data: ');
    expect(insertMock).toHaveBeenCalled();

    const lastCall = insertMock.mock.calls[insertMock.mock.calls.length - 1]?.[0] as Record<string, unknown>;
    // After Phase 2: resolveAgentModel('property_description') → factory
    // default since the mock returns { data: null } for the new table →
    // primary is anthropic/claude-sonnet-4-20250514 per AGENT_DEFAULTS.
    expect(lastCall).toMatchObject({
      user_id: 'effective-user-id',
      provider: 'anthropic',
      model_id: 'claude-sonnet-4-20250514',
      module_key: 'property_description',
      status: 'success',
      prompt_name: '物件描述文案',
      prompt_source: 'ai_system_prompt',
      prompt_module_key: 'property_description',
      prompt_version: 3,
      response_status: 200,
    });

    expect(typeof lastCall.final_prompt_hash).toBe('string');
    expect(lastCall.final_prompt_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('writes ai_usage_logs with missing_api_key when no provider API key is available', async () => {
    const envKeys = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'DEEPSEEK_API_KEY',
      'GROK_API_KEY',
      'TOGETHER_AI_API_KEY',
      'KIMI_API_KEY',
      'OPENROUTER_API_KEY',
      'ZHIPU_API_KEY',
    ];
    const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    for (const key of envKeys) {
      delete process.env[key];
    }

    const { adminClient, insertMock } = createSupabaseAdminMock({
      promptContent: 'PROMPT {物件資料}',
      promptVersion: 1,
    });

    mockCreateAdminClient.mockReturnValue(adminClient as unknown as ReturnType<typeof createAdminClient>);
    mockResolveUserId.mockResolvedValue('effective-user-id');
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const request = {
      json: async () => ({ listingType: 'sale', title: '測試物件', generationLength: 'short' }),
      signal: new AbortController().signal,
    } as unknown as NextRequest;

    const response = await POST(request);
    const sseText = await response.text();

    expect(sseText).toContain('尚未設定可用的 AI 服務 API 金鑰');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'effective-user-id',
        module_key: 'property_description',
        status: 'error',
        error_message: 'missing_api_key',
        prompt_name: '物件描述文案',
      }),
    );

    for (const key of envKeys) {
      const value = previousEnv[key];
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it('blocks the call with monthly_cap_exceeded when audit logs already total ≥ max_monthly_usd', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';

    // Factory default for property_description sets max_monthly_usd=5.
    // Seed one audit row worth exactly $5.00 → cost-guard blocks the call
    // before any LLM fetch happens.
    // gpt-4o: $2.50 / 1M input. 2M input tokens × $2.50/1M = $5.00
    const { adminClient } = createSupabaseAdminMock({
      promptContent: 'PROMPT {物件資料}',
      promptVersion: 3,
      auditLogs: [
        {
          provider: 'openai',
          model_id: 'gpt-4o',
          input_tokens: 2_000_000,
          output_tokens: 0,
        },
      ],
    });

    mockCreateAdminClient.mockReturnValue(adminClient as unknown as ReturnType<typeof createAdminClient>);
    mockResolveUserId.mockResolvedValue('effective-user-id');
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const request = {
      json: async () => ({ listingType: 'sale', title: '測試物件', generationLength: 'short' }),
      signal: new AbortController().signal,
    } as unknown as NextRequest;

    const response = await POST(request);
    const sseText = await response.text();

    // Should emit a budget_check event with allowed=false and an error event.
    expect(sseText).toContain('"type":"budget_check"');
    expect(sseText).toContain('"allowed":false');
    expect(sseText).toContain('monthly_cap_exceeded');
    expect(sseText).toContain('本月累計花費');
    // Crucially — no LLM fetch was attempted.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
