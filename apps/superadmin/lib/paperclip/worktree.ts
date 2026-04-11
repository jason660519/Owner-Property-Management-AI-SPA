// Git worktree manager for Paperclip per-task isolation (Phase E).
//
// Every "send to Paperclip" action creates a fresh git worktree at
// <repo_root>/.paperclip-worktrees/<branch>/ and a matching branch
// feature/paperclip-<slug>. The Paperclip agent is instructed to do ALL its
// file operations inside that subdirectory — the main tree is never touched.
//
// The branch lives in the same .git/ so it's trivial to inspect via
// `git diff main..feature/paperclip-<slug>` or `git log`.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

/** Subdirectory inside the repo where per-task worktrees live. */
export const WORKTREE_SUBDIR = '.paperclip-worktrees';

/** Branch prefix for all Paperclip-managed branches. */
export const BRANCH_PREFIX = 'feature/paperclip-';

/** Container-side mount point (matches docker-compose bind mount). */
const CONTAINER_WORKSPACE_ROOT = '/workspace';

export interface WorktreePaths {
  /** Sanitized slug used in branch name + worktree dir name. */
  slug: string;
  /** Branch name — feature/paperclip-<slug>. */
  branchName: string;
  /** Absolute host path (macOS path, what execFile needs). */
  hostPath: string;
  /** Absolute container path (what Paperclip agent sees). */
  containerPath: string;
  /** Relative path from repo root. */
  relativePath: string;
}

/** Sanitize a slug: allow [a-zA-Z0-9-], lowercase, max 40 chars,
 *  trim leading/trailing dashes, fall back to 'task' if empty. */
export function sanitizeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'task';
}

export interface ResolveWorktreePathsArgs {
  /** Typically the Paperclip issueKey (e.g., "VIS-42") or rowId. */
  slug: string;
  /** Absolute host path to the repo root. */
  repoRoot: string;
  /** Container path the repo root is bind-mounted to. Defaults to /workspace. */
  containerRoot?: string;
}

export function resolveWorktreePaths(args: ResolveWorktreePathsArgs): WorktreePaths {
  const slug = sanitizeSlug(args.slug);
  const branchName = `${BRANCH_PREFIX}${slug}`;
  const relativePath = path.posix.join(WORKTREE_SUBDIR, slug);
  const hostPath = path.join(args.repoRoot, WORKTREE_SUBDIR, slug);
  const containerRoot = args.containerRoot ?? CONTAINER_WORKSPACE_ROOT;
  const containerPath = path.posix.join(containerRoot, WORKTREE_SUBDIR, slug);
  return { slug, branchName, hostPath, containerPath, relativePath };
}

/** Thin wrapper around execFile so tests can inject. Used for BOTH host git
 *  and docker exec (via different runners). Keeps everything pure. */
export type CmdRunner = (
  cmd: string,
  args: readonly string[],
  opts?: { cwd?: string },
) => Promise<{ stdout: string; stderr: string }>;

/** Back-compat alias — existing callers still pass `GitRunner` but we treat
 *  it as "run git with these args". Internally we adapt to CmdRunner. */
export type GitRunner = (
  args: readonly string[],
  opts?: { cwd?: string },
) => Promise<{ stdout: string; stderr: string }>;

export const defaultCmdRunner: CmdRunner = async (cmd, args, opts) => {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, [...args], {
      cwd: opts?.cwd,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { stdout: String(stdout), stderr: String(stderr) };
  } catch (err: unknown) {
    if (isExecError(err)) {
      const msg =
        err.stderr?.toString().trim() ||
        err.stdout?.toString().trim() ||
        err.message;
      throw new Error(`${cmd} ${args.join(' ')} failed: ${msg}`);
    }
    throw err;
  }
};

/** Legacy default — wraps `defaultCmdRunner` to run git on the host. Still
 *  exported because some tests and helpers use it directly. */
