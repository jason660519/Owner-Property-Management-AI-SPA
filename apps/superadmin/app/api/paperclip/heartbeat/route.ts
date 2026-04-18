// POST /api/paperclip/heartbeat
//
// Manual heartbeat run: polls all agents and returns their current state.
// Unlike agent-health, this does NOT auto-switch adapters — purely informational.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function readConfig() {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? '',
    companyId: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? '',
    apiKey: process.env.PAPERCLIP_API_KEY ?? '',
  };
}

export interface AgentHeartbeat {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  model: string;
  pauseReason: string | null;
  lastHeartbeatAt: string | null;
  isOnline: boolean;
}

export async function POST(request: NextRequest) {
  const config = readConfig();
  if (!config.baseUrl || !config.companyId || !config.apiKey) {
    return NextResponse.json({ ok: false, error: 'Paperclip config not set.' }, { status: 500 });
  }

  const base = config.baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/api/companies/${config.companyId}/agents`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch agents: HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const agents = (await res.json()) as Record<string, unknown>[];
    const TEN_MINUTES = 10 * 60 * 1000;

    const heartbeats: AgentHeartbeat[] = agents.map(raw => {
      const lastHb = raw.lastHeartbeatAt as string | null;
      const isOnline = lastHb
        ? (Date.now() - new Date(lastHb).getTime()) < TEN_MINUTES
        : false;

      return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        status: String(raw.status ?? ''),
        adapterType: String(raw.adapterType ?? ''),
        model: String((raw.adapterConfig as Record<string, unknown>)?.model ?? ''),
        pauseReason: (raw.pauseReason as string) ?? null,
        lastHeartbeatAt: lastHb ?? null,
        isOnline,
      };
    });

    // Log the heartbeat event
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const supabase = await createClient();
      await supabase.from('paperclip_task_events').insert({
        agent_id: null,
        event_type: 'heartbeat_run',
        detail: { agentCount: heartbeats.length, onlineCount: heartbeats.filter(h => h.isOnline).length },
        performed_by: userId,
      });
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      agents: heartbeats,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Network error' },
      { status: 502 },
    );
  }
}
