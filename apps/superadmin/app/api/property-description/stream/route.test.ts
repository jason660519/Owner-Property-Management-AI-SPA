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

function createSupabaseAdminMock(options: { promptVersion?: number | null; promptContent?: string | null }) {
  const insertMock = jest.fn().mockResolvedValue({ error: null });

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

  const adminClient = {
    from: jest.fn((table: string) => {
      if (table === 'ai_system_prompts') return aiSystemPromptsQuery;
      if (table === 'ai_modules_assigned_function') return emptySingleQuery;
      if (table === 'ai_api_keys') return emptySingleQuery;
      if (table === 'saved_prompts') return savedPromptsQuery;
      if (table === 'ai_usage_logs') {
        return {
          insert: insertMock,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { adminClient, insertMock };
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
    expect(lastCall).toMatchObject({
      user_id: 'effective-user-id',
      provider: 'anthropic',
      model_id: 'claude-sonnet-4-6',
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
    delete process.env.ANTHROPIC_API_KEY;

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
  });
});
