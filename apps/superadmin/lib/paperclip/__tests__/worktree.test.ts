import {
  sanitizeSlug,
  resolveWorktreePaths,
  createWorktree,
  removeWorktree,
  findRepoRoot,
  deriveSlugFromTitle,
  buildWorktreePrefix,
  makeDockerGitRunner,
  WORKTREE_SUBDIR,
  BRANCH_PREFIX,
  type GitRunner,
  type CmdRunner,
} from '../worktree';

describe('sanitizeSlug', () => {
  it('lowercases and keeps alnum + dash', () => {
    expect(sanitizeSlug('VIS-42')).toBe('vis-42');
  });

  it('replaces spaces and symbols with dash', () => {
    expect(sanitizeSlug('Row 001 — Fix bug')).toBe('row-001-fix-bug');
  });

  it('trims leading/trailing dashes', () => {
    expect(sanitizeSlug('---foo---')).toBe('foo');
  });

  it('caps at 40 chars', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeSlug(long).length).toBe(40);
  });

  it('falls back to "task" for empty result', () => {
    expect(sanitizeSlug('')).toBe('task');
    expect(sanitizeSlug('!!!')).toBe('task');
  });
});

describe('resolveWorktreePaths', () => {
  it('produces consistent host + container + branch for a slug', () => {
    const paths = resolveWorktreePaths({
      slug: 'VIS-42',
      repoRoot: '/Users/me/repo',
    });
    expect(paths.slug).toBe('vis-42');
    expect(paths.branchName).toBe(`${BRANCH_PREFIX}vis-42`);
    expect(paths.hostPath).toBe(`/Users/me/repo/${WORKTREE_SUBDIR}/vis-42`);
    expect(paths.containerPath).toBe(`/workspace/${WORKTREE_SUBDIR}/vis-42`);
    expect(paths.relativePath).toBe(`${WORKTREE_SUBDIR}/vis-42`);
  });

  it('respects custom container root', () => {
    const paths = resolveWorktreePaths({
      slug: 'foo',
      repoRoot: '/Users/me/repo',
      containerRoot: '/app/code',
    });
    expect(paths.containerPath).toBe(`/app/code/${WORKTREE_SUBDIR}/foo`);
  });

  it('normalises repo root with spaces (macOS-style paths)', () => {
    const paths = resolveWorktreePaths({
      slug: 'Row 001',
      repoRoot: '/Volumes/KLEVV-4T-1/Real Estate Management Projects/my-repo',
    });
    expect(paths.slug).toBe('row-001');
    expect(paths.hostPath).toBe(
      '/Volumes/KLEVV-4T-1/Real Estate Management Projects/my-repo/.paperclip-worktrees/row-001',
    );
  });
});

describe('findRepoRoot', () => {
  it('calls git rev-parse --show-toplevel', async () => {
    const runner: GitRunner = jest
      .fn()
      .mockResolvedValue({ stdout: '/Users/me/repo\n', stderr: '' });
    const root = await findRepoRoot('/Users/me/repo/apps/superadmin', runner);
    expect(root).toBe('/Users/me/repo');
    expect(runner).toHaveBeenCalledWith(['rev-parse', '--show-toplevel'], {
      cwd: '/Users/me/repo/apps/superadmin',
    });
  });
});

