/** Tests for GET /api/paperclip/worktrees/[slug]/diff */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/worktree', () => {
  const actual = jest.requireActual('@/lib/paperclip/worktree');
  return {
    ...actual,
    getWorktreeDiff: jest.fn(),
    makeDockerGitRunner: jest.fn(),
  };
});

import { getWorktreeDiff, makeDockerGitRunner } from '@/lib/paperclip/worktree';
import { GET } from '../route';

const diffMock = getWorktreeDiff as jest.MockedFunction<typeof getWorktreeDiff>;
const runnerFactoryMock = makeDockerGitRunner as jest.MockedFunction<typeof makeDockerGitRunner>;

const fakeRunner = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  runnerFactoryMock.mockReturnValue(fakeRunner);
});

function makeReq(slug = 'row-001', query = '') {
  const url = `http://localhost:3001/api/paperclip/worktrees/${slug}/diff${query}`;
  return new NextRequest(url, { method: 'GET' });
}

const happySnapshot = {
  slug: 'row-001',
  branch: 'feature/paperclip-row-001',
  baseBranch: 'main',
  stat: ' foo.ts | 1 +\n 1 file changed\n',
  diff: 'diff --git a/foo.ts b/foo.ts\n+new line\n',
  truncated: false,
  diffTotalBytes: 42,
  commits: [
    { sha: 'abc1234', shortSha: 'abc1234', subject: 'feat: test', author: 'Agent', at: '2026-04-11T10:00:00+00:00' },
  ],
};

describe('GET /api/paperclip/worktrees/[slug]/diff', () => {
  it('returns 200 with the diff snapshot on success', async () => {
    diffMock.mockResolvedValue(happySnapshot);

    const res = await GET(makeReq('row-001'), { params: Promise.resolve({ slug: 'row-001' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.branch).toBe('feature/paperclip-row-001');
    expect(body.diff).toContain('new line');
    expect(body.commits).toHaveLength(1);
  });

  it('passes docker runner + default maxDiffBytes + /workspace to getWorktreeDiff', async () => {
    diffMock.mockResolvedValue(happySnapshot);

    await GET(makeReq('row-001'), { params: Promise.resolve({ slug: 'row-001' }) });

    expect(runnerFactoryMock).toHaveBeenCalledWith('paperclip-paperclip-1');
    const args = diffMock.mock.calls[0][0];
    expect(args.slug).toBe('row-001');
    expect(args.repoRoot).toBe('/workspace');
    expect(args.baseBranch).toBe('main');
    expect(args.maxDiffBytes).toBe(256 * 1024);
    expect(args.runner).toBe(fakeRunner);
  });

  it('honours ?base= query parameter', async () => {
    diffMock.mockResolvedValue({ ...happySnapshot, baseBranch: 'develop' });

    await GET(
      makeReq('row-001', '?base=develop'),
      { params: Promise.resolve({ slug: 'row-001' }) },
    );

    expect(diffMock.mock.calls[0][0].baseBranch).toBe('develop');
  });

  it('honours ?limit= query parameter (clamped to absolute max)', async () => {
    diffMock.mockResolvedValue(happySnapshot);

    await GET(
      makeReq('row-001', '?limit=10000000'), // 10 MB — should be clamped to 1 MB
      { params: Promise.resolve({ slug: 'row-001' }) },
    );

    expect(diffMock.mock.calls[0][0].maxDiffBytes).toBe(1024 * 1024);
  });

  it('ignores negative or non-numeric limit values', async () => {
    diffMock.mockResolvedValue(happySnapshot);
    await GET(makeReq('row-001', '?limit=-1'), { params: Promise.resolve({ slug: 'row-001' }) });
    expect(diffMock.mock.calls[0][0].maxDiffBytes).toBe(256 * 1024);
    jest.clearAllMocks();
    runnerFactoryMock.mockReturnValue(fakeRunner);
    diffMock.mockResolvedValue(happySnapshot);
    await GET(makeReq('row-001', '?limit=abc'), { params: Promise.resolve({ slug: 'row-001' }) });
    expect(diffMock.mock.calls[0][0].maxDiffBytes).toBe(256 * 1024);
  });

  it('returns 400 when slug is empty', async () => {
    const res = await GET(makeReq('   '), { params: Promise.resolve({ slug: '   ' }) });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('Missing slug');
    expect(diffMock).not.toHaveBeenCalled();
  });

  it('returns 404 when git reports an unknown revision', async () => {
    diffMock.mockRejectedValue(new Error("fatal: bad revision 'main..feature/paperclip-ghost'"));

    const res = await GET(makeReq('ghost'), { params: Promise.resolve({ slug: 'ghost' }) });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toContain('bad revision');
  });

  it('returns 500 for other git errors', async () => {
    diffMock.mockRejectedValue(new Error('docker: command not found'));

    const res = await GET(makeReq('row-001'), { params: Promise.resolve({ slug: 'row-001' }) });
    expect(res.status).toBe(500);
  });
});
