// POST /api/paperclip/agents/[agentId]/resume
//
// Resume a paused/errored Paperclip agent by resetting its status to 'idle'
// while preserving the current adapter. Logs a task event for audit.

import { NextRequest, NextResponse } from 'next/server';
import { ADAPTER_MODEL_MAP } from '@/lib/paperclip/adapter-models';
import { createClient } from '@/utils/supabase/server';

function readConfig() {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? '',
    apiKey: process.env.PAPERCLIP_API_KEY ?? '',
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;
  const config = readConfig();

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json({ ok: false, error: 'Paperclip config missing.' }, { status: 500 });
  }
  if (!agentId?.trim()) {
    return NextResponse.json({ ok: false, error: 'agentId is required.' }, { status: 400 });
  }

  let body: { adapterType?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional — resume with current adapter
  }

  const base = config.baseUrl.replace(/\/+$/, '');

  // First fetch current agent state to preserve adapter if not overridden
  let currentAdapter = body.adapterType;
  if (!currentAdapter) {
    try {
      const agentRes = await fetch(`${base}/api/agents/${encodeURIComponent(agentId)}`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        cache: 'no-store',
      });
      if (agentRes.ok) {
        const agentData = (await agentRes.json()) as Record<string, unknown>;
        currentAdapter = String(agentData.adapterType ?? 'claude_local');
      }
    } catch {
      currentAdapter = 'claude_local';
    }
  }

  const model = ADAPTER_MODEL_MAP[currentAdapter ?? ''] ?? 'auto';

  try {
    const res = await fetch(`${base}/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adapterType: currentAdapter,
        adapterConfig: { model },
        status: 'idle',
        pauseReason: null,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Resume failed (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;

    // Log the resume event
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const supabase = await createClient();
      await supabase.from('paperclip_task_events').insert({
        agent_id: agentId,
        event_type: 'resumed',
        detail: { adapter: currentAdapter, model, previousStatus: 'paused_or_error' },
        performed_by: userId,
      });
    }

    return NextResponse.json({
      ok: true,
      agent: {
        id: data.id,
        name: data.name,
        adapterType: data.adapterType,
        model: (data.adapterConfig as Record<string, unknown>)?.model ?? model,
        status: data.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Network error' },
      { status: 502 },
    );
  }
}