export const defaultGitRunner: GitRunner = (args, opts) => defaultCmdRunner('git', args, opts);

/**
 * Build a CmdRunner that executes git INSIDE the Paperclip container via
 * `docker exec`. The worktree's admin files (`.git/worktrees/<slug>/gitdir`
 * etc.) end up with container paths like `/workspace/.git/...`, which is
 * what the agent needs — and host-side introspection via `git log branch`
 * from the main tree still works because refs live in the shared .git/.
 */
export function makeDockerGitRunner(
  containerName: string,
  containerRoot = '/workspace',
  cmdRunner: CmdRunner = defaultCmdRunner,
): GitRunner {
  return async (args, opts) => {
    // `cwd` in the original GitRunner interface refers to the git invocation's
    // working directory; we translate it to `-C <path>` because docker exec
    // doesn't forward host cwd.
    const gitCwdFlag = opts?.cwd ? ['-C', opts.cwd] : ['-C', containerRoot];
    const dockerArgs = ['exec', containerName, 'git', ...gitCwdFlag, ...args];
    return cmdRunner('docker', dockerArgs);
  };
}

function isExecError(
  e: unknown,
): e is { stdout?: string | Buffer; stderr?: string | Buffer; message: string } {
  return typeof e === 'object' && e !== null && 'message' in e;
}

/** Find the repo root via `git rev-parse --show-toplevel`. Safe to call from
 *  anywhere inside the repo. */
export async function findRepoRoot(
  startDir: string,
  runner: GitRunner = defaultGitRunner,
): Promise<string> {
  const { stdout } = await runner(['rev-parse', '--show-toplevel'], { cwd: startDir });
  return stdout.trim();
}

export interface CreateWorktreeArgs {
  paths: WorktreePaths;
  /** Git working directory (where `git -C` points). Host repo root when using
   *  the host git runner, container workspace root when using the docker runner. */
  repoRoot: string;
  /** Base branch to fork from (e.g., 'main'). */
  baseBranch?: string;
  /** Which path field to pass to `git worktree add`. `host` by default — use
   *  `container` when the runner executes git inside the Paperclip container
   *  so the stored admin paths are container-valid. */
  pathScope?: 'host' | 'container';
  runner?: GitRunner;
}

export interface CreateWorktreeResult {
  paths: WorktreePaths;
  created: boolean;
  /** If the worktree already existed, we reuse it and set reused=true. */
  reused: boolean;
}

/**
 * Create a fresh git worktree + branch. Idempotent — if the worktree already
 * exists (same branch from a prior run), reuse it silently. Returns the
 * WorktreePaths with `reused` flag.
 */
export async function createWorktree(
  args: CreateWorktreeArgs,
): Promise<CreateWorktreeResult> {
  const { paths, repoRoot, baseBranch = 'main', pathScope = 'host' } = args;
  const runner = args.runner ?? defaultGitRunner;

  const targetPath = pathScope === 'container' ? paths.containerPath : paths.hostPath;

  // Check if worktree already exists (match against the target-scope path).
  const { stdout: list } = await runner(['worktree', 'list', '--porcelain'], { cwd: repoRoot });
  if (list.includes(`worktree ${targetPath}\n`) || list.includes(`worktree ${targetPath}`)) {
    return { paths, created: false, reused: true };
  }

  // Create new worktree with a fresh branch off baseBranch.
  // `-b <newBranch>` creates the branch, `<baseBranch>` is the start point.
  await runner(
    ['worktree', 'add', '-b', paths.branchName, targetPath, baseBranch],
    { cwd: repoRoot },
  );
  return { paths, created: true, reused: false };
}

export interface RemoveWorktreeArgs {
  paths: WorktreePaths;
  repoRoot: string;
  /** Whether to force removal even if the worktree has uncommitted changes. */
  force?: boolean;
  /** Also delete the branch after removing the worktree. Default: false. */
  deleteBranch?: boolean;
  /** Which path scope to pass to `git worktree remove`. Must match the scope
   *  used when the worktree was created. `host` by default. */
  pathScope?: 'host' | 'container';
  runner?: GitRunner;
}

