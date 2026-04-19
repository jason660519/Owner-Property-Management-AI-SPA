// Issue #34 PR D — /api/property-description/prompt-config (GET) must require
// a super_admin session. Prior to PR D this route used its own
// `resolveEffectiveUserId` helper that did session lookup + resolveUserId
// fallback; both are replaced with requireSuperadmin({ allowHeaderFallback: false }).

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
  userId?: string;
}
const authState: AuthState = { ok: true, userId: 'admin-1' };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return {
        ok: true,
        userId: authState.userId ?? 'admin-1',
        source: 'session' as const,
        viaSession: true,
      };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

function createAdminMock(options: {
  modulePrompt?: { prompt_content: string; version?: number } | null;
  savedPrompt?: { content: string } | null;
}) {
  const modulePromptQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: options.modulePrompt ?? null }),
  };

  const savedPromptQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: options.savedPrompt ?? null }),
  };

  return {
    from: jest.fn((table: string) => {
      if (table === 'ai_system_prompts') return modulePromptQuery;
      if (table === 'saved_prompts') return savedPromptQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

const adminState: {
  modulePrompt?: { prompt_content: string; version?: number } | null;
  savedPrompt?: { content: string } | null;
} = {};

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => createAdminMock(adminState),
}));

import { GET } from './route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/property-description/prompt-config', {
    method: 'GET',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
  authState.userId = 'admin-1';
  adminState.modulePrompt = null;
  adminState.savedPrompt = null;
});

describe('GET /api/property-description/prompt-config', () => {
  it('returns 401 when auth fails with 401', async () => {
    authState.ok = false;
    authState.status = 401;
    const response = await GET(req());
    expect(response.status).toBe(401);
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const response = await GET(req());
    expect(response.status).toBe(403);
  });

  it('prefers ai_system_prompt over saved/default', async () => {
    adminState.modulePrompt = { prompt_content: 'module prompt', version: 5 };
    adminState.savedPrompt = { content: 'saved prompt' };
    const response = await GET(req());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload.source).toBe('ai_system_prompt');
    expect(payload.moduleKey).toBe('property_description');
    expect(payload.version).toBe(5);
  });

  it('falls back to default when neither ai_system_prompt nor saved_prompt exists', async () => {
    const response = await GET(req());
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload.source).toBe('default');
  });
});
