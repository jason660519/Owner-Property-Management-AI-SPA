// filepath: apps/superadmin/app/api/ocr/events/[batchId]/route.ts
// created: 2026-02-13 | creator: Claude Opus 4.6
// SSE proxy route for OCR batch progress events

import { NextRequest } from 'next/server';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL;

export const runtime = 'nodejs';
// Prevent Next.js from buffering the response
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  if (!OCR_SERVICE_URL) {
    return new Response(
      JSON.stringify({ detail: 'OCR_SERVICE_URL is not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { batchId } = await params;

  try {
    const ocrUrl = `${OCR_SERVICE_URL}/api/v1/ocr/events/${batchId}`;

    const upstreamResponse = await fetch(ocrUrl, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          detail: `OCR 事件串流失敗 (${upstreamResponse.status})`,
        }),
        {
          status: upstreamResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Stream the SSE response through
    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('[OCR Proxy] SSE connection failed:', message);

    return new Response(
      JSON.stringify({
        detail: 'OCR 服務未啟動，無法取得進度事件',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
