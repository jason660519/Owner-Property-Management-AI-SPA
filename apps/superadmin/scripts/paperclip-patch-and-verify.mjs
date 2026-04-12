#!/usr/bin/env node

/**
 * Patch a Paperclip issue's assigneeAgentId and verify auto-dispatch.
 *
 * Defaults are tuned for the recurring "VIS-10 has no assignee" scenario,
 * but the script is generic and works for any issue key/id.
 *
 * Usage examples:
 *   node scripts/paperclip-patch-and-verify.mjs
 *   node scripts/paperclip-patch-and-verify.mjs --issue VIS-10 --agent-role fullstack
 *   node scripts/paperclip-patch-and-verify.mjs --issue <issue-uuid> --agent-id <agent-uuid>
 */

const ROLE_ENV_MAP = {
  fullstack: 'NEXT_PUBLIC_PAPERCLIP_AGENT_FULLSTACK',
  database: 'NEXT_PUBLIC_PAPERCLIP_AGENT_DATABASE',
  sdet: 'NEXT_PUBLIC_PAPERCLIP_AGENT_SDET',
  qa: 'NEXT_PUBLIC_PAPERCLIP_AGENT_QA',
  devops: 'NEXT_PUBLIC_PAPERCLIP_AGENT_DEVOPS',
  architect: 'NEXT_PUBLIC_PAPERCLIP_AGENT_ARCHITECT',
  uiux: 'NEXT_PUBLIC_PAPERCLIP_AGENT_UIUX',
};

const RUN_TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'errored', 'cancelled']);

function parseArgs(argv) {
  const args = {
    issue: 'VIS-10',
    agentId: undefined,
    agentRole: undefined,
    timeoutSec: 120,
    intervalMs: 2000,
    force: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--issue') args.issue = argv[++i];
    else if (token === '--agent-id') args.agentId = argv[++i];
    else if (token === '--agent-role') args.agentRole = argv[++i];
    else if (token === '--timeout-sec') args.timeoutSec = Number(argv[++i] || '120');
    else if (token === '--interval-ms') args.intervalMs = Number(argv[++i] || '2000');
    else if (token === '--force') args.force = true;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }

  if (!Number.isFinite(args.timeoutSec) || args.timeoutSec <= 0) {
    throw new Error('--timeout-sec must be a positive number.');
  }
  if (!Number.isFinite(args.intervalMs) || args.intervalMs < 250) {
    throw new Error('--interval-ms must be >= 250.');
  }
  if (args.agentRole && !ROLE_ENV_MAP[args.agentRole]) {
    throw new Error(
      `--agent-role must be one of: ${Object.keys(ROLE_ENV_MAP).join(', ')}`,
    );
  }

  return args;
}

