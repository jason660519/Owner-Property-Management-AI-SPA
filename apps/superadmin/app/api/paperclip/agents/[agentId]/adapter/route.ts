// PATCH /api/paperclip/agents/[agentId]/adapter
//
// Switch a Paperclip agent's adapter and model via the Paperclip REST API.
// Used by the Agents tab in the Mission Control dashboard.

import { NextRequest, NextResponse } from 'next/server';

const ADAPTER_MODEL_MAP: Record<string, string> = {
  claude_local: 'sonnet',
  codex_local: 'gpt-5.3-codex',
  cursor: 'auto',
  opencode_local: 'google/gemini-2.5-flash',
};

function readConfig() {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? '',
    apiKey: process.env.PAPERCLIP_API_KEY ?? '',
  };
}

export async function PATCH(
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

  let body: { adapterType?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const adapterType = body.adapterType;
  if (!adapterType || !ADAPTER_MODEL_MAP[adapterType]) {
    return NextResponse.json(
      { ok: false, error: `Invalid adapter. Valid: ${Object.keys(ADAPTER_MODEL_MAP).join(', ')}` },
      { status: 400 },
    );
  }

  // Use custom model if provided, otherwise use default for this adapter
  const model = body.model ?? ADAPTER_MODEL_MAP[adapterType];

  const base = config.baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adapterType,
        adapterConfig: { model },
        status: 'idle',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Paperclip PATCH failed (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
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
