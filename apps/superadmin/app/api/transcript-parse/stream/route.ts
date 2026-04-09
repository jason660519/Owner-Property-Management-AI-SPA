// filepath: apps/superadmin/app/api/transcript-parse/stream/route.ts
// SSE streaming endpoint for transcript consensus parsing (same pipeline as background jobs).

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import { runTranscriptParseCore } from '@/lib/transcript-parse/run-transcript-parse-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: {
    documentId?: string;
    userId?: string;
    customPrompt?: string;
    parseScenarioKey?: string;
    parserConcurrency?: number;
    overrideParserModels?: { provider: string; model: string }[];
    overrideJudgeModel?: { provider: string; model: string } | null;
    injectedLocalResult?: TranscriptParseOutput & { field_confidences?: Record<string, number> };
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const {
    documentId,
    userId,
    customPrompt,
    parseScenarioKey,
    parserConcurrency,
    overrideParserModels,
    overrideJudgeModel,
    injectedLocalResult,
  } = body;
  if (!documentId || !userId) {
    return new Response('Missing documentId or userId', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        const adminClient = createAdminClient();
        await runTranscriptParseCore(
          adminClient,
          {
            documentId,
            userId,
            customPrompt,
            parseScenarioKey,
            parserConcurrency,
            overrideParserModels,
            overrideJudgeModel,
            injectedLocalResult,
          },
          { stopSignal: request.signal, onEvent: send },
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
