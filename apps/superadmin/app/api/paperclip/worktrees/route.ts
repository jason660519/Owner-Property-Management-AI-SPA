// GET /api/paperclip/worktrees
//
// Returns a live list of all Paperclip-managed worktrees by shelling out
// `git worktree list --porcelain` inside the Paperclip container (so the
// paths that come back are the `/workspace/...` ones Paperclip itself uses,
// and agents in the middle of a run won't trip over stale host paths).
//
// Used by /superadmin/dashboard/paperclip-worktrees to render the mission
// control table.

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  WORKTREE_SUBDIR,
  listPaperclipWorktrees,
  makeDockerGitRunner,
  findRepoRoot,
  sanitizeSlug,
  type WorktreeSummary,
} from '@/lib/paperclip/worktree';

const PAPERCLIP_CONTAINER_NAME =
  process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';
const WORKTREE_META_FILENAME = '.paperclip-meta.json';
const CONTAINER_WORKSPACE_ROOT = '/workspace';

interface WorktreeIssueMeta {
  issueId?: string;
  issueKey?: string;
}

async function readWorktreeIssueMeta(
  repoRoot: string,
  slug: string,
): Promise<WorktreeIssueMeta | null> {
  const safeSlug = sanitizeSlug(slug);
  if (safeSlug !== slug) return null;
  const baseDir = path.join(repoRoot, WORKTREE_SUBDIR);
  const filePath = path.join(baseDir, safeSlug, WORKTREE_META_FILENAME);
  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(`${resolvedBase}${path.sep}`)) {
    return null;
  }
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      issueId: typeof parsed.issueId === 'string' ? parsed.issueId : undefined,
      issueKey: typeof parsed.issueKey === 'string' ? parsed.issueKey : undefined,
    };
  } catch {
    return null;
  }
}

function mapContainerPathToHost(pathInContainer: string, hostRepoRoot: string): string {
  if (!pathInContainer.startsWith(`${CONTAINER_WORKSPACE_ROOT}/`)) {
    return pathInContainer;
  }
  const relative = pathInContainer.slice(CONTAINER_WORKSPACE_ROOT.length + 1);
  return path.join(hostRepoRoot, relative);
}

export interface ListWorktreesResponse {
  ok: true;
  worktrees: WorktreeSummary[];
}

export async function GET(_request: NextRequest) {
  const runner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);

  try {
    const worktrees = await listPaperclipWorktrees({
      repoRoot: '/workspace',
      runner,
    });
    const hostRepoRoot = await findRepoRoot(process.cwd());
    const enriched: WorktreeSummary[] = await Promise.all(
      worktrees.map(async (worktree) => {
        const meta = await readWorktreeIssueMeta(hostRepoRoot, worktree.slug);
        return {
          ...worktree,
          path: mapContainerPathToHost(worktree.path, hostRepoRoot),
          issueId: meta?.issueId,
          issueKey: meta?.issueKey,
        };
      }),
    );
    const payload: ListWorktreesResponse = { ok: true, worktrees: enriched };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          err instanceof Error
            ? `Failed to list worktrees: ${err.message}`
            : 'Failed to list worktrees',
      },
      { status: 500 },
    );
  }
}
