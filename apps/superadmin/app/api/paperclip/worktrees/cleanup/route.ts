// POST /api/paperclip/worktrees/cleanup
//
// Removes a per-task git worktree + feature branch that was created by the
// Phase E workflow. Runs `git worktree remove` inside the Paperclip container
// via docker exec (same transport as /api/paperclip/issues) so admin files
// stay internally consistent.
//
// Request body: { slug: string; deleteBranch?: boolean; force?: boolean }
// Response:     { ok: true } | { ok: false; error: string; status?: number }

import { NextRequest, NextResponse } from 'next/server';
import {
  findRepoRoot,
  resolveWorktreePaths,
  removeWorktree,
  sanitizeSlug,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';

const PAPERCLIP_CONTAINER_NAME =
  process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';

interface CleanupRequestBody {
  slug: string;
  deleteBranch?: boolean;
  force?: boolean;
}

function isValidBody(body: unknown): body is CleanupRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.slug !== 'string' || b.slug.trim() === '') return false;
  if (b.deleteBranch !== undefined && typeof b.deleteBranch !== 'boolean') return false;
  if (b.force !== undefined && typeof b.force !== 'boolean') return false;
  return true;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: 400, error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        ok: false,
        status: 400,
        error: 'Invalid payload — `slug` (non-empty string) is required.',
      },
      { status: 400 },
    );
  }

  // Re-sanitize to match what createWorktree used — callers can pass either
  // a pre-sanitized slug or the raw form; both resolve to the same worktree.
  const slug = sanitizeSlug(body.slug);

  let repoRoot: string;
  try {
    repoRoot = await findRepoRoot(process.cwd());
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          err instanceof Error
            ? `Failed to resolve repo root: ${err.message}`
            : 'Failed to resolve repo root',
      },
      { status: 500 },
    );
  }

  const paths = resolveWorktreePaths({ slug, repoRoot });
  const runner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);

  try {
    await removeWorktree({
      paths,
      // repoRoot unused by the docker runner (it sets -C /workspace itself),
      // but passed for symmetry with host runner callers.
      repoRoot: '/workspace',
      // Same cross-container path constraint as createWorktree: git inside
      // the container only knows the `/workspace/...` path for this worktree.
      pathScope: 'container',
      force: body.force ?? true, // default force=true because worktree may have uncommitted files
      deleteBranch: body.deleteBranch ?? false,
      runner,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          err instanceof Error
            ? `Failed to remove worktree: ${err.message}`
            : 'Failed to remove worktree',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    slug: paths.slug,
    branchName: paths.branchName,
    containerPath: paths.containerPath,
    branchDeleted: body.deleteBranch ?? false,
  });
}
