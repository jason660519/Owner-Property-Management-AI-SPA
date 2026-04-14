// GET /api/paperclip/agent-health
//
// Agent Health Monitor — polls all Paperclip agents, detects quota/adapter
// errors, and automatically switches to the next adapter in the fallback chain.
// Designed to be called periodically (e.g. every 3 minutes via cron).
//
// Returns a report of each agent's status and any adapter switches performed.

import { NextResponse } from 'next/server';
import {
  isAdapterQuotaError,
} from '@/lib/paperclip/adapter-fallback';

// ── Adapter → Model mapping ──────────────────────────────────────────
// Each adapter requires a specific model value. Using the wrong model
// (e.g. "sonnet" on codex_local) causes "model does not exist" errors.
const ADAPTER_MODEL_MAP: Record<string, string> = {
  claude_local: 'sonnet',
  codex_local: 'gpt-5.3-codex',
  cursor: 'auto',
  opencode_local: 'google/gemini-2.5-flash',
};

// Only adapters confirmed working in the Paperclip Docker container.
// Order: cheapest/most-available first, Claude last (preserve token budget).
const AVAILABLE_ADAPTERS = [
  'opencode_local',  // Google Gemini — free tier generous
  'cursor',          // Cursor — subscription-based
  'codex_local',     // OpenAI Codex — API key billing
  'claude_local',    // Claude — most expensive, last resort
] as const;

/** Get next available adapter in the fallback chain. */
function getNextAvailableAdapter(current: string): string | null {
  const idx = AVAILABLE_ADAPTERS.indexOf(current as (typeof AVAILABLE_ADAPTERS)[number]);
  if (idx === -1) return AVAILABLE_ADAPTERS[0];
  const next = idx + 1;
  if (next >= AVAILABLE_ADAPTERS.length) return null; // exhausted
  return AVAILABLE_ADAPTERS[next];
}

interface AgentSnapshot {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  model: string;
  pauseReason: string | null;
  lastHeartbeatAt: string | null;
}

interface AgentHealthResult {
  agent: AgentSnapshot;
  action: 'ok' | 'switched' | 'exhausted' | 'paused' | 'skipped';
  switchedFrom?: string;
  switchedTo?: string;
  reason?: string;
}

function readConfig() {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? '',
    companyId: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '',
    apiKey: process.env.PAPERCLIP_API_KEY ?? '',
  };
}

/** Fetch all agents from Paperclip API. */
async function fetchAgents(baseUrl: string, companyId: string, apiKey: string) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/companies/${companyId}/agents`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch agents: HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

/** PATCH agent to switch adapter + model + reset status. */
async function switchAgent(
  baseUrl: string,
  apiKey: string,
  agentId: string,
  newAdapter: string,
): Promise<boolean> {
  const model = ADAPTER_MODEL_MAP[newAdapter] ?? 'auto';
  const url = `${baseUrl.replace(/\/+$/, '')}/api/agents/${agentId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      adapterType: newAdapter,
      adapterConfig: { model },
      status: 'idle',
    }),
  });
  return res.ok;
}

/** Check if an agent in error state should trigger adapter fallback.
 *
 *  Paperclip's agent API does not expose run error details, so we cannot
 *  distinguish quota errors from task-level errors via API alone.
 *
 *  Strategy: if an agent has been in error state and its last heartbeat
 *  was recent (within 10 minutes), it's likely an adapter issue since
 *  the heartbeat keeps firing but runs keep failing. Switch adapter.
 *
 *  If we do have an error hint (from other sources), use it for precision. */
function shouldSwitchAdapter(
  status: string,
  errorHint: string | null,
  lastHeartbeat: string | null,
): boolean {
  if (status !== 'error') return false;
  // If we have a specific quota error signal, always switch
  if (errorHint && isAdapterQuotaError(errorHint)) return true;
  // Agent in error with recent heartbeat = adapter is broken, switch
  if (lastHeartbeat) {
    const hbAge = Date.now() - new Date(lastHeartbeat).getTime();
    const TEN_MINUTES = 10 * 60 * 1000;
    if (hbAge < TEN_MINUTES) return true;
  }
  return false;
}

