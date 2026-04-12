import {
  sanitizeSlug,
  resolveWorktreePaths,
  createWorktree,
  removeWorktree,
  findRepoRoot,
  deriveSlugFromTitle,
  buildWorktreePrefix,
  makeDockerGitRunner,
  parseWorktreePorcelain,
  listPaperclipWorktrees,
  parseCommitLog,
  clipDiff,
  getWorktreeDiff,
  mergeWorktreeBranch,
  findForbiddenPaths,
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

describe('parseWorktreePorcelain', () => {
  it('parses multiple blocks separated by blank lines', () => {
    const input = [
      'worktree /Users/me/repo',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /Users/me/repo/.paperclip-worktrees/row-001',
      'HEAD def456',
      'branch refs/heads/feature/paperclip-row-001',
      '',
    ].join('\n');

    const result = parseWorktreePorcelain(input);
    expect(result).toHaveLength(2);
    expect(result[0].worktree).toBe('/Users/me/repo');
    expect(result[0].head).toBe('abc123');
    expect(result[0].branch).toBe('refs/heads/main');
    expect(result[0].prunable).toBeUndefined();
    expect(result[1].worktree).toBe('/Users/me/repo/.paperclip-worktrees/row-001');
    expect(result[1].branch).toBe('refs/heads/feature/paperclip-row-001');
  });

  it('captures prunable flag (with and without a reason)', () => {
    const input = [
      'worktree /workspace/.paperclip-worktrees/foo',
      'HEAD abc',
      'branch refs/heads/feature/paperclip-foo',
      'prunable gitdir file points to non-existent location',
      '',
      'worktree /workspace/.paperclip-worktrees/bar',
      'branch refs/heads/feature/paperclip-bar',
      'prunable',
      '',
    ].join('\n');
    const result = parseWorktreePorcelain(input);
    expect(result[0].prunable).toBe('gitdir file points to non-existent location');
    expect(result[1].prunable).toBe(true);
  });

  it('captures unknown keys in extras for forward-compat', () => {
    const input = 'worktree /repo\nlocked some reason\ndetached\n';
    const result = parseWorktreePorcelain(input);
    expect(result[0].extras.locked).toBe('some reason');
    expect(result[0].extras.detached).toBe('');
  });

  it('tolerates trailing whitespace and extra blank lines', () => {
    const input = '\n\nworktree /repo\nbranch refs/heads/main\n\n\n';
    const result = parseWorktreePorcelain(input);
    expect(result).toHaveLength(1);
    expect(result[0].worktree).toBe('/repo');
  });
});

describe('listPaperclipWorktrees', () => {
  const porcelain = [
    'worktree /workspace',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree /workspace/.paperclip-worktrees/row-001',
    'HEAD def456',
    'branch refs/heads/feature/paperclip-row-001',
    'prunable gitdir broken',
    '',
    'worktree /workspace/.paperclip-worktrees/row-002',
    'HEAD 222222',
    'branch refs/heads/feature/paperclip-row-002',
    '',
    'worktree /some/other/worktree',
    'HEAD zzz',
    'branch refs/heads/feature/unrelated',
    '',
  ].join('\n');

  it('includes only branches starting with feature/paperclip- and enriches with metadata', async () => {
    const runner: GitRunner = jest.fn(async (args) => {
      const joined = args.join(' ');
      if (joined === 'worktree list --porcelain') {
        return { stdout: porcelain, stderr: '' };
      }
      if (joined.startsWith('rev-list --count main..feature/paperclip-row-001')) {
        return { stdout: '3\n', stderr: '' };
      }
      if (joined.startsWith('rev-list --count main..feature/paperclip-row-002')) {
        return { stdout: '0\n', stderr: '' };
      }
      if (joined.startsWith('log -1')) {
        // Format: %H\x1f%h\x1f%cI\x1f%s
        if (args[args.length - 1] === 'feature/paperclip-row-001') {
          return { stdout: 'def4567890abcdef\x1fdef4567\x1f2026-04-11T10:00:00+00:00\x1fchore: implement feature\n', stderr: '' };
        }
        if (args[args.length - 1] === 'feature/paperclip-row-002') {
          return { stdout: '2222222222222222\x1f2222222\x1f2026-04-10T09:00:00+00:00\x1fwip\n', stderr: '' };
        }
      }
      return { stdout: '', stderr: '' };
    });

    const result = await listPaperclipWorktrees({ repoRoot: '/workspace', runner });

    expect(result).toHaveLength(2);
    // Sorted by lastCommitAt desc — row-001 (10:00) before row-002 (09:00)
    expect(result[0].slug).toBe('row-001');
    expect(result[0].branchName).toBe('feature/paperclip-row-001');
    expect(result[0].path).toBe('/workspace/.paperclip-worktrees/row-001');
    expect(result[0].commitCount).toBe(3);
    expect(result[0].lastCommitShortSha).toBe('def4567');
    expect(result[0].lastCommitSubject).toBe('chore: implement feature');
    expect(result[0].lastCommitAt).toBe('2026-04-11T10:00:00+00:00');
    expect(result[0].prunable).toBe(true);
    expect(result[0].baseBranch).toBe('main');

    expect(result[1].slug).toBe('row-002');
    expect(result[1].commitCount).toBe(0);
    expect(result[1].prunable).toBe(false);
  });

  it('returns empty array when there are no paperclip worktrees', async () => {
    const runner: GitRunner = jest.fn().mockResolvedValue({
      stdout: 'worktree /workspace\nHEAD abc\nbranch refs/heads/main\n\n',
      stderr: '',
    });
    const result = await listPaperclipWorktrees({ repoRoot: '/workspace', runner });
    expect(result).toEqual([]);
  });

  it('tolerates commit-count failures with graceful fallback (0)', async () => {
    const runner: GitRunner = jest.fn(async (args) => {
      if (args[0] === 'worktree') return {
        stdout: [
          'worktree /workspace/.paperclip-worktrees/foo',
          'HEAD abc',
          'branch refs/heads/feature/paperclip-foo',
          '',
        ].join('\n'),
        stderr: '',
      };
      if (args[0] === 'rev-list') throw new Error('bad base branch');
      if (args[0] === 'log') return { stdout: '', stderr: '' };
      return { stdout: '', stderr: '' };
    });
    const result = await listPaperclipWorktrees({ repoRoot: '/workspace', runner });
    expect(result).toHaveLength(1);
    expect(result[0].commitCount).toBe(0);
    expect(result[0].lastCommitSha).toBeUndefined();
  });

  it('respects a custom baseBranch', async () => {
    const calls: string[][] = [];
    const runner: GitRunner = jest.fn(async (args) => {
      calls.push([...args]);
      if (args[0] === 'worktree') return {
        stdout: [
          'worktree /workspace/.paperclip-worktrees/foo',
          'branch refs/heads/feature/paperclip-foo',
          '',
        ].join('\n'),
        stderr: '',
      };
      return { stdout: '', stderr: '' };
    });
    await listPaperclipWorktrees({ repoRoot: '/workspace', baseBranch: 'develop', runner });
    const revListCall = calls.find((c) => c[0] === 'rev-list');
    expect(revListCall?.join(' ')).toContain('develop..feature/paperclip-foo');
  });
});

describe('parseCommitLog', () => {
  it('parses %H\\x1f%h\\x1f%s\\x1f%an\\x1f%cI lines', () => {
    const stdout = [
      'abc1234567890abc\x1fabc1234\x1ffeat: something\x1fPaperclip Agent\x1f2026-04-11T19:00:00+00:00',
      'def9876543210def\x1fdef9876\x1ffix: thing\x1fJason\x1f2026-04-10T10:00:00+00:00',
      '',
    ].join('\n');
    const commits = parseCommitLog(stdout);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toEqual({
      sha: 'abc1234567890abc',
      shortSha: 'abc1234',
      subject: 'feat: something',
      author: 'Paperclip Agent',
      at: '2026-04-11T19:00:00+00:00',
    });
    expect(commits[1].author).toBe('Jason');
  });

  it('returns empty array for empty input', () => {
    expect(parseCommitLog('')).toEqual([]);
    expect(parseCommitLog('\n\n')).toEqual([]);
  });

  it('skips malformed lines (fewer than 5 fields)', () => {
    const stdout = 'abc\x1fdef\x1fnot-enough-fields\n';
    expect(parseCommitLog(stdout)).toEqual([]);
  });
});

describe('clipDiff', () => {
  it('returns the diff unchanged when under the limit', () => {
    const r = clipDiff('small diff', 1000);
    expect(r.diff).toBe('small diff');
    expect(r.truncated).toBe(false);
    expect(r.totalBytes).toBe(10);
  });

  it('truncates and appends a marker when over the limit', () => {
    const big = 'x'.repeat(1000);
    const r = clipDiff(big, 100);
    expect(r.truncated).toBe(true);
    expect(r.totalBytes).toBe(1000);
    expect(r.diff.length).toBeGreaterThan(100);
    expect(r.diff).toContain('truncated');
    expect(r.diff).toContain('1,000'); // total
    expect(r.diff).toContain('100'); // shown
    expect(r.diff.startsWith('x'.repeat(100))).toBe(true);
  });
});

describe('getWorktreeDiff', () => {
  const makeRunner = (overrides: Record<string, { stdout: string; stderr?: string }> = {}): GitRunner => {
    const impl: GitRunner = async (args) => {
      const joined = args.join(' ');
      if (joined.startsWith('diff --stat')) {
        return { stdout: overrides.stat?.stdout ?? ' foo.ts | 2 +-\n 1 file changed\n', stderr: '' };
      }
      if (joined.startsWith('diff ')) {
        return { stdout: overrides.diff?.stdout ?? 'diff --git a/foo.ts b/foo.ts\n+new line\n', stderr: '' };
      }
      if (joined.startsWith('log ')) {
        return {
          stdout: overrides.log?.stdout ??
            'sha1234567890abc\x1fsha1234\x1ffeat: test\x1fAgent\x1f2026-04-11T10:00:00+00:00\n',
          stderr: '',
        };
      }
      return { stdout: '', stderr: '' };
    };
    return jest.fn(impl);
  };

  it('runs stat / diff / log in parallel and returns a snapshot', async () => {
    const runner = makeRunner();
    const result = await getWorktreeDiff({
      slug: 'row-001',
      repoRoot: '/workspace',
      runner,
    });

    expect(result.slug).toBe('row-001');
    expect(result.branch).toBe('feature/paperclip-row-001');
    expect(result.baseBranch).toBe('main');
    expect(result.stat).toContain('foo.ts');
    expect(result.diff).toContain('new line');
    expect(result.truncated).toBe(false);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].subject).toBe('feat: test');

    // Verify range passed to git is baseBranch..branch
    const calls = (runner as jest.Mock).mock.calls.map((c) => c[0].join(' '));
    expect(calls).toContain('diff --stat main..feature/paperclip-row-001');
    expect(calls).toContain('diff main..feature/paperclip-row-001');
    expect(calls.some((c) => c.includes('log --format='))).toBe(true);
  });

  it('sanitises the incoming slug', async () => {
    const runner = makeRunner();
    const result = await getWorktreeDiff({
      slug: '[Row 001] Foo',
      repoRoot: '/workspace',
      runner,
    });
    // sanitizeSlug strips brackets + lowercases + collapses to dashes
    expect(result.branch).toBe('feature/paperclip-row-001-foo');
  });

  it('honours a custom baseBranch', async () => {
    const runner = makeRunner();
    await getWorktreeDiff({
      slug: 'row-001',
      repoRoot: '/workspace',
      baseBranch: 'develop',
      runner,
    });
    const calls = (runner as jest.Mock).mock.calls.map((c) => c[0].join(' '));
    expect(calls.some((c) => c.includes('develop..feature/paperclip-row-001'))).toBe(true);
  });

  it('truncates diff when it exceeds maxDiffBytes', async () => {
    const bigDiff = 'x'.repeat(10_000);
    const runner = makeRunner({
      diff: { stdout: bigDiff },
    });
    const result = await getWorktreeDiff({
      slug: 'row-001',
      repoRoot: '/workspace',
      maxDiffBytes: 500,
      runner,
    });
    expect(result.truncated).toBe(true);
    expect(result.diffTotalBytes).toBe(10_000);
    expect(result.diff).toContain('truncated');
  });

  it('returns empty commits when there are no commits ahead', async () => {
    const runner = makeRunner({ log: { stdout: '' } });
    const result = await getWorktreeDiff({
      slug: 'row-001',
      repoRoot: '/workspace',
      runner,
    });
    expect(result.commits).toEqual([]);
  });
});

