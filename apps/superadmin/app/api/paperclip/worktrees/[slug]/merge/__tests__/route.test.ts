/** Tests for POST /api/paperclip/worktrees/[slug]/merge */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/worktree', () => {
  const actual = jest.requireActual('@/lib/paperclip/worktree');
  return {
    ...actual,
    mergeWorktreeBranch: jest.fn(),
    removeWorktree: jest.fn(),
    makeDockerGitRunner: jest.fn(),
  };
});

import {
  mergeWorktreeBranch,
  removeWorktree,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';
import { POST } from '../route';

const mergeMock = mergeWorktreeBranch as jest.MockedFunction<typeof mergeWorktreeBranch>;
const removeMock = removeWorktree as jest.MockedFunction<typeof removeWorktree>;
const factoryMock = makeDockerGitRunner as jest.MockedFunction<typeof makeDockerGitRunner>;

const fakeRunner = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  factoryMock.mockReturnValue(fakeRunner);
  removeMock.mockResolvedValue(undefined);
});

function makeReq(slug = 'row-999', body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3001/api/paperclip/worktrees/${slug}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const happyResult = {
  ok: true as const,
  dryRun: false,
  mergeSha: 'newsha1234567890',
  mergedBranch: 'feature/paperclip-row-999',
  baseBranch: 'main',
  commitsMerged: 3,
};

const dryRunHappyResult = {
  ok: true as const,
  dryRun: true,
  mergeSha: '',
  mergedBranch: 'feature/paperclip-row-999',
  baseBranch: 'main',
  commitsMerged: 3,
};

describe('POST /api/paperclip/worktrees/[slug]/merge', () => {
  it('returns 200 with merge result on success', async () => {
    mergeMock.mockResolvedValue(happyResult);

    const res = await POST(makeReq('row-999', {}), { params: Promise.resolve({ slug: 'row-999' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mergeSha).toBe('newsha1234567890');
    expect(body.commitsMerged).toBe(3);
    expect(body.cleanup).toEqual({ requested: false, ok: null });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('runs cleanup when body.cleanup=true and merge succeeded', async () => {
    mergeMock.mockResolvedValue(happyResult);
    removeMock.mockResolvedValue(undefined);

    const res = await POST(makeReq('row-999', { cleanup: true }), {
      params: Promise.resolve({ slug: 'row-999' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalledTimes(1);
    const removeArgs = removeMock.mock.calls[0][0];
    expect(removeArgs.paths.slug).toBe('row-999');
    expect(removeArgs.pathScope).toBe('container');
    expect(removeArgs.force).toBe(true);
    expect(removeArgs.deleteBranch).toBe(true);
    expect(body.cleanup).toEqual({ requested: true, ok: true });
  });

  it('returns ok:true with cleanup.ok=false when cleanup fails', async () => {
    mergeMock.mockResolvedValue(happyResult);
    removeMock.mockRejectedValue(new Error('worktree locked'));

    const res = await POST(makeReq('row-999', { cleanup: true }), {
      params: Promise.resolve({ slug: 'row-999' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.cleanup.ok).toBe(false);
    expect(body.cleanup.error).toContain('worktree locked');
  });

  it('returns 404 when branch not found', async () => {
    mergeMock.mockResolvedValue({
      ok: false,
      dryRun: false,
      reason: 'branch-not-found',
      message: 'no such branch',
    });
    const res = await POST(makeReq('ghost'), { params: Promise.resolve({ slug: 'ghost' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no commits ahead', async () => {
    mergeMock.mockResolvedValue({
      ok: false,
      dryRun: false,
      reason: 'no-commits-ahead',
      message: '0 ahead',
    });
    const res = await POST(makeReq(), { params: Promise.resolve({ slug: 'row-999' }) });
    expect(res.status).toBe(400);
  });

  it('returns 422 when forbidden paths touched', async () => {
    mergeMock.mockResolvedValue({
      ok: false,
      dryRun: false,
      reason: 'forbidden-paths',
      message: 'branch touches 2 forbidden paths',
      offendingPaths: ['.env.local', 'package.json'],
    });
    const res = await POST(makeReq(), { params: Promise.resolve({ slug: 'row-999' }) });
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.offendingPaths).toEqual(['.env.local', 'package.json']);
  });

  it('returns 409 for base-not-checked-out / base-dirty / merge-conflict', async () => {
    for (const reason of ['base-not-checked-out', 'base-dirty', 'merge-conflict'] as const) {
      mergeMock.mockResolvedValue({ ok: false, dryRun: false, reason, message: reason });
      const res = await POST(makeReq(), { params: Promise.resolve({ slug: 'row-999' }) });
      expect(res.status).toBe(409);
    }
  });

  it('returns 500 for unknown errors', async () => {
    mergeMock.mockResolvedValue({ ok: false, dryRun: false, reason: 'unknown', message: 'mystery' });
    const res = await POST(makeReq(), { params: Promise.resolve({ slug: 'row-999' }) });
    expect(res.status).toBe(500);
  });

  it('forwards dryRun=true to the orchestrator', async () => {
    mergeMock.mockResolvedValue(dryRunHappyResult);

    const res = await POST(makeReq('row-999', { dryRun: true }), {
      params: Promise.resolve({ slug: 'row-999' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.mergeSha).toBe('');
    expect(body.commitsMerged).toBe(3);
    // Dry-run never cleans up even if cleanup:true was also passed.
    expect(removeMock).not.toHaveBeenCalled();

    const orchestratorArgs = mergeMock.mock.calls[0][0];
    expect(orchestratorArgs.dryRun).toBe(true);
  });

  it('dry-run with cleanup:true returns requested=false (cleanup skipped)', async () => {
    mergeMock.mockResolvedValue(dryRunHappyResult);

    const res = await POST(makeReq('row-999', { dryRun: true, cleanup: true }), {
      params: Promise.resolve({ slug: 'row-999' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dryRun).toBe(true);
    expect(body.cleanup).toEqual({ requested: false, ok: null });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('dry-run forwards failure reasons with dryRun:true flag', async () => {
    mergeMock.mockResolvedValue({
      ok: false,
      dryRun: true,
      reason: 'forbidden-paths',
      message: 'would touch forbidden paths',
      offendingPaths: ['.env.local'],
    });

    const res = await POST(makeReq('row-999', { dryRun: true }), {
      params: Promise.resolve({ slug: 'row-999' }),
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.dryRun).toBe(true);
    expect(body.offendingPaths).toEqual(['.env.local']);
  });

  it('returns 400 when dryRun is not a boolean', async () => {
    const res = await POST(
      makeReq('row-999', { dryRun: 'yes' as unknown as boolean }),
      { params: Promise.resolve({ slug: 'row-999' }) },
    );
    expect(res.status).toBe(400);
    expect(mergeMock).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3001/api/paperclip/worktrees/x/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const res = await POST(req, { params: Promise.resolve({ slug: 'x' }) });
    expect(res.status).toBe(400);
    expect(mergeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when body has wrong field types', async () => {
    const res = await POST(
      makeReq('row-999', { cleanup: 'yes' as unknown as boolean }),
      { params: Promise.resolve({ slug: 'row-999' }) },
    );
    expect(res.status).toBe(400);
    expect(mergeMock).not.toHaveBeenCalled();
  });

  it('forwards baseBranch + mergeMessage to the orchestrator', async () => {
    mergeMock.mockResolvedValue(happyResult);
    await POST(
      makeReq('row-999', { baseBranch: 'develop', mergeMessage: 'Custom merge' }),
      { params: Promise.resolve({ slug: 'row-999' }) },
    );
    const args = mergeMock.mock.calls[0][0];
    expect(args.baseBranch).toBe('develop');
    expect(args.mergeMessage).toBe('Custom merge');
    expect(args.repoRoot).toBe('/workspace');
    expect(args.runner).toBe(fakeRunner);
  });
});
