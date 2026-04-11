import {
  installPaperclipGitHook,
  PAPERCLIP_HOOK_MARKER,
  PAPERCLIP_PRE_COMMIT_HOOK,
} from '../git-hook';

/** Minimal in-memory fs just big enough for installPaperclipGitHook's needs. */
function makeFakeFs() {
  const files = new Map<string, { content: string; mode: number }>();
  const dirs = new Set<string>();

  const impl = {
    async readFile(p: string): Promise<string> {
      const f = files.get(p);
      if (!f) {
        const err = new Error(`ENOENT: ${p}`) as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      }
      return f.content;
    },
    async writeFile(p: string, content: string, opts?: { mode?: number }): Promise<void> {
      files.set(p, { content, mode: opts?.mode ?? 0o644 });
    },
    async mkdir(p: string, _opts?: { recursive?: boolean }): Promise<void> {
      dirs.add(p);
    },
    async chmod(p: string, mode: number): Promise<void> {
      const f = files.get(p);
      if (f) files.set(p, { ...f, mode });
    },
  };
  return { impl, files, dirs };
}

describe('installPaperclipGitHook', () => {
  const repoRoot = '/repo';
  const expectedPath = '/repo/.git/hooks/pre-commit';

  it('installs a fresh hook when no hook exists', async () => {
    const fake = makeFakeFs();
    const result = await installPaperclipGitHook(repoRoot, fake.impl as unknown as typeof import('node:fs').promises);

    expect(result.hookPath).toBe(expectedPath);
    expect(result.installed).toBe(true);
    expect(result.reason).toBe('installed');

    const written = fake.files.get(expectedPath);
    expect(written?.content).toBe(PAPERCLIP_PRE_COMMIT_HOOK);
    expect(written?.mode).toBe(0o755); // executable
    expect(fake.dirs.has('/repo/.git/hooks')).toBe(true);
  });

  it('refreshes content when the existing hook contains our marker', async () => {
    const fake = makeFakeFs();
    // Seed: stale version of the hook (still has marker, different body)
    fake.files.set(expectedPath, {
      content: `#!/bin/sh\n${PAPERCLIP_HOOK_MARKER}\nold body`,
      mode: 0o644,
    });

    const result = await installPaperclipGitHook(repoRoot, fake.impl as unknown as typeof import('node:fs').promises);

    expect(result.installed).toBe(true);
    expect(result.reason).toBe('already-present');

    const written = fake.files.get(expectedPath);
    expect(written?.content).toBe(PAPERCLIP_PRE_COMMIT_HOOK);
    expect(written?.mode).toBe(0o755); // chmod was re-applied
  });

  it('leaves a foreign (user-owned) hook untouched', async () => {
    const fake = makeFakeFs();
    const foreign = '#!/bin/sh\n# my own hook\necho hi';
    fake.files.set(expectedPath, { content: foreign, mode: 0o755 });

    const result = await installPaperclipGitHook(repoRoot, fake.impl as unknown as typeof import('node:fs').promises);

    expect(result.installed).toBe(false);
    expect(result.reason).toBe('foreign-hook');

    const after = fake.files.get(expectedPath);
    expect(after?.content).toBe(foreign); // untouched
  });
});

describe('PAPERCLIP_PRE_COMMIT_HOOK content', () => {
  it('short-circuits on non-paperclip branches', () => {
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('feature/paperclip-*');
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toMatch(/\*\)[\s\n]*exit 0/);
  });

  it('blocks modifications to existing migrations but allows new ones', () => {
    // `--diff-filter=MD -- 'supabase/migrations/*.sql'` → only modified/deleted
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain("--diff-filter=MD -- 'supabase/migrations/*.sql'");
  });

  it('enumerates the forbidden path regex alternation', () => {
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('\\.env');
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('package\\.json');
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('docker-compose');
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('apps/superadmin/\\.env\\.local');
  });

  it('writes to stderr and exits 1 on violation', () => {
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('exit 1');
    expect(PAPERCLIP_PRE_COMMIT_HOOK).toContain('>&2');
  });

  it('contains the marker comment on line 2', () => {
    const lines = PAPERCLIP_PRE_COMMIT_HOOK.split('\n');
    expect(lines[0]).toBe('#!/bin/sh');
    expect(lines[1]).toBe(PAPERCLIP_HOOK_MARKER);
  });
});
