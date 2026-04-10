// filepath: apps/superadmin/app/api/transcript-parse/jobs/route.ts
// Enqueue cloud transcript parse; execution continues via after() + optional cron.
// Hardened per docs/ai-prompt-safety-guide.md (CRITICAL #2):
//   - customPrompt is validated (length cap + injection-pattern logging)
//     before being persisted into the job payload.

import { after, NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import type { TranscriptParseStreamPayload } from '@/lib/transcript-parse/run-transcript-parse-core';
import { processTranscriptParseJobById } from '@/lib/transcript-parse/process-transcript-parse-job';
import {
  PROMPT_INPUT_LIMITS,
  validateUserSuppliedPrompt,
} from '@/lib/ai/prompt-safety';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const CUSTOM_TRANSCRIPT_PROMPT_MAX_LEN = PROMPT_INPUT_LIMITS.documentTextMax;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Caller must be a super_admin. body.userId is the target whose keys we use.
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/transcript-parse/jobs',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-parse/jobs',
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const documentIdRaw = body.documentId ?? (body as { document_id?: string }).document_id;
  const userIdRaw = body.userId ?? (body as { user_id?: string }).user_id;
  const documentId = typeof documentIdRaw === 'string' ? documentIdRaw.trim() : '';
  const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : '';
  const {
    customPrompt: rawCustomPrompt,
    parseScenarioKey,
    parserConcurrency,
    overrideParserModels,
    overrideJudgeModel,
    injectedLocalResult,
  } = body;

  if (!documentId || !userId) {
    return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
  }

  // Validate caller-provided customPrompt before persisting it into the job
  // payload (which would later override the SSoT prompt at execution time).
  const customPromptValidation = validateUserSuppliedPrompt(rawCustomPrompt, {
    maxLength: CUSTOM_TRANSCRIPT_PROMPT_MAX_LEN,
    context: 'transcript-parse/jobs',
  });
  if (!customPromptValidation.ok) {
    return NextResponse.json({ error: customPromptValidation.message }, { status: 400 });
  }
  const customPrompt = customPromptValidation.prompt;

  const admin = createAdminClient();
  const { data: docRow, error: docLookupErr } = await admin
    .from('property_documents')
    .select('id')
    .eq('id', documentId)
    .eq('is_active', true)
    .maybeSingle();

  if (docLookupErr || !docRow?.id) {
    return NextResponse.json(
      {
        error:
          '找不到啟用中的謄本文件（可能已刪除或資料已過期）。請重新整理頁面後再選取文件並重試。',
      },
      { status: 400 },
    );
  }

  const payload: TranscriptParseStreamPayload = {
    documentId,
    userId,
    customPrompt,
    parseScenarioKey,
    parserConcurrency,
    overrideParserModels,
    overrideJudgeModel,
    injectedLocalResult,
  };

  const now = new Date().toISOString();

  await admin
    .from('transcript_parse_jobs')
    .update({
      status: 'cancelled',
      completed_at: now,
      error_message: '已由新任務取代',
    })
    .eq('property_document_id', documentId)
    .eq('status', 'queued');

  const { data: inserted, error: insertErr } = await admin
    .from('transcript_parse_jobs')
    .insert({
      property_document_id: documentId,
      requested_by_user_id: userId,
      status: 'queued',
      phase_message: '排隊中…',
      progress: [],
      payload: payload as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    return NextResponse.json(
      { error: insertErr?.message ?? '無法建立解析任務' },
      { status: 500 },
    );
  }

  const jobId = inserted.id as string;

  after(() => {
    void processTranscriptParseJobById(jobId);
  });

  return NextResponse.json({ jobId });
}
