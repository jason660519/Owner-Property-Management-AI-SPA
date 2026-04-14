// POST /api/paperclip/worktrees/[slug]/merge
//
// Server-side merge of `feature/paperclip-<slug>` into its base branch
// (default `main`). Runs git inside the Paperclip container via docker
// runner so paths stay consistent with Phase D/E bind-mount semantics.
//
// The heavy lifting + safety checks live in mergeWorktreeBranch() in
// lib/paperclip/worktree.ts. This route is a thin wrapper that:
//  - accepts optional { baseBranch, mergeMessage } in the body
//  - translates the orchestrator outcome to HTTP status codes
//  - (optionally) runs the worktree cleanup when `cleanup: true` is passed
//    and the merge succeeded.

import { NextRequest, NextResponse } from 'next/server';
import {
  mergeWorktreeBranch,
  removeWorktree,
  resolveWorktreePaths,
  sanitizeSlug,
  makeDockerGitRunner,
  type MergeBranchOutcome,
} from '@/lib/paperclip/worktree';
import { addEntry } from '@/lib/paperclip/merge-history';

const PAPERCLIP_CONTAINER_NAME =
  process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';

interface MergeRequestBody {
  baseBranch?: string;
  mergeMessage?: string;
  /** Remove the worktree + branch after a successful merge. Default: false. */
  cleanup?: boolean;
  /** When true, runs every safety check but does NOT perform the actual
   *  merge. Used by the "Dry run" button in the diff viewer to preview
   *  outcome without touching main. */
  dryRun?: boolean;
}

function isValidBody(body: unknown): body is MergeRequestBody {
  if (body === null || body === undefined) return true;
  if (typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (b.baseBranch !== undefined && typeof b.baseBranch !== 'string') return false;
  if (b.mergeMessage !== undefined && typeof b.mergeMessage !== 'string') return false;
  if (b.cleanup !== undefined && typeof b.cleanup !== 'boolean') return false;
  if (b.dryRun !== undefined && typeof b.dryRun !== 'boolean') return false;
  return true;
}

/** HTTP status for each MergeBranchOutcome failure reason. Clients use this
 *  to decide whether to prompt the user, block retries, or fail loudly. */
function httpStatusForReason(reason: Extract<MergeBranchOutcome, { ok: false }>['reason']): number {
  switch (reason) {
    case 'branch-not-found':      return 404;
    case 'no-commits-ahead':      return 400;
    case 'forbidden-paths':       return 422;
    case 'base-not-checked-out':  return 409;
    case 'base-dirty':            return 409;
    case 'merge-conflict':        return 409;
    case 'unknown':               return 500;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug || slug.trim() === '') {
    return NextResponse.json(
      { ok: false, reason: 'unknown', message: 'Missing slug path parameter.' },
      { status: 400 },
    );
  }

  // Body is optional — accept empty POST for default behaviour.
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'unknown', message: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }
  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unknown',
        message: 'Invalid body — baseBranch/mergeMessage must be strings and cleanup must be a boolean.',
      },
      { status: 400 },
    );
  }

  const runner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);
  const result = await mergeWorktreeBranch({
    slug,
    baseBranch: body?.baseBranch,
    mergeMessage: body?.mergeMessage,
    dryRun: body?.dryRun,
    repoRoot: '/workspace',
    runner,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: httpStatusForReason(result.reason) });
  }

  // Dry-run never runs cleanup (nothing to clean up — nothing was merged).
  if (result.dryRun) {
    return NextResponse.json({
      ...result,
      cleanup: { requested: false, ok: null },
    });
  }

  // Record in merge history
  addEntry({
    slug: sanitizeSlug(slug),
    branch: result.mergedBranch,
    status: 'merged',
    mergeSha: result.mergeSha,
    commitsMerged: result.commitsMerged,
  }).catch(() => { /* best-effort — don't fail the merge response */ });

  // Optional post-merge cleanup. Failures here don't invalidate the merge
  // itself, so we annotate the response but still return 200.
  let cleanupOk: boolean | null = null;
  let cleanupError: string | undefined;
  if (body?.cleanup === true) {
    try {
      const paths = resolveWorktreePaths({ slug: sanitizeSlug(slug), repoRoot: '/workspace' });
      await removeWorktree({
        paths,
        repoRoot: '/workspace',
        pathScope: 'container',
        force: true,
        deleteBranch: true,
        runner,
      });
      cleanupOk = true;
    } catch (err) {
      cleanupOk = false;
      cleanupError = err instanceof Error ? err.message : 'cleanup failed';
    }
  }

  return NextResponse.json({
    ...result,
    cleanup: {
      requested: body?.cleanup === true,
      ok: cleanupOk,
      error: cleanupError,
    },
  });
}
