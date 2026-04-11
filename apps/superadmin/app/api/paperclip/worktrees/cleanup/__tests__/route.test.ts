/**
 * Tests for /api/paperclip/worktrees/cleanup POST route.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/worktree', () => {
  const actual = jest.requireActual('@/lib/paperclip/worktree');
  return {
    ...actual,
    findRepoRoot: jest.fn(),
    removeWorktree: jest.fn(),
  };
});

import { findRepoRoot, removeWorktree } from '@/lib/paperclip/worktree';
import { POST } from '../route';

const findRepoRootMock = findRepoRoot as jest.MockedFunction<typeof findRepoRoot>;
const removeWorktreeMock = removeWorktree as jest.MockedFunction<typeof removeWorktree>;

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/worktrees/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  findRepoRootMock.mockResolvedValue('/fake/repo');
  removeWorktreeMock.mockResolvedValue(undefined);
});

describe('POST /api/paperclip/worktrees/cleanup', () => {
  it('removes a worktree by slug and returns 200 with branch info', async () => {
    const res = await POST(makeReq({ slug: 'row-001' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.slug).toBe('row-001');
    expect(body.branchName).toBe('feature/paperclip-row-001');
    expect(body.containerPath).toBe('/workspace/.paperclip-worktrees/row-001');
    expect(body.branchDeleted).toBe(false);

    expect(removeWorktreeMock).toHaveBeenCalledTimes(1);
    const args = removeWorktreeMock.mock.calls[0][0];
    expect(args.paths.slug).toBe('row-001');
    expect(args.force).toBe(true); // default
    expect(args.deleteBranch).toBe(false); // default
    expect(args.pathScope).toBe('container');
    expect(typeof args.runner).toBe('function');
  });

  it('sanitizes the incoming slug to match the created worktree', async () => {
    const res = await POST(makeReq({ slug: 'Row 001 Foo' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slug).toBe('row-001-foo');
    expect(removeWorktreeMock.mock.calls[0][0].paths.slug).toBe('row-001-foo');
  });

  it('passes deleteBranch=true when requested', async () => {
    const res = await POST(makeReq({ slug: 'row-001', deleteBranch: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.branchDeleted).toBe(true);
    expect(removeWorktreeMock.mock.calls[0][0].deleteBranch).toBe(true);
  });

  it('passes force=false when explicitly disabled', async () => {
    await POST(makeReq({ slug: 'row-001', force: false }));
    expect(removeWorktreeMock.mock.calls[0][0].force).toBe(false);
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(makeReq('{not-json'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('valid JSON');
    expect(removeWorktreeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when slug is missing', async () => {
    const res = await POST(makeReq({}));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('slug');
  });

  it('returns 400 when slug is empty string', async () => {
    const res = await POST(makeReq({ slug: '   ' }));
    const body = await res.json();
    expect(res.status).toBe(400);
  });

  it('returns 400 when deleteBranch is non-boolean', async () => {
    const res = await POST(makeReq({ slug: 'row-001', deleteBranch: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when removeWorktree throws', async () => {
    removeWorktreeMock.mockRejectedValue(new Error('fatal: worktree locked'));
    const res = await POST(makeReq({ slug: 'row-001' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toContain('worktree locked');
  });

  it('returns 500 when findRepoRoot throws', async () => {
    findRepoRootMock.mockRejectedValue(new Error('not a git repository'));
    const res = await POST(makeReq({ slug: 'row-001' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toContain('not a git repository');
    expect(removeWorktreeMock).not.toHaveBeenCalled();
  });
});
