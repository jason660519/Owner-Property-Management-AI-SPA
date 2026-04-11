// Paperclip git pre-commit hook installer (Phase G hard guardrail).
//
// The hook lives at `<repo>/.git/hooks/pre-commit` and is shared across ALL
// git worktrees (including the user's main checkout). It only activates when
// the current branch matches `feature/paperclip-*`, so the user's normal
// commits on main / develop / any non-paperclip branch are unaffected.
//
// On a Paperclip branch it rejects commits that touch forbidden paths — a
// hard backstop that runs even if the agent ignores the instructional prefix
// from buildWorktreePrefix.

import type { promises as fsPromises } from 'node:fs';
import path from 'node:path';

export const PAPERCLIP_HOOK_MARKER = '# PAPERCLIP_MANAGED_HOOK v1 — safe to delete, will be reinstalled';

/**
 * Hook body. POSIX sh so it runs both on the macOS host and inside the
 * Paperclip Docker container (which is where `git commit` actually executes
 * when the agent is working).
 */
export const PAPERCLIP_PRE_COMMIT_HOOK = `#!/bin/sh
${PAPERCLIP_HOOK_MARKER}
# Installed by apps/superadmin/lib/paperclip/git-hook.ts.
# Only enforces on feature/paperclip-* branches — your own work is untouched.
# If you stop using Paperclip, it is safe to delete this file.

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

case "$branch" in
  feature/paperclip-*)
    ;;
  *)
    exit 0
    ;;
esac

# Block modifications or deletions of already-committed migrations.
# NEW migrations (added files) are still allowed so agents can author
# fresh YYYYMMDDHHMMSS_*.sql files for low-risk tasks.
migration_mods=$(git diff --cached --name-only --diff-filter=MD -- 'supabase/migrations/*.sql' 2>/dev/null)

# Block any change (A/C/M/R/D) touching paths in this alternation.
other_forbidden=$(git diff --cached --name-only --diff-filter=ACMRD 2>/dev/null | grep -E '^(\\.env$|\\.env\\..+$|package\\.json$|package-lock\\.json$|pnpm-lock\\.yaml$|docker/.*\\.ya?ml$|docker-compose.*\\.ya?ml$|Dockerfile.*|\\.gitignore$|apps/superadmin/\\.env\\.local$)' 2>/dev/null)

if [ -n "$migration_mods" ] || [ -n "$other_forbidden" ]; then
  echo "" >&2
  echo "🛑 Paperclip pre-commit hook blocked this commit on branch: $branch" >&2
  if [ -n "$migration_mods" ]; then
    echo "" >&2
    echo "   Modifications/deletions of committed migrations are not allowed:" >&2
    printf '%s\\n' "$migration_mods" | sed 's/^/     /' >&2
    echo "   (New YYYYMMDDHHMMSS_*.sql files are OK — only edits to existing ones are blocked.)" >&2
  fi
  if [ -n "$other_forbidden" ]; then
    echo "" >&2
    echo "   Forbidden paths:" >&2
    printf '%s\\n' "$other_forbidden" | sed 's/^/     /' >&2
  fi
  echo "" >&2
  echo "   If this change is genuinely required, STOP and post a comment on" >&2
  echo "   the Paperclip issue describing what needs to change and why." >&2
  echo "   The human will handle it outside the Paperclip flow." >&2
  echo "" >&2
  exit 1
fi

exit 0
`;

export type InstallResult = {
  hookPath: string;
  installed: boolean;
  reason: 'installed' | 'already-present' | 'foreign-hook';
};

/**
 * Idempotently install the pre-commit hook.
 *
 * - No hook exists → write ours, chmod +x, reason="installed"
 * - Existing hook has our marker → overwrite (refresh), reason="already-present"
 * - Existing hook is foreign → leave it alone, reason="foreign-hook"
 *
 * @param repoRoot absolute path to the git repo's toplevel
 * @param fsImpl   fs.promises-compatible module (injectable for tests)
 */
export async function installPaperclipGitHook(
  repoRoot: string,
  fsImpl: typeof fsPromises,
): Promise<InstallResult> {
  const hooksDir = path.join(repoRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  await fsImpl.mkdir(hooksDir, { recursive: true });

  let existing: string | null = null;
  try {
    existing = await fsImpl.readFile(hookPath, 'utf8' as unknown as undefined) as unknown as string;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }

  if (existing == null) {
    await fsImpl.writeFile(hookPath, PAPERCLIP_PRE_COMMIT_HOOK, { mode: 0o755 });
    await fsImpl.chmod(hookPath, 0o755);
    return { hookPath, installed: true, reason: 'installed' };
  }

  if (existing.includes(PAPERCLIP_HOOK_MARKER)) {
    // Refresh: user may be running a newer Paperclip build with a smarter body.
    await fsImpl.writeFile(hookPath, PAPERCLIP_PRE_COMMIT_HOOK, { mode: 0o755 });
    await fsImpl.chmod(hookPath, 0o755);
    return { hookPath, installed: true, reason: 'already-present' };
  }

  // Foreign hook — respect user's existing work.
  return { hookPath, installed: false, reason: 'foreign-hook' };
}