describe('createWorktree', () => {
  const paths = resolveWorktreePaths({
    slug: 'VIS-42',
    repoRoot: '/Users/me/repo',
  });

  it('creates a new worktree when none exists', async () => {
    const calls: Array<{ args: readonly string[]; cwd?: string }> = [];
    const runner: GitRunner = jest.fn(async (args, opts) => {
      calls.push({ args, cwd: opts?.cwd });
      if (args[0] === 'worktree' && args[1] === 'list') {
        return { stdout: '', stderr: '' };
      }
      return { stdout: 'Preparing worktree\n', stderr: '' };
    });

    const result = await createWorktree({
      paths,
      repoRoot: '/Users/me/repo',
      runner,
    });

    expect(result.created).toBe(true);
    expect(result.reused).toBe(false);
    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual(['worktree', 'list', '--porcelain']);
    expect(calls[1].args).toEqual([
      'worktree',
      'add',
      '-b',
      'feature/paperclip-vis-42',
      paths.hostPath,
      'main',
    ]);
    expect(calls[1].cwd).toBe('/Users/me/repo');
  });

  it('reuses existing worktree when it already appears in git worktree list', async () => {
    const listOutput = [
      'worktree /Users/me/repo',
      'HEAD abc',
      'branch refs/heads/main',
      '',
      `worktree ${paths.hostPath}`,
      'HEAD def',
      `branch refs/heads/${paths.branchName}`,
      '',
    ].join('\n');

    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list') {
        return { stdout: listOutput, stderr: '' };
      }
      throw new Error('should not reach worktree add');
    });

    const result = await createWorktree({
      paths,
      repoRoot: '/Users/me/repo',
      runner,
    });

    expect(result.created).toBe(false);
    expect(result.reused).toBe(true);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('honours a custom baseBranch', async () => {
    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list') return { stdout: '', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await createWorktree({
      paths,
      repoRoot: '/Users/me/repo',
      baseBranch: 'develop',
      runner,
    });

    const addCall = (runner as jest.Mock).mock.calls[1][0];
    expect(addCall).toContain('develop');
  });

  it('propagates git errors wrapped with the attempted command', async () => {
    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list') return { stdout: '', stderr: '' };
      throw new Error('git worktree add -b feature/paperclip-vis-42 ... failed: fatal: branch already exists');
    });

    await expect(
      createWorktree({ paths, repoRoot: '/Users/me/repo', runner }),
    ).rejects.toThrow('branch already exists');
  });

  it('uses containerPath as worktree target when pathScope=container', async () => {
    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list') return { stdout: '', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await createWorktree({
      paths,
      repoRoot: '/workspace',
      pathScope: 'container',
      runner,
    });

    const addCall = (runner as jest.Mock).mock.calls[1][0];
    expect(addCall).toEqual([
      'worktree',
      'add',
      '-b',
      'feature/paperclip-vis-42',
      paths.containerPath, // /workspace/.paperclip-worktrees/vis-42
      'main',
    ]);
  });

  it('detects reuse by matching containerPath in the list when pathScope=container', async () => {
    const listOutput = `worktree ${paths.containerPath}\nbranch refs/heads/${paths.branchName}\n\n`;
    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree' && args[1] === 'list') return { stdout: listOutput, stderr: '' };
      throw new Error('should not reach worktree add');
    });

    const result = await createWorktree({
      paths,
      repoRoot: '/workspace',
      pathScope: 'container',
      runner,
    });

    expect(result.reused).toBe(true);
    expect(runner).toHaveBeenCalledTimes(1);
  });
});

describe('makeDockerGitRunner', () => {
  it('translates a git call into docker exec <container> git -C <cwd> <args>', async () => {
    const cmdRunner: CmdRunner = jest
      .fn()
      .mockResolvedValue({ stdout: 'ok', stderr: '' });
    const runner = makeDockerGitRunner('paperclip-paperclip-1', '/workspace', cmdRunner);

    await runner(['worktree', 'list', '--porcelain'], { cwd: '/workspace' });

    expect(cmdRunner).toHaveBeenCalledWith('docker', [
      'exec',
      'paperclip-paperclip-1',
      'git',
      '-C',
      '/workspace',
      'worktree',
      'list',
      '--porcelain',
    ]);
  });

  it('falls back to containerRoot when no cwd is given', async () => {
    const cmdRunner: CmdRunner = jest
      .fn()
      .mockResolvedValue({ stdout: '', stderr: '' });
    const runner = makeDockerGitRunner('paperclip-paperclip-1', '/app', cmdRunner);
    await runner(['status']);
    expect(cmdRunner).toHaveBeenCalledWith('docker', [
      'exec',
      'paperclip-paperclip-1',
      'git',
      '-C',
      '/app',
      'status',
    ]);
  });
});

