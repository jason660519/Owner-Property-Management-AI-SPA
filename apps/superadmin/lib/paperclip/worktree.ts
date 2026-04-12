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

/** Summary of a single Paperclip worktree — produced by listPaperclipWorktrees. */
export interface WorktreeSummary {
  slug: string;
  branchName: string;
  /** The path git knows about for this worktree (container path when created
   *  via docker runner, host path when created on the host). */
  path: string;
  /** Commits on the branch ahead of the base branch. */
  commitCount: number;
  baseBranch: string;
  lastCommitSha?: string;
  lastCommitShortSha?: string;
  lastCommitSubject?: string;
  /** ISO 8601 timestamp of the most recent commit on the branch. */
  lastCommitAt?: string;
  /** Git reports "prunable" when the worktree admin files are broken — often
   *  a cross-container path artefact, not a real problem. */
  prunable: boolean;
  /** Optional mapping to the Paperclip issue that created this worktree. */
  issueId?: string;
  issueKey?: string;
}

/** Parse the porcelain v1 output of `git worktree list --porcelain`.
 *  Records are separated by blank lines; each non-empty line is `key value`. */
export interface RawWorktreeRecord {
  worktree: string;
  head?: string;
  branch?: string;
  /** Truthy if the `prunable` line was present (with or without a reason). */
  prunable?: string | true;
  /** Any other keys git emits (bare, detached, locked) — kept for forward-compat. */
  extras: Record<string, string>;
}

export function parseWorktreePorcelain(output: string): RawWorktreeRecord[] {
  const blocks = output.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const records: RawWorktreeRecord[] = [];
  for (const block of blocks) {
    const rec: RawWorktreeRecord = { worktree: '', extras: {} };
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const spaceIdx = trimmed.indexOf(' ');
      const key = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const value = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
      switch (key) {
        case 'worktree':
          rec.worktree = value;
          break;
        case 'HEAD':
          rec.head = value;
          break;
        case 'branch':
          rec.branch = value;
          break;
        case 'prunable':
          rec.prunable = value || true;
          break;
        default:
          rec.extras[key] = value;
      }
    }
    if (rec.worktree) records.push(rec);
  }
  return records;
}

export interface ListPaperclipWorktreesArgs {
  /** Git working directory passed as `cwd` to the runner. For host runner this
   *  is the host repo root; for docker runner this is ignored (runner uses
   *  container root). */
  repoRoot: string;
  baseBranch?: string;
  runner?: GitRunner;
}

/**
 * List all git worktrees whose branch starts with `feature/paperclip-` plus
 * commit count + last commit metadata. Used by the worktree browser page.
 */
