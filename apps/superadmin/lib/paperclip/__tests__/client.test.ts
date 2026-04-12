import {
  createIssue,
  fetchIssueStatus,
  fetchIssueCost,
  fetchIssueRunLog,
  isTerminalIssueStatus,
} from '../client';
import type { PaperclipIssuePayload } from '../types';

const basePayload: PaperclipIssuePayload = {
  title: '[Row 001] test feature',
  description: 'test description body',
  status: 'todo',
  priority: 'medium',
};

const okArgs = {
  baseUrl: 'http://localhost:3187',
  companyId: 'company-abc',
  apiKey: 'pc_test_key_xyz',
  payload: basePayload,
};

function mockFetchOk(body: unknown, status = 200): jest.Mock {
  return jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockFetchError(status: number, body: unknown): jest.Mock {
  return jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('createIssue', () => {
  it('returns ok=true with issue info and a Paperclip UI URL on success', async () => {
    const fetchImpl = mockFetchOk({
      id: 'abc-uuid-1',
      issueKey: 'VIS-42',
      title: '[Row 001] test feature',
      status: 'todo',
    });

    const result = await createIssue({ ...okArgs, fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.issue.id).toBe('abc-uuid-1');
    expect(result.issue.issueKey).toBe('VIS-42');
    expect(result.issueUrl).toBe('http://localhost:3187/VIS/issues/VIS-42');
    // falls back to UUID when no issueKey
  });

  it('falls back to issue.id when issueKey is missing', async () => {
    const fetchImpl = mockFetchOk({ id: 'abc-uuid-2', title: 'x' });
    const result = await createIssue({ ...okArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.issueUrl).toBe('http://localhost:3187/VIS/issues/abc-uuid-2');
  });

  it('calls the correct endpoint with Bearer auth header', async () => {
    const fetchImpl = mockFetchOk({ id: 'id-1' });

    await createIssue({ ...okArgs, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3187/api/companies/company-abc/issues');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer pc_test_key_xyz');
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify(basePayload));
  });

  it('strips trailing slashes in baseUrl', async () => {
    const fetchImpl = mockFetchOk({ id: 'id-1' });
    await createIssue({ ...okArgs, baseUrl: 'http://localhost:3187///', fetchImpl });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3187/api/companies/company-abc/issues');
  });

  it('returns ok=false with error + raw body on 4xx', async () => {
    const fetchImpl = mockFetchError(400, { error: 'assigneeAgentId invalid' });
    const result = await createIssue({ ...okArgs, fetchImpl });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(400);
    expect(result.error).toContain('assigneeAgentId invalid');
    expect(result.detail).toEqual({ error: 'assigneeAgentId invalid' });
  });

  it('returns ok=false with message from body.message when error is absent', async () => {
    const fetchImpl = mockFetchError(422, { message: 'validation failed' });
    const result = await createIssue({ ...okArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toBe('validation failed');
  });

  it('returns a synthetic error message when body has no error field', async () => {
    const fetchImpl = mockFetchError(500, { anotherField: 'x' });
    const result = await createIssue({ ...okArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('HTTP 500');
    expect(result.status).toBe(500);
  });

  it('returns ok=false with status=0 when fetch throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await createIssue({ ...okArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns ok=false when config is missing', async () => {
    const fetchImpl = jest.fn();
    const result = await createIssue({
      ...okArgs,
      apiKey: '',
      fetchImpl,
    });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(result.error).toContain('missing required config');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns ok=false when response has no id', async () => {
    const fetchImpl = mockFetchOk({ notId: 'x' });
    const result = await createIssue({ ...okArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('unexpected response shape');
  });
});

describe('isTerminalIssueStatus', () => {
  it('treats done and cancelled as terminal', () => {
    expect(isTerminalIssueStatus('done')).toBe(true);
    expect(isTerminalIssueStatus('cancelled')).toBe(true);
  });

  it('treats in-flight states as non-terminal (UI should keep polling)', () => {
    expect(isTerminalIssueStatus('todo')).toBe(false);
    expect(isTerminalIssueStatus('in_progress')).toBe(false);
    expect(isTerminalIssueStatus('in_review')).toBe(false);
    expect(isTerminalIssueStatus('backlog')).toBe(false);
  });

  it('treats blocked as non-terminal because a human can unblock it', () => {
    expect(isTerminalIssueStatus('blocked')).toBe(false);
  });
});

describe('fetchIssueStatus', () => {
  const baseArgs = {
    baseUrl: 'http://localhost:3187',
    apiKey: 'pc_test_key',
    issueId: 'abc-uuid',
  };

  it('returns ok=true with snapshot + issueUrl on 200', async () => {
    const fetchImpl = mockFetchOk({
      id: 'abc-uuid',
      issueKey: 'VIS-42',
      title: '[Row 001] test',
      status: 'in_progress',
      updatedAt: '2026-04-11T10:00:00Z',
    });

    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.id).toBe('abc-uuid');
    expect(result.snapshot.status).toBe('in_progress');
    expect(result.snapshot.title).toBe('[Row 001] test');
    expect(result.snapshot.issueUrl).toBe('http://localhost:3187/VIS/issues/VIS-42');
    expect(result.snapshot.terminal).toBe(false);
  });

  it('marks done as terminal', async () => {
    const fetchImpl = mockFetchOk({
      id: 'abc-uuid',
      status: 'done',
    });
    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.terminal).toBe(true);
  });

  it('falls back to id in the issueUrl when issueKey is missing', async () => {
    const fetchImpl = mockFetchOk({ id: 'abc-uuid', status: 'todo' });
    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.issueUrl).toBe('http://localhost:3187/VIS/issues/abc-uuid');
  });

  it('GETs the correct URL with Bearer auth', async () => {
    const fetchImpl = mockFetchOk({ id: 'abc-uuid', status: 'todo' });
    await fetchIssueStatus({ ...baseArgs, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3187/api/issues/abc-uuid');
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer pc_test_key');
  });

  it('URL-encodes the issueId', async () => {
    const fetchImpl = mockFetchOk({ id: 'weird/id', status: 'todo' });
    await fetchIssueStatus({ ...baseArgs, issueId: 'weird/id', fetchImpl });
    const [url] = (fetchImpl as jest.Mock).mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3187/api/issues/weird%2Fid');
  });

  it('passes through Paperclip 404 error', async () => {
    const fetchImpl = mockFetchError(404, { error: 'issue not found' });
    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(404);
    expect(result.error).toContain('issue not found');
  });

  it('returns status=0 on network error', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns error when response lacks id or status', async () => {
    const fetchImpl = mockFetchOk({ id: 'abc-uuid' }); // missing status
    const result = await fetchIssueStatus({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('unexpected status response shape');
  });

  it('returns error when required args are missing', async () => {
    const fetchImpl = jest.fn();
    const result = await fetchIssueStatus({ ...baseArgs, apiKey: '', fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('fetchIssueCost', () => {
  const baseArgs = {
    baseUrl: 'http://localhost:3187',
    apiKey: 'pc_test_key',
    issueId: 'abc-uuid',
  };

  /** Build a fetch mock whose two calls return (issue, run) in order. */
  function seq(issueBody: unknown, runBody: unknown, issueStatus = 200, runStatus = 200): jest.Mock {
    const calls: jest.Mock = jest.fn();
    calls
      .mockResolvedValueOnce(
        new Response(JSON.stringify(issueBody), {
          status: issueStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(runBody), {
          status: runStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    return calls;
  }

  it('returns a flat cost snapshot on happy path', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1', assigneeAgentId: 'agent-1' },
      {
        id: 'run-1',
        status: 'succeeded',
        finishedAt: '2026-04-11T19:47:34Z',
        usageJson: {
          costUsd: 0.15034035,
          inputTokens: 8,
          outputTokens: 2037,
          cachedInputTokens: 123117,
          model: 'claude-sonnet-4-6',
        },
      },
    );

    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBe('run-1');
    expect(result.snapshot.costUsd).toBeCloseTo(0.15034035);
    expect(result.snapshot.inputTokens).toBe(8);
    expect(result.snapshot.outputTokens).toBe(2037);
    expect(result.snapshot.cachedInputTokens).toBe(123117);
    expect(result.snapshot.model).toBe('claude-sonnet-4-6');
    expect(result.snapshot.runStatus).toBe('succeeded');
    expect(result.snapshot.finishedAt).toBe('2026-04-11T19:47:34Z');
  });

  it('returns empty snapshot (ok=true, no runId) when issue has no run yet', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: 'abc-uuid', executionRunId: null, checkoutRunId: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBeUndefined();
    expect(result.snapshot.costUsd).toBeUndefined();
    // Only the issue endpoint was hit, no run endpoint.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to checkoutRunId when executionRunId is missing', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: null, checkoutRunId: 'checkout-run' },
      { id: 'checkout-run', status: 'running', usageJson: { costUsd: 0.01 } },
    );

    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBe('checkout-run');
    expect(result.snapshot.costUsd).toBe(0.01);
  });

  it('handles missing usageJson gracefully', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1' },
      { id: 'run-1', status: 'running' }, // no usageJson yet (still running)
    );

    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBe('run-1');
    expect(result.snapshot.costUsd).toBeUndefined();
    expect(result.snapshot.inputTokens).toBeUndefined();
    expect(result.snapshot.runStatus).toBe('running');
  });

  it('passes Bearer auth on both requests', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1' },
      { id: 'run-1', usageJson: { costUsd: 0.02 } },
    );
    await fetchIssueCost({ ...baseArgs, fetchImpl });
    const calls = (fetchImpl as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    const [issueUrl, issueInit] = calls[0] as [string, RequestInit];
    const [runUrl, runInit] = calls[1] as [string, RequestInit];
    expect(issueUrl).toBe('http://localhost:3187/api/issues/abc-uuid');
    expect((issueInit.headers as Record<string, string>).Authorization).toBe('Bearer pc_test_key');
    expect(runUrl).toBe('http://localhost:3187/api/heartbeat-runs/run-1');
    expect((runInit.headers as Record<string, string>).Authorization).toBe('Bearer pc_test_key');
  });

  it('passes through 404 from the issue endpoint', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 }),
    );
    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(404);
    expect(result.error).toContain('not found');
  });

  it('passes through error from the run endpoint', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1' },
      { error: 'run missing' },
      200,
      500,
    );
    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(500);
    expect(result.error).toContain('run missing');
  });

  it('returns status=0 when the first fetch throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fetchIssueCost({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns error when required args are missing', async () => {
    const fetchImpl = jest.fn();
    const result = await fetchIssueCost({ ...baseArgs, apiKey: '', fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('fetchIssueRunLog', () => {
  const baseArgs = {
    baseUrl: 'http://localhost:3187',
    apiKey: 'pc_test_key',
    issueId: 'abc-uuid',
  };

  /** Build a fetch mock whose two calls return (issue, run) in order. */
  function seq(issueBody: unknown, runBody: unknown, issueStatus = 200, runStatus = 200): jest.Mock {
    const calls: jest.Mock = jest.fn();
    calls
      .mockResolvedValueOnce(
        new Response(JSON.stringify(issueBody), {
          status: issueStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(runBody), {
          status: runStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    return calls;
  }

  it('returns stdout + run status + timing on happy path', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-42' },
      {
        id: 'run-42',
        status: 'running',
        startedAt: '2026-04-12T10:00:00Z',
        finishedAt: null,
        exitCode: null,
        stdoutExcerpt: '[paperclip] Starting run...\nReading CLAUDE.md',
        stderrExcerpt: '',
      },
    );

    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBe('run-42');
    expect(result.snapshot.runStatus).toBe('running');
    expect(result.snapshot.startedAt).toBe('2026-04-12T10:00:00Z');
    expect(result.snapshot.finishedAt).toBeUndefined();
    expect(result.snapshot.stdoutExcerpt).toContain('Starting run');
    expect(result.snapshot.stderrExcerpt).toBeUndefined(); // empty string → pickString returns undefined
    expect(result.snapshot.exitCode).toBeUndefined();
  });

  it('captures exitCode on terminal runs', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-43' },
      {
        id: 'run-43',
        status: 'succeeded',
        startedAt: '2026-04-12T10:00:00Z',
        finishedAt: '2026-04-12T10:01:00Z',
        exitCode: 0,
        stdoutExcerpt: 'done',
      },
    );
    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.exitCode).toBe(0);
    expect(result.snapshot.finishedAt).toBe('2026-04-12T10:01:00Z');
    expect(result.snapshot.runStatus).toBe('succeeded');
  });

  it('returns empty snapshot (ok=true, no runId) when issue has no run yet', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: 'abc-uuid', executionRunId: null, checkoutRunId: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBeUndefined();
    expect(result.snapshot.stdoutExcerpt).toBeUndefined();
    // Only the issue endpoint was hit.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to checkoutRunId when executionRunId is missing', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: null, checkoutRunId: 'checkout-run' },
      { id: 'checkout-run', status: 'queued', stdoutExcerpt: '' },
    );

    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    if (!result.ok) throw new Error('expected ok');
    expect(result.snapshot.runId).toBe('checkout-run');
    expect(result.snapshot.runStatus).toBe('queued');
  });

  it('passes Bearer auth on both requests', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1' },
      { id: 'run-1', status: 'running', stdoutExcerpt: 'x' },
    );
    await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    const calls = (fetchImpl as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    const [issueUrl, issueInit] = calls[0] as [string, RequestInit];
    const [runUrl, runInit] = calls[1] as [string, RequestInit];
    expect(issueUrl).toBe('http://localhost:3187/api/issues/abc-uuid');
    expect((issueInit.headers as Record<string, string>).Authorization).toBe('Bearer pc_test_key');
    expect(runUrl).toBe('http://localhost:3187/api/heartbeat-runs/run-1');
    expect((runInit.headers as Record<string, string>).Authorization).toBe('Bearer pc_test_key');
    // GET, not POST
    expect(issueInit.method).toBe('GET');
    expect(runInit.method).toBe('GET');
  });

  it('passes through 404 from the issue endpoint', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 }),
    );
    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(404);
    expect(result.error).toContain('not found');
  });

  it('passes through error from the run endpoint', async () => {
    const fetchImpl = seq(
      { id: 'abc-uuid', executionRunId: 'run-1' },
      { error: 'run missing' },
      200,
      500,
    );
    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(500);
    expect(result.error).toContain('run missing');
  });

  it('returns status=0 when the first fetch throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fetchIssueRunLog({ ...baseArgs, fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(0);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns error when required args are missing', async () => {
    const fetchImpl = jest.fn();
    const result = await fetchIssueRunLog({ ...baseArgs, apiKey: '', fetchImpl });
    if (result.ok) throw new Error('expected failure');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