describe('deriveSlugFromTitle', () => {
  it('extracts the row id from a "[Row NNN] ..." title', () => {
    expect(deriveSlugFromTitle('[Row 001] feature name')).toBe('row-001');
    expect(deriveSlugFromTitle('[row abc-12] something')).toBe('row-abc-12');
  });

  it('falls back to sanitised title prefix when no row tag', () => {
    expect(deriveSlugFromTitle('Fix the login bug please')).toBe('fix-the-login-bug-please');
  });

  it('falls back to timestamped slug when nothing usable remains', () => {
    const slug = deriveSlugFromTitle('!!!');
    expect(slug).toMatch(/^task-\d+$/);
  });
});

describe('buildWorktreePrefix', () => {
  const paths = resolveWorktreePaths({
    slug: 'VIS-42',
    repoRoot: '/Users/me/repo',
  });

  it('includes the container path, branch, and protocol rules', () => {
    const prefix = buildWorktreePrefix(paths);
    expect(prefix).toContain('/workspace/.paperclip-worktrees/vis-42');
    expect(prefix).toContain('feature/paperclip-vis-42');
    expect(prefix).toContain('DO NOT run `git push`');
    expect(prefix).toContain('DO NOT touch /workspace/');
    expect(prefix).toContain('ORIGINAL TASK DESCRIPTION BELOW');
  });

  it('includes the forbidden paths section and every declared pattern', () => {
    const prefix = buildWorktreePrefix(paths);
    expect(prefix).toContain('FORBIDDEN PATHS');
    // Every pattern from FORBIDDEN_PATH_PATTERNS must appear in the prefix.
    const { FORBIDDEN_PATH_PATTERNS } = jest.requireActual('../worktree') as typeof import('../worktree');
    for (const pattern of FORBIDDEN_PATH_PATTERNS) {
      expect(prefix).toContain(pattern);
    }
  });

  it('instructs the agent to stop + comment when a forbidden path is needed', () => {
    const prefix = buildWorktreePrefix(paths);
    expect(prefix).toContain('STOP and post a');
  });
});

describe('removeWorktree', () => {
  const paths = resolveWorktreePaths({
    slug: 'VIS-42',
    repoRoot: '/Users/me/repo',
  });

  it('calls git worktree remove', async () => {
    const runner: GitRunner = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await removeWorktree({ paths, repoRoot: '/Users/me/repo', runner });
    expect(runner).toHaveBeenCalledWith(
      ['worktree', 'remove', paths.hostPath],
      { cwd: '/Users/me/repo' },
    );
  });

  it('appends --force when requested', async () => {
    const runner: GitRunner = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await removeWorktree({
      paths,
      repoRoot: '/Users/me/repo',
      force: true,
      runner,
    });
    expect(runner).toHaveBeenCalledWith(
      ['worktree', 'remove', paths.hostPath, '--force'],
      { cwd: '/Users/me/repo' },
    );
  });

  it('deletes branch after remove when deleteBranch=true', async () => {
    const calls: readonly string[][] = [];
    const runner: GitRunner = jest.fn(async (args) => {
      (calls as string[][]).push([...args]);
      return { stdout: '', stderr: '' };
    });
    await removeWorktree({
      paths,
      repoRoot: '/Users/me/repo',
      deleteBranch: true,
      runner,
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(['worktree', 'remove', paths.hostPath]);
    expect(calls[1]).toEqual(['branch', '-D', paths.branchName]);
  });

  it('uses containerPath as the remove target when pathScope=container', async () => {
    const runner: GitRunner = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await removeWorktree({
      paths,
      repoRoot: '/workspace',
      pathScope: 'container',
      force: true,
      runner,
    });
    expect(runner).toHaveBeenCalledWith(
      ['worktree', 'remove', paths.containerPath, '--force'],
      { cwd: '/workspace' },
    );
  });
});