export async function listPaperclipWorktrees(
  args: ListPaperclipWorktreesArgs,
): Promise<WorktreeSummary[]> {
  const { repoRoot, baseBranch = 'main' } = args;
  const runner = args.runner ?? defaultGitRunner;

  const { stdout } = await runner(['worktree', 'list', '--porcelain'], { cwd: repoRoot });
  const records = parseWorktreePorcelain(stdout);

  const summaries: WorktreeSummary[] = [];
  for (const rec of records) {
    if (!rec.branch) continue;
    const branchName = rec.branch.replace(/^refs\/heads\//, '');
    if (!branchName.startsWith(BRANCH_PREFIX)) continue;

    const slug = branchName.slice(BRANCH_PREFIX.length);

    // Commit count ahead of base. If `main` doesn't exist or the branch is
    // unrelated, tolerate the error and emit 0.
    let commitCount = 0;
    try {
      const { stdout: countOut } = await runner(
        ['rev-list', '--count', `${baseBranch}..${branchName}`],
        { cwd: repoRoot },
      );
      commitCount = Number.parseInt(countOut.trim(), 10) || 0;
    } catch {
      commitCount = 0;
    }

    // Last commit metadata — use a record separator git won't quote.
    let lastCommitSha: string | undefined;
    let lastCommitShortSha: string | undefined;
    let lastCommitSubject: string | undefined;
    let lastCommitAt: string | undefined;
    try {
      const { stdout: logOut } = await runner(
        ['log', '-1', '--format=%H%x1f%h%x1f%cI%x1f%s', branchName],
        { cwd: repoRoot },
      );
      const parts = logOut.trim().split('\x1f');
      if (parts.length >= 4) {
        [lastCommitSha, lastCommitShortSha, lastCommitAt, lastCommitSubject] = parts;
      }
    } catch {
      /* ignore — branch may have no commits */
    }

    summaries.push({
      slug,
      branchName,
      path: rec.worktree,
      commitCount,
      baseBranch,
      lastCommitSha,
      lastCommitShortSha,
      lastCommitSubject,
      lastCommitAt,
      prunable: rec.prunable !== undefined,
    });
  }

  // Most recent first when we have dates
  summaries.sort((a, b) => (b.lastCommitAt ?? '').localeCompare(a.lastCommitAt ?? ''));
  return summaries;
}

// ── getWorktreeDiff ────────────────────────────────────────────────────────

export interface WorktreeDiffCommit {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  /** ISO 8601 commit date. */
  at: string;
}

export interface WorktreeDiffResult {
  slug: string;
  branch: string;
  baseBranch: string;
  /** Output of `git diff --stat baseBranch..branch`. */
  stat: string;
  /** Output of `git diff baseBranch..branch`, optionally truncated. */
  diff: string;
  /** True when the diff was clipped to stay under `maxDiffBytes`. */
  truncated: boolean;
  /** Total byte length of the original diff before truncation. */
  diffTotalBytes: number;
  /** Commits on the branch ahead of base, newest first. */
  commits: WorktreeDiffCommit[];
}

export interface GetWorktreeDiffArgs {
  /** Raw slug — sanitised internally. */
  slug: string;
  baseBranch?: string;
  /** Git cwd (container root for docker runner). */
  repoRoot: string;
  /** Max bytes of raw diff content returned; extras clipped + truncated=true. */
  maxDiffBytes?: number;
  runner?: GitRunner;
}

const DEFAULT_MAX_DIFF_BYTES = 256 * 1024;

/** Parse git log output formatted with `%H\x1f%h\x1f%s\x1f%an\x1f%cI`. */
export function parseCommitLog(stdout: string): WorktreeDiffCommit[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\x1f');
      if (parts.length < 5) return null;
      const [sha, shortSha, subject, author, at] = parts;
      return { sha, shortSha, subject, author, at };
    })
    .filter((c): c is WorktreeDiffCommit => c !== null);
}

/** Clip a string to `maxBytes` (UTF-8 safe) and return the clipped string plus a
 *  boolean flag. We count by char length as a proxy — good enough for diffs
 *  which are mostly ASCII. */
export function clipDiff(raw: string, maxBytes: number): { diff: string; truncated: boolean; totalBytes: number } {
  const totalBytes = raw.length;
  if (totalBytes <= maxBytes) {
    return { diff: raw, truncated: false, totalBytes };
  }
  const clipped = raw.slice(0, maxBytes);
  return {
    diff: `${clipped}\n\n… (truncated — original diff was ${totalBytes.toLocaleString()} bytes, showing first ${maxBytes.toLocaleString()}) …\n`,
    truncated: true,
    totalBytes,
  };
}

/**
 * Fetch `git diff --stat` + full diff + commit log for the branch
 * `feature/paperclip-<slug>` compared against `baseBranch`. Returns a
 * self-contained snapshot suitable for the worktree browser diff viewer.
 */
export async function getWorktreeDiff(
  args: GetWorktreeDiffArgs,
): Promise<WorktreeDiffResult> {
  const {
    slug: rawSlug,
    baseBranch = 'main',
    repoRoot,
    maxDiffBytes = DEFAULT_MAX_DIFF_BYTES,
  } = args;
  const runner = args.runner ?? defaultGitRunner;
  const slug = sanitizeSlug(rawSlug);
  const branch = `${BRANCH_PREFIX}${slug}`;
  const range = `${baseBranch}..${branch}`;

  const [statRes, diffRes, logRes] = await Promise.all([
    runner(['diff', '--stat', range], { cwd: repoRoot }),
    runner(['diff', range], { cwd: repoRoot }),
    runner(
      ['log', '--format=%H%x1f%h%x1f%s%x1f%an%x1f%cI', range],
      { cwd: repoRoot },
    ),
  ]);

  const { diff, truncated, totalBytes } = clipDiff(diffRes.stdout, maxDiffBytes);

  return {
    slug,
    branch,
    baseBranch,
    stat: statRes.stdout,
    diff,
    truncated,
    diffTotalBytes: totalBytes,
    commits: parseCommitLog(logRes.stdout),
  };
}

// ── mergeWorktreeBranch ───────────────────────────────────────────────────