export async function removeWorktree(args: RemoveWorktreeArgs): Promise<void> {
  const { paths, repoRoot, force, deleteBranch, pathScope = 'host' } = args;
  const runner = args.runner ?? defaultGitRunner;
  const targetPath = pathScope === 'container' ? paths.containerPath : paths.hostPath;
  const removeArgs = ['worktree', 'remove', targetPath];
  if (force) removeArgs.push('--force');
  await runner(removeArgs, { cwd: repoRoot });
  if (deleteBranch) {
    await runner(['branch', '-D', paths.branchName], { cwd: repoRoot });
  }
}

/** Derive a branch-friendly slug from an issue title like "[Row 001] Foo".
 *  Falls back to "task-<timestamp>" when nothing usable is found. */
export function deriveSlugFromTitle(title: string): string {
  const rowMatch = title.match(/\[Row\s+([A-Za-z0-9-]+)\]/i);
  if (rowMatch) return `row-${sanitizeSlug(rowMatch[1])}`;
  const cleaned = sanitizeSlug(title.slice(0, 40));
  return cleaned === 'task' ? `task-${Date.now()}` : cleaned;
}

/** Glob/regex patterns the agent must NEVER modify. Soft guardrail via the
 *  task description; hard enforcement can be added later via a git pre-commit
 *  hook. Update this list when new high-risk areas are introduced. */
export const FORBIDDEN_PATH_PATTERNS: readonly string[] = [
  '.env and any .env.*',
  'supabase/migrations/*.sql (NEVER edit or delete a committed migration — only add new YYYYMMDDHHMMSS_*.sql files)',
  'package.json, package-lock.json, pnpm-lock.yaml (NEVER change dependencies without explicit approval)',
  'docker/**/*.yml, docker-compose*.yml, Dockerfile*',
  'apps/superadmin/.env.local (contains Paperclip API keys)',
  '.git/** (never touch git internals)',
  '.gitignore (propose changes in your comment instead of editing)',
];

/** Build the instructional prefix prepended to every Paperclip issue
 *  description so the agent knows it must cd into its isolated worktree and
 *  respect the forbidden path list. */
export function buildWorktreePrefix(paths: WorktreePaths): string {
  const forbidden = FORBIDDEN_PATH_PATTERNS.map((p) => `   ✗ ${p}`).join('\n');
  return [
    '🛡️  ISOLATED GIT WORKTREE — follow these rules before any file operation 🛡️',
    '',
    `Your working directory MUST be: ${paths.containerPath}`,
    `This is a git worktree on branch \`${paths.branchName}\` (forked from main).`,
    '',
    'Required protocol:',
    `1. cd ${paths.containerPath}`,
    `2. Verify with: git branch --show-current   (expect: ${paths.branchName})`,
    '3. All reads, edits, and new files MUST use paths inside this directory.',
    '4. Use `git add` and `git commit` to save your work onto this branch.',
    '5. DO NOT touch /workspace/ (the main tree) or anything outside this worktree.',
    '6. DO NOT run `git push` — the human will review and push.',
    '',
    '🚫 FORBIDDEN PATHS — you must NOT create, edit, or delete these:',
    forbidden,
    '',
    'If the task seems to require touching a forbidden path, STOP and post a',
    'comment explaining what would need to change and why, instead of making',
    'the edit. The human will decide.',
    '',
    'When finished, post a final comment on this issue listing:',
    `- The branch name (\`${paths.branchName}\`)`,
    '- The files you created or modified (relative to this worktree)',
    '- A one-line summary of what to review.',
    '',
    '────────────── ORIGINAL TASK DESCRIPTION BELOW ──────────────',
    '',
  ].join('\n');
}