describe('findForbiddenPaths', () => {
  it('flags .env and variants', () => {
    expect(findForbiddenPaths(['.env'])).toEqual(['.env']);
    expect(findForbiddenPaths(['.env.local', '.env.production'])).toEqual([
      '.env.local',
      '.env.production',
    ]);
  });

  it('flags package manifests and lock files', () => {
    const files = ['package.json', 'package-lock.json', 'pnpm-lock.yaml'];
    expect(findForbiddenPaths(files)).toEqual(files);
  });

  it('flags docker configuration files', () => {
    expect(
      findForbiddenPaths([
        'docker-compose.yml',
        'docker/paperclip/docker-compose.paperclip.yml',
        'Dockerfile',
      ]),
    ).toEqual([
      'docker-compose.yml',
      'docker/paperclip/docker-compose.paperclip.yml',
      'Dockerfile',
    ]);
  });

  it('flags existing-looking migrations by naming convention', () => {
    expect(
      findForbiddenPaths(['supabase/migrations/20260101120000_init.sql']),
    ).toEqual(['supabase/migrations/20260101120000_init.sql']);
  });

  it('flags apps/superadmin/.env.local', () => {
    expect(findForbiddenPaths(['apps/superadmin/.env.local'])).toEqual([
      'apps/superadmin/.env.local',
    ]);
  });

  it('allows safe paths', () => {
    expect(
      findForbiddenPaths([
        'apps/superadmin/app/page.tsx',
        'README.md',
        'apps/superadmin/app/data/roadmap.ts',
      ]),
    ).toEqual([]);
  });
});

