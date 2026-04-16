import { renderHook, waitFor, act } from '@testing-library/react';

import { useAISettings } from '../useAISettings';

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('useAISettings', () => {
  const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('sends x-user-id header when validating a key', async () => {
    const fetchMock = jest
      .fn()
      // Initial fetchAll (7 endpoints)
      .mockResolvedValueOnce(jsonResponse({ keys: [] }))
      .mockResolvedValueOnce(jsonResponse({ models: [] }))
      .mockResolvedValueOnce(jsonResponse({ modules: [] }))
      .mockResolvedValueOnce(jsonResponse({ prompts: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ summary: { validatedCount: 0, totalModels: 0, updatedAt: null } }),
      )
      .mockResolvedValueOnce(jsonResponse({ evaluations: [] }))
      .mockResolvedValueOnce(jsonResponse({ cache: {} }))
      // validateKey call
      .mockResolvedValueOnce(jsonResponse({ valid: true, message: 'ok', availableModels: [] }));
    // @ts-expect-error jest replaces global fetch in tests
    global.fetch = fetchMock;

    const { result } = renderHook(() => useAISettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.validateKey('openai', 'sk-test', 'key-1', { skipRefresh: true });
    });

    const validateCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/ai-settings/keys/validate',
    );
    expect(validateCall).toBeTruthy();
    expect(validateCall?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-user-id': MOCK_USER_ID,
    });
  });
});

