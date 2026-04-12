import { NextRequest, NextResponse } from 'next/server';

function readPaperclipConfig(): {
  baseUrl?: string;
  companyId?: string;
  apiKey?: string;
} {
  return {
    baseUrl: process.env.NEXT_PUBLIC_PAPERCLIP_BASE_URL ?? undefined,
    companyId: process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY_ID ?? undefined,
    apiKey: process.env.PAPERCLIP_API_KEY ?? undefined,
  };
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;
  const config = readPaperclipConfig();
  if (!config.baseUrl || !config.companyId || !config.apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Paperclip config missing (baseUrl/companyId/apiKey).' },
      { status: 500 },
    );
  }
  if (!agentId?.trim()) {
    return NextResponse.json({ ok: false, error: 'agentId is required.' }, { status: 400 });
  }

  const base = config.baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/api/agents/${encodeURIComponent(agentId)}/pause?companyId=${encodeURIComponent(config.companyId)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    if (!res.ok) {
      await res.text();
      return NextResponse.json(
        { ok: false, error: `Paperclip pause failed (${res.status})`, detail: 'Upstream pause request failed.' },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown network error' },
      { status: 502 },
    );
  }
}
