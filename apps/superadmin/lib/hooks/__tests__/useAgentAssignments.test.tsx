/**
 * Unit tests for useAgentAssignments.
 *
 * Covers:
 *  - Initial fetch + assignmentsByKey shaping
 *  - Error path (GET failure → error state)
 *  - save() PUT payload + local state merge
 *  - reset() DELETE + local state removal
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentAssignments } from '../useAgentAssignments';
import type { AgentAssignment } from '@/lib/types/agent-assignment';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

const assignmentA: AgentAssignment = {
  id: 'id-a',
  agent_key: 'contract_assistant',
  is_enabled: true,
  primary_provider: 'anthropic',
  primary_model_id: 'claude-opus-4-6',
  primary_config: { temperature: 0.2 },
  fallbacks: [],
  guardrails: {},
  notes: null,
  updated_by: MOCK_USER_ID,
  updated_at: '2026-04-12T00:00:00Z',
  created_at: '2026-04-12T00:00:00Z',
};

const assignmentB: AgentAssignment = {
  ...assignmentA,
  id: 'id-b',
  agent_key: 'property_description',
  primary_provider: 'openai',
  primary_model_id: 'gpt-4o',
};

describe('useAgentAssignments', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  function mockFetchSequence(responses: Array<Response | Error>) {
    let call = 0;
    const fetchMock = jest.fn().mockImplementation(() => {
      const r = responses[call++];
      if (r instanceof Error) return Promise.reject(r);
      return Promise.resolve(r);
    });
    // @ts-expect-error — override global fetch
    global.fetch = fetchMock;
    return fetchMock;
  }

  function jsonResponse(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  }

  it('fetches and indexes assignments by agent_key on mount', async () => {
    mockFetchSequence([jsonResponse({ assignments: [assignmentA, assignmentB] })]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.assignmentsByKey).toEqual({
      contract_assistant: assignmentA,
      property_description: assignmentB,
    });
  });

  it('records an error when the initial GET fails', async () => {
    mockFetchSequence([
      jsonResponse({ error: 'boom' }, { status: 500 }),
    ]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('boom');
    expect(result.current.assignmentsByKey).toEqual({});
  });

  it('save() sends a PUT and merges the returned row into local state', async () => {
    const fetchMock = mockFetchSequence([
      jsonResponse({ assignments: [] }),
      jsonResponse({ ok: true, assignment: assignmentA }),
    ]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({
        agent_key: 'contract_assistant',
        primary_provider: 'anthropic',
        primary_model_id: 'claude-opus-4-6',
      });
    });

    expect(result.current.assignmentsByKey.contract_assistant).toEqual(assignmentA);

    // Second call was the PUT — verify method + headers + body.
    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toBe('/api/ai-settings/agent-assignments');
    expect(putCall[1].method).toBe('PUT');
    expect(putCall[1].headers['x-user-id']).toBe(MOCK_USER_ID);
    const body = JSON.parse(putCall[1].body);
    expect(body.agent_key).toBe('contract_assistant');
    expect(body.primary_model_id).toBe('claude-opus-4-6');
  });

  it('reset() PUTs the factory defaults and merges the response into state', async () => {
    const resetRow: AgentAssignment = {
      ...assignmentA,
      primary_config: { temperature: 0.2, max_tokens: 8192 },
      guardrails: { max_monthly_usd: 5 },
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
    };
    const fetchMock = mockFetchSequence([
      jsonResponse({ assignments: [assignmentA, assignmentB] }),
      jsonResponse({ ok: true, assignment: resetRow }),
    ]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reset('contract_assistant');
    });

    // assignmentB should remain untouched.
    expect(result.current.assignmentsByKey.property_description).toEqual(assignmentB);
    // contract_assistant should now reflect the server-returned default row.
    expect(result.current.assignmentsByKey.contract_assistant.guardrails).toEqual({
      max_monthly_usd: 5,
    });
    expect(result.current.assignmentsByKey.contract_assistant.fallbacks).toHaveLength(3);

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[1].method).toBe('PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.agent_key).toBe('contract_assistant');
    expect(body.primary_provider).toBe('anthropic');
    expect(body.primary_model_id).toBe('claude-opus-4-20250514');
    expect(body.guardrails).toEqual({ max_monthly_usd: 5 });
    expect(body.fallbacks).toHaveLength(3);
    // Each fallback must carry a trigger, and all 3 trigger types must appear.
    const triggers = body.fallbacks.map((f: { trigger: string }) => f.trigger).sort();
    expect(triggers).toEqual(['cost_over', 'error', 'rate_limit']);
  });

  it('reset() throws when the agent_key has no factory default', async () => {
    mockFetchSequence([jsonResponse({ assignments: [] })]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.reset('not_a_real_agent');
      }),
    ).rejects.toThrow(/No factory default/);
  });

  it('save() throws and does not mutate state when PUT fails', async () => {
    mockFetchSequence([
      jsonResponse({ assignments: [] }),
      jsonResponse({ error: 'bad input' }, { status: 400 }),
    ]);

    const { result } = renderHook(() => useAgentAssignments({ userId: MOCK_USER_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.save({
          agent_key: 'contract_assistant',
          primary_provider: 'anthropic',
          primary_model_id: 'claude-opus-4-6',
        });
      }),
    ).rejects.toThrow('bad input');

    expect(result.current.assignmentsByKey).toEqual({});
  });
});