export type MergeBranchOutcome =
  | {
      ok: true;
      /** True when this was a dry run — no `git merge` was executed. */
      dryRun: boolean;
      /** Empty string for dry runs (no merge commit produced). */
      mergeSha: string;
      mergedBranch: string;
      baseBranch: string;
      commitsMerged: number;
    }
  | {
      ok: false;
      /** True when this was a dry run that hit a safety check. */
      dryRun: boolean;
      reason:
        | 'branch-not-found'
        | 'no-commits-ahead'
        | 'forbidden-paths'
        | 'base-dirty'
        | 'base-not-checked-out'
        | 'merge-conflict'
        | 'unknown';
      message: string;
      /** Populated for `forbidden-paths`. */
      offendingPaths?: string[];
      /** Populated for `merge-conflict` with the raw git stderr so the UI can surface detail. */
      stderr?: string;
    };

export interface MergeWorktreeBranchArgs {
  slug: string;
  baseBranch?: string;
  repoRoot: string;
  /** Commit author email — used via `git -c user.email=...` to work inside
   *  containers where no default user is configured. */
  committerEmail?: string;
  committerName?: string;
  /** Optional merge commit message. Defaults to a Phase-K template. */
  mergeMessage?: string;
  /** When true, runs every safety check but skips the actual `git merge`.
   *  Returns `ok: true` with `dryRun: true` if all checks pass, so the UI
   *  can confidently proceed to a real merge next. */
  dryRun?: boolean;
  runner?: GitRunner;
}

const DEFAULT_COMMITTER_EMAIL = 'paperclip@superadmin.local';
const DEFAULT_COMMITTER_NAME = 'Paperclip Merger';

/** Regex alternation of forbidden paths. Matches the pre-commit hook regex
 *  but evaluated server-side BEFORE we attempt the merge, so we reject with
 *  a clean message instead of letting git fail halfway. */
const FORBIDDEN_PATH_REGEX =
  /^(\.env$|\.env\..+$|package\.json$|package-lock\.json$|pnpm-lock\.yaml$|docker\/.*\.ya?ml$|docker-compose.*\.ya?ml$|Dockerfile.*|\.gitignore$|apps\/superadmin\/\.env\.local$)/;

/** Returns the subset of `files` that match the forbidden-path regex OR look
 *  like modifications to existing migration files (handled separately by the
 *  pre-commit hook, but we duplicate here since a server-side merge doesn't
 *  go through pre-commit). */
export function findForbiddenPaths(files: readonly string[]): string[] {
  return files.filter((f) => {
    if (FORBIDDEN_PATH_REGEX.test(f)) return true;
    // Committed migrations: any path under supabase/migrations/*.sql — we
    // can't tell "modification" vs "new" from the diff --name-only output
    // alone, but the pre-commit hook already allows new additions, so any
    // migration appearing here is suspicious. Be strict: block all.
    if (/^supabase\/migrations\/[0-9]{14}_.+\.sql$/.test(f)) return true;
    return false;
  });
}

/**
 * Safely merge a `feature/paperclip-<slug>` branch into its base branch.
 *
 * Run INSIDE the Paperclip container via the docker runner — that's where
 * /workspace's .git/ lives and where any pre-commit hook would eventually
 * apply. We pre-validate against FORBIDDEN_PATH_REGEX before attempting the
 * merge so the user sees a clean error rather than "fatal: hook failed".
 *
 * Failure modes (each distinguished by `reason`):
 *  - branch-not-found:      `git rev-parse --verify` failed
 *  - no-commits-ahead:      `rev-list --count base..branch` = 0
 *  - forbidden-paths:       server-side regex caught disallowed files
 *  - base-not-checked-out:  working tree HEAD is not `baseBranch`
 *  - base-dirty:            working tree has uncommitted changes
 *  - merge-conflict:        git merge exited non-zero (and we `merge --abort`)
 *  - unknown:               anything else (network, git binary missing, etc.)
 */
