// filepath: apps/superadmin/app/api/transcript-parse/stream/route.ts
// SSE streaming endpoint for transcript consensus parsing (same pipeline as background jobs).
// Hardened per docs/ai-prompt-safety-guide.md (CRITICAL #2):
//   - customPrompt is validated (length cap + injection-pattern logging) before
//     it can replace the SSoT prompt. Empty / invalid → fall back to scenario or
//     hard-coded default.

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import { runTranscriptParseCore } from '@/lib/transcript-parse/run-transcript-parse-core';
import {
  PROMPT_INPUT_LIMITS,
  validateUserSuppliedPrompt,
} from '@/lib/ai/prompt-safety';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

/** Custom transcript prompts can legitimately be long (full schema + scenario
 *  prefix). Cap at documentTextMax to prevent absurdly large payloads. */
const CUSTOM_TRANSCRIPT_PROMPT_MAX_LEN = PROMPT_INPUT_LIMITS.documentTextMax;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Caller must be a super_admin. The body.userId below is the *target* user
  // whose keys/settings we should use (legitimate in a super-admin workflow),
  // but the *caller* identity is always verified here.
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/transcript-parse/stream',
  });
  if (!auth.ok) {
    return new Response(auth.message, { status: auth.status });
  }

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-parse/stream',
  });
  if (!rl.allowed) {
    return new Response(rl.message, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    });
  }

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
    customPrompt: rawCustomPrompt,
    parseScenarioKey,
    parserConcurrency,
    overrideParserModels,
    overrideJudgeModel,
    injectedLocalResult,
  } = body;
  if (!documentId || !userId) {
    return new Response('Missing documentId or userId', { status: 400 });
  }

  // Validate caller-provided customPrompt before it overrides the SSoT prompt.
  const customPromptValidation = validateUserSuppliedPrompt(rawCustomPrompt, {
    maxLength: CUSTOM_TRANSCRIPT_PROMPT_MAX_LEN,
    context: 'transcript-parse/stream',
  });
  if (!customPromptValidation.ok) {
    return new Response(customPromptValidation.message, { status: 400 });
  }
  const customPrompt = customPromptValidation.prompt;

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