describe('mergeWorktreeBranch', () => {
  /** Build a GitRunner that answers a predefined script of commands.
   *  Each key is a prefix match on `args.join(' ')`. */
  function scriptRunner(script: Record<string, { stdout?: string; error?: string }>): GitRunner {
    return jest.fn(async (args) => {
      const key = args.join(' ');
      for (const prefix of Object.keys(script)) {
        if (key.startsWith(prefix)) {
          const r = script[prefix];
          if (r.error) throw new Error(r.error);
          return { stdout: r.stdout ?? '', stderr: '' };
        }
      }
      return { stdout: '', stderr: '' };
    });
  }

  const baseArgs = {
    slug: 'row-999',
    repoRoot: '/workspace',
  };

  it('returns ok:true with the new merge SHA on happy path', async () => {
    const runner = scriptRunner({
      'rev-parse --verify feature/paperclip-row-999': { stdout: 'abc\n' },
      'rev-list --count main..feature/paperclip-row-999': { stdout: '3\n' },
      'diff --name-only main..feature/paperclip-row-999': {
        stdout: 'apps/superadmin/app/page.tsx\napps/superadmin/README.md\n',
      },
      'rev-parse --abbrev-ref HEAD': { stdout: 'main\n' },
      'status --porcelain': { stdout: '' },
      '-c user.email=': { stdout: '' }, // the merge command
      'rev-parse HEAD': { stdout: 'newsha1234567890abcdef\n' },
    });

    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.mergeSha).toBe('newsha1234567890abcdef');
    expect(result.mergedBranch).toBe('feature/paperclip-row-999');
    expect(result.baseBranch).toBe('main');
    expect(result.commitsMerged).toBe(3);
  });

  it('returns branch-not-found when rev-parse --verify fails', async () => {
    const runner = scriptRunner({
      'rev-parse --verify': { error: "fatal: unknown revision 'feature/paperclip-row-999'" },
    });
    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('branch-not-found');
  });

  it('returns no-commits-ahead when rev-list count is 0', async () => {
    const runner = scriptRunner({
      'rev-parse --verify': { stdout: 'abc\n' },
      'rev-list --count': { stdout: '0\n' },
    });
    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('no-commits-ahead');
  });

  it('returns forbidden-paths with offending list when branch touches .env', async () => {
    const runner = scriptRunner({
      'rev-parse --verify': { stdout: 'abc\n' },
      'rev-list --count': { stdout: '1\n' },
      'diff --name-only': {
        stdout: '.env.local\napps/superadmin/app/page.tsx\npackage.json\n',
      },
    });
    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('forbidden-paths');
    expect(result.offendingPaths).toEqual(['.env.local', 'package.json']);
  });

  it('returns base-not-checked-out when HEAD is on another branch', async () => {
    const runner = scriptRunner({
      'rev-parse --verify': { stdout: 'abc\n' },
      'rev-list --count': { stdout: '1\n' },
      'diff --name-only': { stdout: 'apps/superadmin/app/page.tsx\n' },
      'rev-parse --abbrev-ref HEAD': { stdout: 'develop\n' },
    });
    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('base-not-checked-out');
    expect(result.message).toContain("'develop'");
  });

  it('returns base-dirty when working tree has uncommitted changes', async () => {
    const runner = scriptRunner({
      'rev-parse --verify': { stdout: 'abc\n' },
      'rev-list --count': { stdout: '1\n' },
      'diff --name-only': { stdout: 'apps/superadmin/app/page.tsx\n' },
      'rev-parse --abbrev-ref HEAD': { stdout: 'main\n' },
      'status --porcelain': { stdout: ' M foo.ts\n?? bar.txt\n' },
    });
    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('base-dirty');
  });

  it('aborts the merge and returns merge-conflict when git merge fails', async () => {
    const abortCalled = { count: 0 };
    const runner: GitRunner = jest.fn(async (args) => {
      const key = args.join(' ');
      if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
      if (key.startsWith('rev-list --count')) return { stdout: '1\n', stderr: '' };
      if (key.startsWith('diff --name-only')) return { stdout: 'apps/x.ts\n', stderr: '' };
      if (key.startsWith('rev-parse --abbrev-ref HEAD')) return { stdout: 'main\n', stderr: '' };
      if (key.startsWith('status --porcelain')) return { stdout: '', stderr: '' };
      if (key.startsWith('-c user.email=')) {
        throw new Error('CONFLICT (content): Merge conflict in foo.ts');
      }
      if (key.startsWith('merge --abort')) {
        abortCalled.count++;
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const result = await mergeWorktreeBranch({ ...baseArgs, runner });
    if (result.ok) throw new Error('expected failure');
    expect(result.reason).toBe('merge-conflict');
    expect(result.stderr).toContain('CONFLICT');
    expect(abortCalled.count).toBe(1);
  });

  it('passes committer identity inline via -c user.email / user.name', async () => {
    const calls: string[][] = [];
    const runner: GitRunner = jest.fn(async (args) => {
      calls.push([...args]);
      const key = args.join(' ');
      if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
      if (key.startsWith('rev-list --count')) return { stdout: '1\n', stderr: '' };
      if (key.startsWith('diff --name-only')) return { stdout: 'apps/x.ts\n', stderr: '' };
      if (key.startsWith('rev-parse --abbrev-ref HEAD')) return { stdout: 'main\n', stderr: '' };
      if (key.startsWith('status --porcelain')) return { stdout: '', stderr: '' };
      if (key.startsWith('rev-parse HEAD')) return { stdout: 'newsha\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    await mergeWorktreeBranch({
      ...baseArgs,
      committerEmail: 'me@example.com',
      committerName: 'Me',
      mergeMessage: 'Merge Phase K test',
      runner,
    });

    const mergeCall = calls.find((c) => c.includes('merge'));
    expect(mergeCall).toBeDefined();
    expect(mergeCall).toContain('-c');
    expect(mergeCall).toContain('user.email=me@example.com');
    expect(mergeCall).toContain('user.name=Me');
    expect(mergeCall).toContain('--no-ff');
    expect(mergeCall).toContain('--no-edit');
    expect(mergeCall).toContain('feature/paperclip-row-999');
    expect(mergeCall).toContain('Merge Phase K test');
  });

  it('respects a custom baseBranch', async () => {
    const calls: string[][] = [];
    const runner: GitRunner = jest.fn(async (args) => {
      calls.push([...args]);
      const key = args.join(' ');
      if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
      if (key.startsWith('rev-list --count')) return { stdout: '1\n', stderr: '' };
      if (key.startsWith('diff --name-only')) return { stdout: 'apps/x.ts\n', stderr: '' };
      if (key.startsWith('rev-parse --abbrev-ref HEAD')) return { stdout: 'develop\n', stderr: '' };
      if (key.startsWith('status --porcelain')) return { stdout: '', stderr: '' };
      if (key.startsWith('rev-parse HEAD')) return { stdout: 'sha\n', stderr: '' };
      return { stdout: '', stderr: '' };
    });

    const result = await mergeWorktreeBranch({
      ...baseArgs,
      baseBranch: 'develop',
      runner,
    });
    expect(result.ok).toBe(true);
    const revListCall = calls.find((c) => c[0] === 'rev-list');
    expect(revListCall?.join(' ')).toContain('develop..feature/paperclip-row-999');
  });

  describe('dryRun mode', () => {
    it('returns ok:true dryRun:true when all soft checks pass, no merge executed', async () => {
      const calls: string[][] = [];
      const runner: GitRunner = jest.fn(async (args) => {
        calls.push([...args]);
        const key = args.join(' ');
        if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
        if (key.startsWith('rev-list --count')) return { stdout: '3\n', stderr: '' };
        if (key.startsWith('diff --name-only')) return { stdout: 'apps/ok.ts\n', stderr: '' };
        return { stdout: '', stderr: '' };
      });

      const result = await mergeWorktreeBranch({
        ...baseArgs,
        dryRun: true,
        runner,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.dryRun).toBe(true);
      expect(result.mergeSha).toBe('');
      expect(result.commitsMerged).toBe(3);

      // The merge command must NOT have been invoked
      const mergeCall = calls.find((c) => c.includes('merge'));
      expect(mergeCall).toBeUndefined();

      // rev-parse HEAD and status --porcelain must also be skipped
      const abbrevCall = calls.find((c) => c.join(' ') === 'rev-parse --abbrev-ref HEAD');
      const statusCall = calls.find((c) => c.join(' ') === 'status --porcelain');
      expect(abbrevCall).toBeUndefined();
      expect(statusCall).toBeUndefined();
    });

    it('still blocks dry-run on branch-not-found', async () => {
      const runner: GitRunner = jest.fn(async () => {
        throw new Error("fatal: unknown revision 'feature/paperclip-row-999'");
      });
      const result = await mergeWorktreeBranch({ ...baseArgs, dryRun: true, runner });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.dryRun).toBe(true);
      expect(result.reason).toBe('branch-not-found');
    });

    it('still blocks dry-run on forbidden-paths with offending list', async () => {
      const runner: GitRunner = jest.fn(async (args) => {
        const key = args.join(' ');
        if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
        if (key.startsWith('rev-list --count')) return { stdout: '1\n', stderr: '' };
        if (key.startsWith('diff --name-only')) {
          return { stdout: '.env.local\npackage.json\napps/ok.ts\n', stderr: '' };
        }
        return { stdout: '', stderr: '' };
      });

      const result = await mergeWorktreeBranch({ ...baseArgs, dryRun: true, runner });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.dryRun).toBe(true);
      expect(result.reason).toBe('forbidden-paths');
      expect(result.offendingPaths).toEqual(['.env.local', 'package.json']);
    });

    it('still blocks dry-run on no-commits-ahead', async () => {
      const runner: GitRunner = jest.fn(async (args) => {
        const key = args.join(' ');
        if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
        if (key.startsWith('rev-list --count')) return { stdout: '0\n', stderr: '' };
        return { stdout: '', stderr: '' };
      });
      const result = await mergeWorktreeBranch({ ...baseArgs, dryRun: true, runner });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.dryRun).toBe(true);
      expect(result.reason).toBe('no-commits-ahead');
    });

    it('IGNORES base-dirty + base-not-checked-out in dry-run mode', async () => {
      // Dry-run skips the working-tree state checks entirely — that's the
      // whole point: lets you preview merge outcome without committing WIP.
      const runner: GitRunner = jest.fn(async (args) => {
        const key = args.join(' ');
        if (key.startsWith('rev-parse --verify')) return { stdout: 'abc\n', stderr: '' };
        if (key.startsWith('rev-list --count')) return { stdout: '1\n', stderr: '' };
        if (key.startsWith('diff --name-only')) return { stdout: 'apps/ok.ts\n', stderr: '' };
        // If the orchestrator tried to check HEAD or status, it would hit
        // this throw — and the test would fail.
        throw new Error('working-tree checks should not run in dry-run');
      });
      const result = await mergeWorktreeBranch({ ...baseArgs, dryRun: true, runner });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.dryRun).toBe(true);
    });
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