export async function mergeWorktreeBranch(
  args: MergeWorktreeBranchArgs,
): Promise<MergeBranchOutcome> {
  const {
    slug: rawSlug,
    baseBranch = 'main',
    repoRoot,
    committerEmail = DEFAULT_COMMITTER_EMAIL,
    committerName = DEFAULT_COMMITTER_NAME,
    dryRun = false,
  } = args;
  const runner = args.runner ?? defaultGitRunner;
  const slug = sanitizeSlug(rawSlug);
  const branch = `${BRANCH_PREFIX}${slug}`;
  const mergeMessage = args.mergeMessage || `Merge branch '${branch}' (Paperclip)`;

  // 1. Branch must exist.
  try {
    await runner(['rev-parse', '--verify', branch], { cwd: repoRoot });
  } catch (err) {
    return {
      ok: false,
      dryRun,
      reason: 'branch-not-found',
      message: err instanceof Error ? err.message : `Branch ${branch} not found`,
    };
  }

  // 2. Commits ahead of base must be > 0.
  let commitsAhead = 0;
  try {
    const { stdout } = await runner(
      ['rev-list', '--count', `${baseBranch}..${branch}`],
      { cwd: repoRoot },
    );
    commitsAhead = Number.parseInt(stdout.trim(), 10) || 0;
  } catch (err) {
    return {
      ok: false,
      dryRun,
      reason: 'unknown',
      message: err instanceof Error ? err.message : 'rev-list failed',
    };
  }
  if (commitsAhead === 0) {
    return {
      ok: false,
      dryRun,
      reason: 'no-commits-ahead',
      message: `${branch} has no commits ahead of ${baseBranch}`,
    };
  }

  // 3. Forbidden-path check — read name-only diff.
  try {
    const { stdout } = await runner(
      ['diff', '--name-only', `${baseBranch}..${branch}`],
      { cwd: repoRoot },
    );
    const files = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    const offending = findForbiddenPaths(files);
    if (offending.length > 0) {
      return {
        ok: false,
        dryRun,
        reason: 'forbidden-paths',
        message: `Branch touches ${offending.length} forbidden path(s). Merge aborted.`,
        offendingPaths: offending,
      };
    }
  } catch (err) {
    return {
      ok: false,
      dryRun,
      reason: 'unknown',
      message: err instanceof Error ? err.message : 'diff --name-only failed',
    };
  }

  // Checks 4 + 5 only apply when actually merging — dry-run doesn't care
  // about the working tree state, since we're simulating the merge outcome
  // not actually touching main.
  if (!dryRun) {
    // 4. Working tree must be on baseBranch.
    try {
      const { stdout } = await runner(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot });
      const currentBranch = stdout.trim();
      if (currentBranch !== baseBranch) {
        return {
          ok: false,
          dryRun,
          reason: 'base-not-checked-out',
          message: `Working tree is on '${currentBranch}', expected '${baseBranch}'. Switch branches and try again.`,
        };
      }
    } catch (err) {
      return {
        ok: false,
        dryRun,
        reason: 'unknown',
        message: err instanceof Error ? err.message : 'rev-parse HEAD failed',
      };
    }

    // 5. Working tree must be clean (no staged or unstaged changes).
    try {
      const { stdout } = await runner(['status', '--porcelain'], { cwd: repoRoot });
      if (stdout.trim().length > 0) {
        return {
          ok: false,
          dryRun,
          reason: 'base-dirty',
          message: `${baseBranch} has uncommitted changes. Commit or stash them first.`,
        };
      }
    } catch (err) {
      return {
        ok: false,
        dryRun,
        reason: 'unknown',
        message: err instanceof Error ? err.message : 'status --porcelain failed',
      };
    }
  }

  // Dry-run: all soft checks passed, return success without touching git.
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      mergeSha: '',
      mergedBranch: branch,
      baseBranch,
      commitsMerged: commitsAhead,
    };
  }

  // 6. Do the merge. Supply committer inline so it works in a container
  //    where global git config may be absent. Use --no-ff for a merge commit.
  try {
    await runner(
      [
        '-c',
        `user.email=${committerEmail}`,
        '-c',
        `user.name=${committerName}`,
        'merge',
        '--no-ff',
        '--no-edit',
        '-m',
        mergeMessage,
        branch,
      ],
      { cwd: repoRoot },
    );
  } catch (err) {
    const stderr = err instanceof Error ? err.message : String(err);
    // Best-effort abort so the working tree isn't left in a half-merged state.
    try {
      await runner(['merge', '--abort'], { cwd: repoRoot });
    } catch {
      /* ignore — if abort fails the user will see the state next time */
    }
    return {
      ok: false,
      dryRun: false,
      reason: 'merge-conflict',
      message: 'Merge failed — aborted and rolled back working tree.',
      stderr,
    };
  }

  // 7. Capture the new HEAD SHA.
  let mergeSha = '';
  try {
    const { stdout } = await runner(['rev-parse', 'HEAD'], { cwd: repoRoot });
    mergeSha = stdout.trim();
  } catch {
    /* ignore — merge succeeded, SHA discovery is cosmetic */
  }

  return {
    ok: true,
    dryRun: false,
    mergeSha,
    mergedBranch: branch,
    baseBranch,
    commitsMerged: commitsAhead,
  };
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
