// filepath: apps/superadmin/lib/transcript-parse/process-transcript-parse-job.ts
// Claims a queued job and runs the shared parse core (background-safe; no browser request signal).

import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseStreamPayload } from '@/lib/transcript-parse/run-transcript-parse-core';
import { runTranscriptParseCore } from '@/lib/transcript-parse/run-transcript-parse-core';

export type JobProgressRow = {
  provider: string;
  model: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled' | 'skipped';
  duration_ms?: number;
  error?: string;
};

function phaseFromEvent(ev: Record<string, unknown>): string {
  const t = ev.type as string;
  if (t === 'init' || t === 'downloading' || t === 'consensus' || t === 'saving') {
    return typeof ev.message === 'string' ? ev.message : '';
  }
  if (t === 'parse_start') return '解析中…';
  if (t === 'judge_start') return typeof ev.message === 'string' ? ev.message : '裁判中…';
  if (t === 'judge_done') return '裁判完成';
  return '';
}

function applyEventToProgress(prev: JobProgressRow[], ev: Record<string, unknown>): JobProgressRow[] {
  const t = ev.type as string;
  if (t === 'models_loaded') {
    const pm = ev.parserModels as { provider: string; model: string }[];
    return pm.map((m) => ({ provider: m.provider, model: m.model, status: 'pending' as const }));
  }
  if (t === 'model_start') {
    const index = ev.index as number;
    return prev.map((p, i) => (i === index ? { ...p, status: 'running' as const } : p));
  }
  if (t === 'model_result') {
    const index = ev.index as number;
    const success = Boolean(ev.success);
    return prev.map((p, i) =>
      i === index
        ? {
            ...p,
            status: success ? ('success' as const) : ('error' as const),
            duration_ms: ev.duration_ms as number | undefined,
            error: typeof ev.error === 'string' ? ev.error : undefined,
          }
        : p,
    );
  }
  if (t === 'model_cancelled') {
    const index = ev.index as number;
    return prev.map((p, i) => (i === index ? { ...p, status: 'cancelled' as const } : p));
  }
  if (t === 'model_skipped') {
    const index = ev.index as number;
    return prev.map((p, i) => (i === index ? { ...p, status: 'skipped' as const } : p));
  }
  return prev;
}

/**
 * Picks the oldest queued job id (for cron). Does not claim.
 */
export async function peekOldestQueuedTranscriptParseJobId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('transcript_parse_jobs')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (row?.id as string | undefined) ?? null;
}

/**
 * Atomically transitions queued → running and runs the parse. No-op if already claimed or not queued.
 */
export async function processTranscriptParseJobById(jobId: string): Promise<void> {
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();

  const { data: claimed, error: claimErr } = await admin
    .from('transcript_parse_jobs')
    .update({
      status: 'running',
      started_at: startedAt,
      phase_message: '執行中…',
    })
    .eq('id', jobId)
    .eq('status', 'queued')
    .select('id, payload')
    .maybeSingle();

  if (claimErr || !claimed?.id) {
    return;
  }

  const payload = claimed.payload as unknown as TranscriptParseStreamPayload;
  if (!payload?.documentId || !payload?.userId) {
    await admin
      .from('transcript_parse_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: '任務 payload 缺少 documentId 或 userId',
      })
      .eq('id', jobId);
    return;
  }

  let progress: JobProgressRow[] = [];
  let phaseMessage = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushProgress = () => {
    flushTimer = null;
    void admin
      .from('transcript_parse_jobs')
      .update({
        progress,
        phase_message: phaseMessage || null,
      })
      .eq('id', jobId);
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(flushProgress, 350);
  };

  const neverAborted = new AbortController();

  const outcome = await runTranscriptParseCore(admin, payload, {
    stopSignal: neverAborted.signal,
    onEvent: (ev) => {
      const ph = phaseFromEvent(ev);
      if (ph) phaseMessage = ph;
      progress = applyEventToProgress(progress, ev);
      scheduleFlush();
    },
  });

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const completedAt = new Date().toISOString();

  if (outcome.kind === 'complete') {
    await admin
      .from('transcript_parse_jobs')
      .update({
        status: 'succeeded',
        completed_at: completedAt,
        phase_message: null,
        progress,
        error_message: null,
      })
      .eq('id', jobId);
    return;
  }

  if (outcome.kind === 'aborted') {
    await admin
      .from('transcript_parse_jobs')
      .update({
        status: 'failed',
        completed_at: completedAt,
        error_message: '解析已中止',
        progress,
      })
      .eq('id', jobId);
    return;
  }

  await admin
    .from('transcript_parse_jobs')
    .update({
      status: 'failed',
      completed_at: completedAt,
      error_message: outcome.message,
      progress,
    })
    .eq('id', jobId);
}
