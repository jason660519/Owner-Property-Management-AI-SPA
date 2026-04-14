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
import path from 'node:path';
import { createIssue } from '@/lib/paperclip/client';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadCreditGuardConfig, type CreditGuardReader } from '@/lib/ai/anthropic-credit-guard';
import type { PaperclipIssuePayload, PaperclipRoleId } from '@/lib/paperclip/types';
import type { WorktreePaths } from '@/lib/paperclip/worktree';
import {
  findRepoRoot,
  resolveWorktreePaths,
  createWorktree,
  removeWorktree,
  deriveSlugFromTitle,
  buildWorktreePrefix,
  makeDockerGitRunner,
} from '@/lib/paperclip/worktree';
import { installAllPaperclipGitHooks } from '@/lib/paperclip/git-hook';
import { autoRouteRole, formatAutoRouteTag } from '@/lib/paperclip/auto-route';

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

/** Server-side role → agent mapping from env. Same source as
 *  `lib/paperclip/config.ts`, but duplicated here so the route handler
 *  can stay self-contained without importing a client-side module. */
function readRoleAgentMapping(): Partial<Record<PaperclipRoleId, string>> {
  const env: Record<PaperclipRoleId, string | undefined> = {
    fullstack: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_FULLSTACK,
    database: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DATABASE,
    sdet:
      process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_SDET ?? process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA,
    qa: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA,
    devops: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DEVOPS,
    architect: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_ARCHITECT,
    uiux: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_UIUX,
  };
  const result: Partial<Record<PaperclipRoleId, string>> = {};
  for (const [role, id] of Object.entries(env)) {
    if (id) result[role as PaperclipRoleId] = id;
  }
  return result;
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
const WORKTREE_META_FILENAME = '.paperclip-meta.json';

async function writeWorktreeIssueMeta(
  worktree: WorktreePaths,
  issue: { id: string; issueKey?: string; title?: string; status?: string },
): Promise<void> {
  if (!worktree.hostPath.includes('.paperclip-worktrees')) {
    return;
  }
  const filePath = path.join(worktree.hostPath, WORKTREE_META_FILENAME);
  const payload = {
    issueId: issue.id,
    issueKey: issue.issueKey,
    title: issue.title,
    status: issue.status,
    slug: worktree.slug,
    branchName: worktree.branchName,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

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

  // Best-effort install of BOTH Paperclip git hooks (pre-commit +
  // pre-merge-commit). If either fails (e.g., permission, fs error), we
  // still fall back to the soft guardrail in buildWorktreePrefix + the
  // server-side findForbiddenPaths check in mergeWorktreeBranch.
  try {
    await installAllPaperclipGitHooks(repoRoot, fs);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[paperclip] git hook install failed:',
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

  // ── Credit guard: block dispatch when circuit breaker is active ──────
  // Checked after config validation so we never reject a config-error as a
  // credit error.  Best-effort: if the DB is unreachable we allow the call.
  try {
    const supabase = createAdminClient() as unknown as CreditGuardReader;
    const guardConfig = await loadCreditGuardConfig(supabase);
    if (guardConfig?.circuit_breaker_active) {
      return NextResponse.json(
        {
          ok: false,
          status: 503,
          error:
            'Anthropic credit circuit breaker is active — new task dispatch is paused. '
            + 'Replenish Anthropic credits and call POST /api/ai-billing/anthropic with '
            + '{ "total_credits_usd": <new_total>, "reset_circuit_breaker": true } to restore.',
        },
        { status: 503 },
      );
    }
  } catch (err) {
    // Guard check is best-effort; do not block legitimate dispatch on DB hiccup.
    console.warn('[paperclip/issues] credit guard check error (allowing dispatch):', err instanceof Error ? err.message : err);
  }

  // ── Phase E: create isolated worktree before dispatching the task ──────
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

  // ── Server-side auto-route fallback ──────────────────────────────────
  // If the client didn't supply an assigneeAgentId (e.g. user forgot to
  // pick a role, or an API caller bypassed the frontend), resolve one
  // from the title via keyword matching. This is the last line of defence.
  let autoRoutedAgentId: string | undefined;
  if (!body.assigneeAgentId) {
    const routeResult = autoRouteRole(body.title);
    const agentMap = readRoleAgentMapping();
    autoRoutedAgentId = agentMap[routeResult.role];
    // eslint-disable-next-line no-console
    console.log(
      `[paperclip] auto-route: ${formatAutoRouteTag(routeResult)} → agent ${autoRoutedAgentId ?? '(unmapped)'}`,
    );
  }

  // Enrich the payload with the worktree protocol prefix + projectId so the
  // agent is bound to the right project workspace.
  const enrichedPayload: PaperclipIssuePayload = {
    ...body,
    description: buildWorktreePrefix(worktreePaths) + body.description,
    ...(config.projectId ? { projectId: config.projectId } : {}),
    // Prefer the client-supplied assignee; fall back to auto-routed.
    ...(body.assigneeAgentId
      ? {}
      : autoRoutedAgentId
        ? { assigneeAgentId: autoRoutedAgentId }
        : {}),
  };

  const result = await createIssue({
    baseUrl: config.baseUrl,
    companyId: config.companyId,
    apiKey: config.apiKey,
    payload: enrichedPayload,
  });

  if (!result.ok) {
    try {
      const dockerRunner = makeDockerGitRunner(PAPERCLIP_CONTAINER_NAME);
      await removeWorktree({
        paths: worktreePaths,
        repoRoot: '/workspace',
        pathScope: 'container',
        force: true,
        deleteBranch: true,
        runner: dockerRunner,
      });
    } catch {
      // cleanup is best effort; keep original API error as the primary signal.
    }
  }

  // Best effort metadata write so the worktree browser can map each row to
  // a Paperclip issue and show per-row cost without guessing from title.
  if (result.ok) {
    try {
      await writeWorktreeIssueMeta(worktreePaths, result.issue);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: unknown }).code === 'ENOENT'
      ) {
        // In test doubles or edge cases where the worktree path isn't mounted yet,
        // skip metadata persistence without noisy warnings.
      } else {
      // eslint-disable-next-line no-console
      console.warn(
        '[paperclip] failed to persist worktree issue metadata:',
        err instanceof Error ? err.message : err,
      );
      }
    }
  }

  // ── Persist to paperclip_tasks for server-side tracking ──────────────
  if (result.ok) {
    const userId = request.headers.get('x-user-id') ?? undefined;
    // Extract rowId from title format "[Row 042] Feature Name"
    const rowIdMatch = body.title.match(/\[Row\s+(\S+?)\]/i);
    const rowId = rowIdMatch?.[1] ?? body.title;

    // Extract per-task adapter/model from optional _taskMeta
    const taskMeta = (body as unknown as Record<string, unknown>)._taskMeta as
      { adapter_type?: string; model?: string } | undefined;

    try {
      const supabase = createAdminClient();
      const { data: insertedTask } = await supabase.from('paperclip_tasks').insert({
        row_id: rowId,
        issue_id: result.issue.id,
        issue_url: result.issueUrl,
        assigned_agent: enrichedPayload.assigneeAgentId ?? null,
        assigned_by: userId ?? null,
        assigned_role: body.assigneeAgentId ? null : (autoRoutedAgentId ? 'auto' : null),
        worktree_slug: worktreePaths.slug,
        worktree_branch: worktreePaths.branchName,
        status: 'submitted',
        adapter_type: taskMeta?.adapter_type ?? null,
        model: taskMeta?.model ?? null,
        agent_id_snapshot: enrichedPayload.assigneeAgentId ?? autoRoutedAgentId ?? null,
      }).select('id').single();

      // Log dispatch event for audit
      if (insertedTask?.id) {
        await supabase.from('paperclip_task_events').insert({
          task_id: insertedTask.id,
          agent_id: enrichedPayload.assigneeAgentId ?? autoRoutedAgentId ?? null,
          event_type: 'dispatched',
          detail: {
            row_id: rowId,
            adapter_type: taskMeta?.adapter_type,
            model: taskMeta?.model,
            worktree_slug: worktreePaths.slug,
          },
          performed_by: userId ?? null,
        });
      }
    } catch (err) {
      // Best effort — task queue insert failure should not block issue creation
      // eslint-disable-next-line no-console
      console.warn(
        '[paperclip] failed to insert into paperclip_tasks:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  const httpStatus = result.ok ? 200 : result.status || 502;
  const responseBody = result.ok
    ? { ...result, worktree: worktreePaths }
    : result;
  return NextResponse.json(responseBody, { status: httpStatus });
}
