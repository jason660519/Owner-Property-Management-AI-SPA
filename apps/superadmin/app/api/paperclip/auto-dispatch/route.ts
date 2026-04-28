// POST /api/paperclip/auto-dispatch
//
// Automatically assigns new tasks to idle Paperclip agents by:
// 1. Finding idle agents with no active issues
// 2. Selecting unassigned features from roadmap.ts
// 3. Matching features to agent roles via autoRouteRole()
// 4. Creating issues via superadmin /api/paperclip/issues
//
// Query params: ?limit=N (default 3, max 10), ?dryRun=true

import { NextRequest, NextResponse } from 'next/server';
import { autoRouteRole } from '@/lib/paperclip/auto-route';
import type { PaperclipRoleId } from '@/lib/paperclip/types';
import { ROADMAP_DATA, normalizeRoadmapFeatureId } from '@/app/data/roadmap';

function readAgentMapping(): Record<PaperclipRoleId, string | undefined> {
  return {
    fullstack: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_FULLSTACK,
    database: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DATABASE,
    sdet: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_SDET ?? process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA,
    qa: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_QA,
    devops: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_DEVOPS,
    architect: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_ARCHITECT,
    uiux: process.env.NEXT_PUBLIC_PAPERCLIP_AGENT_UIUX,
  };
}

function readConfig() {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? '',
    companyId: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '',
    apiKey: process.env.PAPERCLIP_API_KEY ?? '',
  };
}

const SKIP_CATEGORIES = ['第三方加值服務', '金流支付'];

interface DispatchResult {
  rowId: string;
  featureName: string;
  agentName: string;
  agentRole: string;
  issueIdentifier?: string;
  worktreeSlug?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const config = readConfig();
  if (!config.baseUrl || !config.companyId || !config.apiKey) {
    return NextResponse.json({ ok: false, error: 'Paperclip config not set.' }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '3'), 10);
  const dryRun = url.searchParams.get('dryRun') === 'true';

  // Fetch agents
  let agents: { id: string; name: string; status: string; role: string }[];
  try {
    const res = await fetch(
      `${config.baseUrl.replace(/\/+$/, '')}/api/companies/${config.companyId}/agents`,
      { headers: { Authorization: `Bearer ${config.apiKey}` }, cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>[];
    agents = data.map(a => ({
      id: String(a.id), name: String(a.name), status: String(a.status), role: String(a.role),
    }));
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to fetch agents: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 502 },
    );
  }

  // Fetch active issues
  const activeRowIds = new Set<string>();
  const busyAgentIds = new Set<string>();
  try {
    const res = await fetch(
      `${config.baseUrl.replace(/\/+$/, '')}/api/companies/${config.companyId}/issues?status=todo,in_progress,blocked&limit=100`,
      { headers: { Authorization: `Bearer ${config.apiKey}` }, cache: 'no-store' },
    );
    if (res.ok) {
      const issues = (await res.json()) as Record<string, unknown>[];
      for (const issue of issues) {
        const title = String(issue.title ?? '');
        const match = title.match(/\[(?:Row|Feature)\s+(\S+?)\]/i);
        if (match) activeRowIds.add(match[1]);
        const assignee = issue.assigneeAgentId as string | undefined;
        if (assignee) busyAgentIds.add(assignee);
      }
    }
  } catch { /* best effort */ }

  // Find idle agents
  const idleAgents = agents.filter(
    a => a.status === 'idle' && !busyAgentIds.has(a.id) && a.role !== 'ceo',
  );

  if (idleAgents.length === 0) {
    return NextResponse.json({
      ok: true, dryRun, dispatched: 0, message: 'No idle agents available.',
      idleAgents: 0, candidateFeatures: 0, results: [],
    });
  }

  // Select candidate features
  const agentMapping = readAgentMapping();
  const features = ROADMAP_DATA.features;
  const candidates: { rowId: string; name: string; role: PaperclipRoleId; acceptanceCriteria: string; locatedPage: string; points: number }[] = [];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const rowId = normalizeRoadmapFeatureId(f.id) || String(i + 1).padStart(3, '0');
    if ((f.percentage ?? 0) >= 100) continue;
    if (activeRowIds.has(rowId)) continue;
    if (SKIP_CATEGORIES.some(c => (f.category ?? '').includes(c))) continue;
    const routeResult = autoRouteRole(`[Feature ${rowId}] ${f.name}`);
    candidates.push({
      rowId, name: f.name, role: routeResult.role,
      acceptanceCriteria: f.acceptanceCriteria ?? '',
      locatedPage: f.locatedPage ?? '', points: f.points ?? 0,
    });
  }

  // Match and dispatch
  const dispatches: DispatchResult[] = [];
  const usedAgents = new Set<string>();

  for (const candidate of candidates) {
    if (dispatches.length >= limit) break;

    const agentId = agentMapping[candidate.role];
    let agent = idleAgents.find(a => a.id === agentId && !usedAgents.has(a.id));
    let effectiveRole = candidate.role as string;

    // Fallback to fullstack
    if (!agent) {
      const fsId = agentMapping.fullstack;
      agent = idleAgents.find(a => a.id === fsId && !usedAgents.has(a.id));
      if (!agent) continue;
      effectiveRole = 'fullstack (fallback)';
    }

    if (dryRun) {
      dispatches.push({ rowId: candidate.rowId, featureName: candidate.name, agentName: agent.name, agentRole: effectiveRole });
    } else {
      const result = await createIssueForFeature(candidate, agent.id);
      dispatches.push({ rowId: candidate.rowId, featureName: candidate.name, agentName: agent.name, agentRole: effectiveRole, ...result });
    }
    usedAgents.add(agent.id);
  }

  return NextResponse.json({
    ok: true, dryRun, timestamp: new Date().toISOString(),
    dispatched: dispatches.length, idleAgents: idleAgents.length,
    candidateFeatures: candidates.length, results: dispatches,
  });
}

async function createIssueForFeature(
  feature: { rowId: string; name: string; acceptanceCriteria: string; locatedPage: string; points: number },
  agentId: string,
): Promise<{ issueIdentifier?: string; worktreeSlug?: string; error?: string }> {
  try {
    const title = `[Feature ${feature.rowId}] ${feature.name}`
      .replace(/[－：]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

    const description = [
      `**Feature ID**: ${feature.rowId}`,
      `**Feature**: ${feature.name}`,
      feature.locatedPage ? `**Located Page**: ${feature.locatedPage}` : '',
      feature.points ? `**Points**: ${feature.points}` : '',
      '', '---', '',
      '## Acceptance Criteria',
      ...(feature.acceptanceCriteria ? feature.acceptanceCriteria.split('\n') : ['(no criteria defined)']),
    ].filter(Boolean).join('\n');

    const res = await fetch('http://localhost:3001/api/paperclip/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, status: 'todo', priority: 'medium', assigneeAgentId: agentId }),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (data.ok) {
      const issue = data.issue as Record<string, unknown> | undefined;
      const worktree = data.worktree as Record<string, unknown> | undefined;
      return { issueIdentifier: issue?.issueKey as string ?? issue?.id as string, worktreeSlug: worktree?.slug as string };
    }
    return { error: String(data.error ?? 'Unknown error') };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}
