// Issue #34 PR B — /api/ai-settings/clear-all must require a real superadmin
// session (no x-user-id header fallback).

import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
}
const authState: AuthState = { ok: true };

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

const fromSpy = jest.fn();
const updateSpy = jest.fn();
const deleteSpy = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    const eq = () => Promise.resolve({ error: null });
    const update = () => {
      updateSpy();
      return { eq };
    };
    const del = () => {
      deleteSpy();
      return { eq };
    };
    return {
      from: (table: string) => {
        fromSpy(table);
        return { update, delete: del };
      },
    };
  },
}));

import { POST } from '../route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/ai-settings/clear-all', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.ok = true;
  authState.status = undefined;
});

describe('POST /api/ai-settings/clear-all', () => {
  it('returns 401 when auth fails with 401', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 403 when auth fails with 403', async () => {
    authState.ok = false;
    authState.status = 403;
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns 200 and invalidates AI settings for super_admin', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(fromSpy).toHaveBeenCalledWith('ai_api_keys');
    expect(fromSpy).toHaveBeenCalledWith('ai_model_selections');
    expect(fromSpy).toHaveBeenCalledWith('ai_modules_assigned_function');
    expect(fromSpy).toHaveBeenCalledWith('ai_system_prompts');
  });

  it('does not touch admin client when auth fails (regression guard)', async () => {
    authState.ok = false;
    authState.status = 401;
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
