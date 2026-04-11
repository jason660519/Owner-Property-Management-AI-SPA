// POST /api/paperclip/issues
//
// Server-side proxy that forwards a PromptEngineerModal submission to the
// Paperclip REST API. Two jobs:
//  1. Keep `PAPERCLIP_API_KEY` on the server (never shipped to the browser).
//  2. Phase E: create a fresh git worktree at .paperclip-worktrees/<slug>/ per
//     task, inject its container path into the description as a mandatory
//     "cd into this directory" protocol, and bind the issue to the Paperclip
//     Project (via PAPERCLIP_PROJECT_ID) so the agent's initial cwd is
//     /workspace — never the per-agent fallback.

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { createIssue } from '@/lib/paperclip/client';
import type { PaperclipIssuePayload } from '@/lib/paperclip/types';
import type { WorktreePaths } from '@/lib/paperclip/worktree';
import {
  findRepoRoot,
  resolveWorktreePaths,
  createWorktree,
  deriveSlugFromTitle,
  buildWorktreePrefix,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';
import { installPaperclipGitHook } from '@/lib/paperclip/git-hook';

export interface PaperclipIssueRouteConfig {
  baseUrl: string;
  companyId: string;
  apiKey: string;
  projectId?: string;
}

/** Read config from env. Returns undefined for any missing piece so the
 *  caller can surface a specific error to the UI. */
export function readPaperclipConfig(): Partial<PaperclipIssueRouteConfig> {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? undefined,
    companyId: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? undefined,
    apiKey: process.env.PAPERCLIP_API_KEY ?? undefined,
    projectId: process.env.PAPERCLIP_PROJECT_ID ?? undefined,
  };
}

function isValidPayload(body: unknown): body is PaperclipIssuePayload {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.title !== 'string' || b.title.trim() === '') return false;
  if (typeof b.description !== 'string' || b.description.trim() === '') return false;
  return true;
}

/** Name of the Paperclip docker container where git worktree commands run.
 *  Override via env for non-default docker-compose deployments. */
const PAPERCLIP_CONTAINER_NAME =
  process.env.PAPERCLIP_CONTAINER_NAME ?? 'paperclip-paperclip-1';

/** Prepare the per-task worktree.
 *
 *  Critical: the `git worktree add` command is executed INSIDE the Paperclip
 *  container via `docker exec`. This ensures the admin files it writes
 *  (`.git/worktrees/<slug>/gitdir` etc.) contain container-valid paths
 *  (`/workspace/...`), so the agent's claude CLI can actually use them.
 *
 *  Host-side introspection of the branch still works via
 *  `git log feature/paperclip-<slug>` from the main repo root, because refs
 *  live in the shared `.git/` regardless of which side ran `worktree add`.
 *
 *  Also installs the Paperclip pre-commit hook (idempotent) as a hard
 *  backstop that blocks forbidden-path commits on feature/paperclip-* branches.
 *  Hook install failures are logged but do NOT abort the task — the
 *  instructional prefix still acts as a soft guardrail.
 */
export async function prepareWorktreeForTask(
  title: string,
  startDir: string,
): Promise<WorktreePaths> {
  const slug = deriveSlugFromTitle(title);
  // We still need the host repo root for path resolution (sanity, logs), but
  // we DON'T pass it to git — git runs inside the container with `-C /workspace`.
  const repoRoot = await findRepoRoot(startDir);

  // Best-effort hook install. If it fails (e.g., permission, fs error), fall
  // back to the soft guardrail in buildWorktreePrefix.
  try {
    await installPaperclipGitHook(repoRoot, fs);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[paperclip] pre-commit hook install failed:',
      err instanceof Error ? err.message : err,
    );
  }

  const paths = resolveWorktreePaths({ slug, repoRoot });
  const dockerRunner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);
  await createWorktree({
    paths,
    repoRoot: '/workspace', // container path — unused by docker runner but kept for symmetry
    pathScope: 'container',
    runner: dockerRunner,
  });
  return paths;
}

export async function POST(request: NextRequest) {
  const config = readPaperclipConfig();

  if (!config.baseUrl || !config.companyId) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          'Paperclip client env not configured. Set NEXT_PUBLIC_PAPERCLIP_BASE_URL and NEXT_PUBLIC_PAPERCLIP_COMPANY_ID.',
      },
      { status: 500 },
    );
  }
  if (!config.apiKey) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          'PAPERCLIP_API_KEY not set. Generate an agent API key in Paperclip and add PAPERCLIP_API_KEY=<key> to apps/superadmin/.env.local.',
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: 400, error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      {
        ok: false,
        status: 400,
        error: 'Invalid payload — title and description are required.',
      },
      { status: 400 },
    );
  }

  // ── Phase E: create isolated worktree before dispatching the task ──
  let worktreePaths: WorktreePaths;
  try {
    worktreePaths = await prepareWorktreeForTask(body.title, process.cwd());
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error:
          err instanceof Error
            ? `Failed to create git worktree: ${err.message}`
            : 'Failed to create git worktree',
      },
      { status: 500 },
    );
  }

  // Enrich the payload with the worktree protocol prefix + projectId so the
  // agent is bound to the right project workspace.
  const enrichedPayload: PaperclipIssuePayload = {
    ...body,
    description: buildWorktreePrefix(worktreePaths) + body.description,
    ...(config.projectId ? { projectId: config.projectId } : {}),
  };

  const result = await createIssue({
    baseUrl: config.baseUrl,
    companyId: config.companyId,
    apiKey: config.apiKey,
    payload: enrichedPayload,
  });

  const httpStatus = result.ok ? 200 : result.status || 502;
  const responseBody = result.ok
    ? { ...result, worktree: worktreePaths }
    : result;
  return NextResponse.json(responseBody, { status: httpStatus });
}