export async function GET() {
  const config = readConfig();
  if (!config.baseUrl || !config.companyId || !config.apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Paperclip config not set.' },
      { status: 500 },
    );
  }

  let agents: Record<string, unknown>[];
  try {
    agents = await fetchAgents(config.baseUrl, config.companyId, config.apiKey);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to fetch agents' },
      { status: 502 },
    );
  }

  const results: AgentHealthResult[] = [];
  let switchCount = 0;

  for (const raw of agents) {
    const agent: AgentSnapshot = {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      status: String(raw.status ?? ''),
      adapterType: String(raw.adapterType ?? ''),
      model: String((raw.adapterConfig as Record<string, unknown>)?.model ?? ''),
      pauseReason: (raw.pauseReason as string) ?? null,
      lastHeartbeatAt: (raw.lastHeartbeatAt as string) ?? null,
    };

    // Skip paused agents
    if (agent.pauseReason) {
      results.push({ agent, action: 'paused', reason: agent.pauseReason });
      continue;
    }

    // Only act on agents in error state
    if (agent.status !== 'error') {
      results.push({ agent, action: 'ok' });
      continue;
    }

    // Paperclip agent API does not expose run error details.
    // We rely on agent status + heartbeat recency to decide.
    let errorHint: string | null = null;

    if (!shouldSwitchAdapter(agent.status, errorHint, agent.lastHeartbeatAt)) {
      // Agent in error but stale heartbeat — just reset, don't switch
      await switchAgent(config.baseUrl, config.apiKey, agent.id, agent.adapterType);
      results.push({
        agent,
        action: 'ok',
        reason: `Reset to idle (stale error, no switch needed)`,
      });
      continue;
    }

    // Active adapter failure detected — switch to next adapter
    const nextAdapter = getNextAvailableAdapter(agent.adapterType);
    if (!nextAdapter) {
      // Exhausted all adapters — wrap back to first
      const firstAdapter = AVAILABLE_ADAPTERS[0];
      await switchAgent(config.baseUrl, config.apiKey, agent.id, firstAdapter);
      results.push({
        agent,
        action: 'exhausted',
        switchedFrom: agent.adapterType,
        switchedTo: firstAdapter,
        reason: `Exhausted fallback chain, wrapped to ${firstAdapter}`,
      });
      switchCount++;
      continue;
    }

    const switched = await switchAgent(config.baseUrl, config.apiKey, agent.id, nextAdapter);
    const errorMsg: string = errorHint ?? '';
    if (switched) {
      // eslint-disable-next-line no-console
      console.log(
        `[agent-health] ${agent.name}: ${agent.adapterType} → ${nextAdapter} (quota error: ${errorMsg.slice(0, 80) || 'detected'})`,
      );
      results.push({
        agent,
        action: 'switched',
        switchedFrom: agent.adapterType,
        switchedTo: nextAdapter,
        reason: errorMsg.slice(0, 200) || 'Quota/adapter error detected',
      });
      switchCount++;
    } else {
      results.push({
        agent,
        action: 'skipped',
        reason: `Failed to PATCH agent to ${nextAdapter}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    agentCount: agents.length,
    switchCount,
    results: results.map((r) => ({
      id: r.agent.id,
      name: r.agent.name,
      adapter: r.agent.adapterType,
      model: r.agent.model,
      status: r.agent.status,
      lastHeartbeatAt: r.agent.lastHeartbeatAt,
      action: r.action,
      ...(r.switchedFrom ? { switchedFrom: r.switchedFrom } : {}),
      ...(r.switchedTo ? { switchedTo: r.switchedTo } : {}),
      ...(r.reason ? { reason: r.reason } : {}),
    })),
  });
}
