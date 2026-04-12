/** Tests for GET /api/paperclip/worktrees */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/worktree', () => {
  const actual = jest.requireActual('@/lib/paperclip/worktree');
  return {
    ...actual,
    listPaperclipWorktrees: jest.fn(),
    makeDockerGitRunner: jest.fn(),
    findRepoRoot: jest.fn(),
  };
});

import {
  findRepoRoot,
  listPaperclipWorktrees,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';
import { GET } from '../route';

const listMock = listPaperclipWorktrees as jest.MockedFunction<typeof listPaperclipWorktrees>;
const makeRunnerMock = makeDockerGitRunner as jest.MockedFunction<typeof makeDockerGitRunner>;
const findRepoRootMock = findRepoRoot as jest.MockedFunction<typeof findRepoRoot>;

function makeReq() {
  return new NextRequest('http://localhost:3001/api/paperclip/worktrees', { method: 'GET' });
}

// Shared fake runner returned by the docker runner factory. Using `clearAllMocks`
// instead of `resetAllMocks` so our factory impl survives between tests.
const fakeRunner = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  makeRunnerMock.mockReturnValue(fakeRunner);
  findRepoRootMock.mockResolvedValue('/repo');
});

describe('GET /api/paperclip/worktrees', () => {
  it('returns 200 with the summary list on success', async () => {
    listMock.mockResolvedValue([
      {
        slug: 'row-001',
        branchName: 'feature/paperclip-row-001',
        path: '/workspace/.paperclip-worktrees/row-001',
        commitCount: 3,
        baseBranch: 'main',
        lastCommitSha: 'def456',
        lastCommitShortSha: 'def456',
        lastCommitSubject: 'chore: implement',
        lastCommitAt: '2026-04-11T10:00:00+00:00',
        prunable: false,
      },
    ]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.worktrees).toHaveLength(1);
    expect(body.worktrees[0].slug).toBe('row-001');
    expect(body.worktrees[0].path).toBe('/repo/.paperclip-worktrees/row-001');
    expect(body.worktrees[0].commitCount).toBe(3);
    expect(body.worktrees[0].lastCommitSubject).toBe('chore: implement');
  });

  it('passes a docker runner + /workspace repoRoot into listPaperclipWorktrees', async () => {
    listMock.mockResolvedValue([]);

    await GET(makeReq());

    expect(makeDockerGitRunner).toHaveBeenCalledWith('paperclip-paperclip-1');
    const args = listMock.mock.calls[0][0];
    expect(args.repoRoot).toBe('/workspace');
    expect(typeof args.runner).toBe('function');
  });

  it('returns empty list when no worktrees exist', async () => {
    listMock.mockResolvedValue([]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.worktrees).toEqual([]);
  });

  it('returns 500 wrapping the underlying git error', async () => {
    listMock.mockRejectedValue(new Error('docker: command not found'));

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('docker: command not found');
  });
});
