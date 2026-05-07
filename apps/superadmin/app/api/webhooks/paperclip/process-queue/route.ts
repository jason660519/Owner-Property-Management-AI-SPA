// POST /api/webhooks/paperclip/process-queue
//
// Cron worker that drains pending rows from paperclip_webhook_logs.
// Called by Vercel Cron (every minute) or manually from the superadmin UI.
// Requires CRON_SECRET header to prevent unauthorized invocation.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const CRON_SECRET = process.env.CRON_SECRET ?? '';
const BATCH_SIZE = 20;

interface WebhookLogRow {
  id: string;
  event_type: string;
  issue_id: string;
  issue_key: string | null;
  payload: Record<string, unknown>;
  attempt_count: number;
}

type ProcessResult = 'processed' | 'failed' | 'skipped';

async function processEvent(
  supabase: ReturnType<typeof createAdminClient>,
  row: WebhookLogRow,
): Promise<{ result: ProcessResult; note?: string }> {
  const { event_type, issue_key, payload } = row;

  // Events we recognise and act on
  if (event_type === 'issue.completed' || event_type === 'issue.percentage_updated') {
    const issue = (payload.issue ?? {}) as Record<string, unknown>;
    const percentage = typeof issue.percentage === 'number' ? issue.percentage : null;

    if (!issue_key) {
      return { result: 'skipped', note: 'no issue_key — cannot correlate to roadmap feature' };
    }

    if (percentage !== null) {
      // Detect conflict: if we can find a feature with this vis_issue_key but different local %,
      // record a sync_conflict for human review. We don't auto-apply remote values.
      const { data: conflict } = await supabase
        .from('sync_conflicts')
        .select('id')
        .eq('vis_issue_key', issue_key)
        .eq('resolved', false)
        .maybeSingle();

      if (!conflict) {
        await supabase.from('sync_conflicts').insert({
          feature_name: (issue.title ?? issue_key) as string,
          vis_issue_key: issue_key,
          conflict_type: 'percentage_mismatch',
          local_value: null,
          remote_value: { percentage, event_type },
          webhook_log_id: row.id,
        });
      }
    }
    return { result: 'processed' };
  }

  if (event_type === 'issue.created') {
    return { result: 'processed' };
  }

  return { result: 'skipped', note: `unhandled event_type: ${event_type}` };
}

export async function POST(request: NextRequest) {
  // Auth: verify CRON_SECRET unless running locally (empty secret = dev mode)
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = createAdminClient();

  // Claim a batch atomically: set status='processing'
  const { data: rows, error: fetchError } = await supabase
    .from('paperclip_webhook_logs')
    .select('id, event_type, issue_id, issue_key, payload, attempt_count')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Queue empty' });
  }

  const ids = (rows as WebhookLogRow[]).map((r) => r.id);
  await supabase
    .from('paperclip_webhook_logs')
    .update({ status: 'processing' })
    .in('id', ids);

  const summary = { processed: 0, skipped: 0, failed: 0 };

  for (const row of rows as WebhookLogRow[]) {
    const { result, note } = await processEvent(supabase, row);
    summary[result]++;

    await supabase
      .from('paperclip_webhook_logs')
      .update({
        status: result,
        error_message: note ?? null,
        processed_at: new Date().toISOString(),
        attempt_count: row.attempt_count + 1,
      })
      .eq('id', row.id);
  }

  return NextResponse.json({ ok: true, ...summary });
}
