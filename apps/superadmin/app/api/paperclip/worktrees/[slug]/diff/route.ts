// GET /api/paperclip/worktrees/[slug]/diff
//
// Returns the full git diff between the base branch (default `main`) and
// `feature/paperclip-<slug>`, plus stat and commit log. Used by the worktree
// browser page's inline diff viewer so humans can review agent work without
// leaving superadmin.
//
// Runs git inside the Paperclip container via docker runner so paths are
// consistent with Phase D/E bind-mount semantics.

import { NextRequest, NextResponse } from 'next/server';
import {
  getWorktreeDiff,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';

const PAPERCLIP_CONTAINER_NAME =
  process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';

/** Hard cap on the `?limit=` query param. Prevents accidental memory blowups. */
const ABSOLUTE_MAX_DIFF_BYTES = 1024 * 1024; // 1 MB
const DEFAULT_MAX_DIFF_BYTES = 256 * 1024;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug || slug.trim() === '') {
    return NextResponse.json(
      { ok: false, status: 400, error: 'Missing slug path parameter.' },
      { status: 400 },
    );
  }

  const baseBranch = request.nextUrl.searchParams.get('base') || 'main';

  let maxDiffBytes = DEFAULT_MAX_DIFF_BYTES;
  const limitParam = request.nextUrl.searchParams.get('limit');
  if (limitParam !== null) {
    const parsed = Number.parseInt(limitParam, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxDiffBytes = Math.min(parsed, ABSOLUTE_MAX_DIFF_BYTES);
    }
  }

  const runner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);

  try {
    const snapshot = await getWorktreeDiff({
      slug,
      baseBranch,
      repoRoot: '/workspace',
      maxDiffBytes,
      runner,
    });
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compute worktree diff';
    // "unknown revision" usually means the branch doesn't exist.
    const status = /unknown revision|bad revision|not a valid/.test(message) ? 404 : 500;
    return NextResponse.json(
      { ok: false, status, error: message },
      { status },
    );
  }
}
