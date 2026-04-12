/**
 * Tests for /api/paperclip/issues POST route.
 * We mock the createIssue client and the worktree module so we don't hit real
 * HTTP or real git.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/paperclip/client', () => ({
  createIssue: jest.fn(),
}));

jest.mock('@/lib/paperclip/worktree', () => {
  const actual = jest.requireActual('@/lib/paperclip/worktree');
  return {
    ...actual,
    findRepoRoot: jest.fn(),
    createWorktree: jest.fn(),
    removeWorktree: jest.fn(),
  };
});

jest.mock('@/lib/paperclip/git-hook', () => ({
  installPaperclipGitHook: jest.fn(),
  installAllPaperclipGitHooks: jest.fn(),
}));

import { createIssue } from '@/lib/paperclip/client';
import { findRepoRoot, createWorktree, removeWorktree } from '@/lib/paperclip/worktree';
import { installAllPaperclipGitHooks } from '@/lib/paperclip/git-hook';
import { POST } from '../route';

const createIssueMock = createIssue as jest.MockedFunction<typeof createIssue>;
const findRepoRootMock = findRepoRoot as jest.MockedFunction<typeof findRepoRoot>;
const createWorktreeMock = createWorktree as jest.MockedFunction<typeof createWorktree>;
const removeWorktreeMock = removeWorktree as jest.MockedFunction<typeof removeWorktree>;
const installHookMock = installAllPaperclipGitHooks as jest.MockedFunction<typeof installAllPaperclipGitHooks>;

const validPayload = {
  title: '[Row 001] test',
  description: 'hello world',
  status: 'todo',
  priority: 'medium',
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/paperclip/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_PAPERCLIP_BASE_URL: 'http://localhost:3187',
    NEXT_PUBLIC_PAPERCLIP_COMPANY_ID: 'company-abc',
    PAPERCLIP_API_KEY: 'pc_test_key',
    PAPERCLIP_PROJECT_ID: 'project-xyz',
    // Agent mapping for server-side auto-route fallback
    NEXT_PUBLIC_PAPERCLIP_AGENT_FULLSTACK: 'agent-fs-env',
    NEXT_PUBLIC_PAPERCLIP_AGENT_DATABASE: 'agent-db-env',
    NEXT_PUBLIC_PAPERCLIP_AGENT_ARCHITECT: 'agent-arch-env',
  };

  // Default happy path for worktree mocks
  findRepoRootMock.mockResolvedValue('/fake/repo');
  createWorktreeMock.mockResolvedValue({
    paths: {
      slug: 'row-001',
      branchName: 'feature/paperclip-row-001',
      hostPath: '/fake/repo/.paperclip-worktrees/row-001',
      containerPath: '/workspace/.paperclip-worktrees/row-001',
      relativePath: '.paperclip-worktrees/row-001',
    },
    created: true,
    reused: false,
  });
  removeWorktreeMock.mockResolvedValue();
  installHookMock.mockResolvedValue({
    results: {
      'pre-commit': {
        hookPath: '/fake/repo/.git/hooks/pre-commit',
        installed: true,
        reason: 'installed',
      },
      'pre-merge-commit': {
        hookPath: '/fake/repo/.git/hooks/pre-merge-commit',
        installed: true,
        reason: 'installed',
      },
    },
  });
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('POST /api/paperclip/issues', () => {
  it('installs the pre-commit hook and continues even if hook install throws', async () => {
    installHookMock.mockRejectedValueOnce(new Error('ENOENT: no .git dir'));

    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-hook' },
      issueUrl: 'http://localhost:3187/VIS/issues/uuid-hook',
    });

    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(200);
    expect(installHookMock).toHaveBeenCalledTimes(1);
    // Worktree creation still happened despite the hook failure
    expect(createWorktreeMock).toHaveBeenCalledTimes(1);
    expect(createIssueMock).toHaveBeenCalledTimes(1);
  });

  it('creates worktree, enriches description, and forwards to createIssue', async () => {
    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-1', issueKey: 'VIS-42' },
      issueUrl: 'http://localhost:3187/VIS/issues/VIS-42',
    });

    const res = await POST(makeReq(validPayload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.issue.id).toBe('uuid-1');
    expect(body.worktree.branchName).toBe('feature/paperclip-row-001');
    expect(body.worktree.containerPath).toBe('/workspace/.paperclip-worktrees/row-001');

    // worktree creation ran once with slug derived from title, using the
    // docker git runner (pathScope=container).
    expect(findRepoRootMock).toHaveBeenCalledTimes(1);
    expect(createWorktreeMock).toHaveBeenCalledTimes(1);
    const createArgs = createWorktreeMock.mock.calls[0][0];
    expect(createArgs.paths.slug).toBe('row-001');
    expect(createArgs.pathScope).toBe('container');
    // The runner is the docker runner built by the route handler — just
    // assert it exists (shape check) so we don't couple the test to its
    // internal curried closure.
    expect(typeof createArgs.runner).toBe('function');

    // description was prefixed with the worktree protocol
    expect(createIssueMock).toHaveBeenCalledTimes(1);
    const dispatched = createIssueMock.mock.calls[0][0].payload;
    expect(dispatched.description).toContain('ISOLATED GIT WORKTREE');
    expect(dispatched.description).toContain('/workspace/.paperclip-worktrees/row-001');
    expect(dispatched.description).toContain('feature/paperclip-row-001');
    // and the original description still appears at the end
    expect(dispatched.description).toContain('hello world');
    // projectId was injected from env
    expect(dispatched.projectId).toBe('project-xyz');
  });

  it('does not inject projectId when PAPERCLIP_PROJECT_ID is unset', async () => {
    delete process.env.PAPERCLIP_PROJECT_ID;

    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-2' },
      issueUrl: 'http://localhost:3187/VIS/issues/uuid-2',
    });

    await POST(makeReq(validPayload));
    const dispatched = createIssueMock.mock.calls[0][0].payload;
    expect(dispatched.projectId).toBeUndefined();
  });

  it('passes through Paperclip error status (and does NOT include worktree in error body)', async () => {
    createIssueMock.mockResolvedValue({
      ok: false,
      status: 400,
      error: 'assigneeAgentId invalid',
    });

    const res = await POST(makeReq(validPayload));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('assigneeAgentId invalid');
    expect(body.worktree).toBeUndefined();
    expect(removeWorktreeMock).toHaveBeenCalledTimes(1);
    expect(removeWorktreeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/workspace',
        pathScope: 'container',
        deleteBranch: true,
        force: true,
      }),
    );
  });

  it('converts network errors from createIssue to 502', async () => {
    createIssueMock.mockResolvedValue({
      ok: false,
      status: 0,
      error: 'Network error: ECONNREFUSED',
    });

    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(502);
  });

  it('returns 500 when the worktree creation itself fails', async () => {
    createWorktreeMock.mockRejectedValue(new Error('fatal: branch already checked out'));

    const res = await POST(makeReq(validPayload));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('branch already checked out');
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it('returns 500 when PAPERCLIP_API_KEY is missing', async () => {
    delete process.env.PAPERCLIP_API_KEY;

    const res = await POST(makeReq(validPayload));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('PAPERCLIP_API_KEY not set');
    expect(createIssueMock).not.toHaveBeenCalled();
    expect(createWorktreeMock).not.toHaveBeenCalled();
  });

  it('returns 500 when base URL / company ID missing', async () => {
    delete process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID;

    const res = await POST(makeReq(validPayload));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('NEXT_PUBLIC_PAPERCLIP_COMPANY_ID');
    expect(createWorktreeMock).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed JSON body (before worktree creation)', async () => {
    const res = await POST(makeReq('{not-json'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('valid JSON');
    expect(createWorktreeMock).not.toHaveBeenCalled();
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it('returns 400 when title is empty (before worktree creation)', async () => {
    const res = await POST(makeReq({ ...validPayload, title: '' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('title and description are required');
    expect(createWorktreeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when description is missing', async () => {
    const { description: _unused, ...rest } = validPayload;
    void _unused;
    const res = await POST(makeReq(rest));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('title and description are required');
  });

  // ── Server-side auto-route fallback ──────────────────────────────────

  it('auto-routes to database agent when payload has no assigneeAgentId and title contains "資料庫"', async () => {
    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-auto-db' },
      issueUrl: 'http://localhost:3187/VIS/issues/uuid-auto-db',
    });

    const payload = {
      title: '[Row 007] 超級管理員-資料庫Elastic Search管理功能',
      description: 'task desc',
      status: 'todo' as const,
      priority: 'medium' as const,
      // No assigneeAgentId — server should auto-route.
    };

    const res = await POST(makeReq(payload));
    expect(res.status).toBe(200);

    const dispatched = createIssueMock.mock.calls[0][0].payload;
    expect(dispatched.assigneeAgentId).toBe('agent-db-env');
  });

  it('falls back to architect agent when no keyword matches', async () => {
    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-auto-arch' },
      issueUrl: 'http://localhost:3187/VIS/issues/uuid-auto-arch',
    });

    const payload = {
      title: '[Row 012] 買家的溝通中心',
      description: 'no keywords',
      status: 'todo' as const,
      priority: 'medium' as const,
    };

    const res = await POST(makeReq(payload));
    expect(res.status).toBe(200);

    const dispatched = createIssueMock.mock.calls[0][0].payload;
    expect(dispatched.assigneeAgentId).toBe('agent-arch-env');
  });

  it('does NOT override assigneeAgentId when client already supplied one', async () => {
    createIssueMock.mockResolvedValue({
      ok: true,
      issue: { id: 'uuid-manual' },
      issueUrl: 'http://localhost:3187/VIS/issues/uuid-manual',
    });

    const payload = {
      title: '[Row 001] 超級管理員-儀表板',
      description: 'manual assignment',
      status: 'todo' as const,
      priority: 'medium' as const,
      assigneeAgentId: 'agent-fs-explicit',
    };

    const res = await POST(makeReq(payload));
    expect(res.status).toBe(200);

    const dispatched = createIssueMock.mock.calls[0][0].payload;
    // Client-supplied agent takes priority — server must NOT overwrite.
    expect(dispatched.assigneeAgentId).toBe('agent-fs-explicit');
  });
});