function printHelp() {
  console.log(`
Patch/verify Paperclip issue dispatch

Required env:
  PAPERCLIP_API_KEY

Optional env:
  PAPERCLIP_BASE_URL (default: http://localhost:3187)
  NEXT_PUBLIC_PAPERCLIP_AGENT_* (for --agent-role / default fullstack)

Flags:
  --issue <VIS-10|uuid>       Issue key or UUID (default: VIS-10)
  --agent-id <uuid>           Explicit target agent UUID
  --agent-role <role>         Resolve agent UUID from env. roles:
                              ${Object.keys(ROLE_ENV_MAP).join(', ')}
  --timeout-sec <n>           Poll timeout seconds (default: 120)
  --interval-ms <n>           Poll interval ms (default: 2000)
  --force                     Patch even when issue already has assignee
  --dry-run                   Resolve and print plan without PATCH
  -h, --help                  Show this help
`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeBaseUrl(v) {
  return (v || 'http://localhost:3187').replace(/\/+$/, '');
}

function assertOkResponse(status, body, context) {
  if (status >= 200 && status < 300) return;
  const msg =
    body && typeof body === 'object' && typeof body.error === 'string'
      ? body.error
      : `${context} failed (HTTP ${status})`;
  throw new Error(msg);
}

async function requestJson({ method, url, apiKey, body }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { status: response.status, body: payload };
}

function resolveAgentId(args, issue) {
  if (args.agentId) return { agentId: args.agentId, source: '--agent-id' };

  if (args.agentRole) {
    const envName = ROLE_ENV_MAP[args.agentRole];
    const agentId =
      args.agentRole === 'sdet'
        ? process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_SDET || process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA
        : process.env[envName];
    if (!agentId) {
      throw new Error(`Missing env ${envName}; cannot resolve --agent-role ${args.agentRole}.`);
    }
    return { agentId, source: `--agent-role ${args.agentRole} (${envName})` };
  }

  const fullstackEnv = ROLE_ENV_MAP.fullstack;
  const fallback = process.env[fullstackEnv];
  if (fallback) return { agentId: fallback, source: `default role fullstack (${fullstackEnv})` };

  if (issue.assigneeAgentId) {
    return { agentId: issue.assigneeAgentId, source: 'issue.assigneeAgentId (already set)' };
  }

  throw new Error(
    `Cannot resolve target agent. Provide --agent-id or --agent-role, or set ${fullstackEnv}.`,
  );
}

function shouldPatch({ issue, targetAgentId, force }) {
  if (force) return true;
  if (!issue.assigneeAgentId) return true;
  return issue.assigneeAgentId !== targetAgentId;
}

function fmtIssue(issue) {
  return [
    `id=${issue.id}`,
    `key=${issue.issueKey || '-'}`,
    `status=${issue.status || '-'}`,
    `assignee=${issue.assigneeAgentId || '(none)'}`,
    `run=${issue.executionRunId || '-'}`,
  ].join(' | ');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const baseUrl = normalizeBaseUrl(process.env.PAPERCLIP_BASE_URL);
  const apiKey = process.env.PAPERCLIP_API_KEY;

  if (!apiKey) throw new Error('Missing required env: PAPERCLIP_API_KEY');

  const issueRef = encodeURIComponent(args.issue);
  const issueUrl = `${baseUrl}/api/issues/${issueRef}`;

  console.log(`[1/4] Fetch issue: ${args.issue}`);
  const beforeRes = await requestJson({ method: 'GET', url: issueUrl, apiKey });
  assertOkResponse(beforeRes.status, beforeRes.body, 'Fetch issue');
  const issue = beforeRes.body;
  if (!issue || typeof issue.id !== 'string') {
    throw new Error('Unexpected issue shape returned from Paperclip.');
  }
  console.log(`      ${fmtIssue(issue)}`);

  const { agentId: targetAgentId, source } = resolveAgentId(args, issue);
  console.log(`[2/4] Target assignee: ${targetAgentId} (${source})`);

  const patchNeeded = shouldPatch({
    issue,
    targetAgentId,
    force: args.force,
  });

  if (!patchNeeded) {
    console.log('[3/4] Patch skipped: assignee already matches target agent.');
  } else if (args.dryRun) {
    console.log('[3/4] Dry run: would PATCH assigneeAgentId.');
  } else {
    console.log('[3/4] PATCH issue assignee...');
    const patchRes = await requestJson({
      method: 'PATCH',
      url: `${baseUrl}/api/issues/${encodeURIComponent(issue.id)}`,
      apiKey,
      body: { assigneeAgentId: targetAgentId },
    });
    assertOkResponse(patchRes.status, patchRes.body, 'Patch assignee');
    console.log('      PATCH success.');
  }

  if (args.dryRun) {
    console.log('[4/4] Dry run complete.');
    return;
  }

  console.log('[4/4] Verify dispatch status...');
  const deadline = Date.now() + args.timeoutSec * 1000;

  while (Date.now() < deadline) {
    const snapRes = await requestJson({ method: 'GET', url: issueUrl, apiKey });
    assertOkResponse(snapRes.status, snapRes.body, 'Verify issue');
    const snap = snapRes.body;

    const runId =
      typeof snap.executionRunId === 'string' && snap.executionRunId
        ? snap.executionRunId
        : undefined;

    let runStatus;
    if (runId) {
      const runRes = await requestJson({
        method: 'GET',
        url: `${baseUrl}/api/heartbeat-runs/${encodeURIComponent(runId)}`,
        apiKey,
      });
      if (runRes.status >= 200 && runRes.status < 300 && runRes.body) {
        runStatus = runRes.body.status;
      }
    }

    const started =
      snap.status === 'in_progress' ||
      !!snap.startedAt ||
      (!!runId && typeof snap.executionLockedAt === 'string');

    const runState = runStatus ? ` | runStatus=${runStatus}` : '';
    console.log(
      `      status=${snap.status || '-'} | assignee=${snap.assigneeAgentId || '(none)'} | run=${runId || '-'}${runState}`,
    );

    if (started) {
      console.log('\n✅ Dispatch verified: issue is assigned and execution has started.');
      return;
    }

    if (runStatus && RUN_TERMINAL_STATUSES.has(runStatus)) {
      throw new Error(`Run reached terminal state before start verification: ${runStatus}`);
    }

    await sleep(args.intervalMs);
  }

  throw new Error(
    `Timeout after ${args.timeoutSec}s: issue did not reach a started state (in_progress/startedAt/locked run).`,
  );
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
