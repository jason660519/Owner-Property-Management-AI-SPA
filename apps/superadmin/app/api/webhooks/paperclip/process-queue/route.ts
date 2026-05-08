// POST /api/webhooks/paperclip/process-queue
//
// Cron worker that drains pending rows from paperclip_webhook_logs.
// Called by Vercel Cron (every minute) or manually from the superadmin UI.
// Requires CRON_SECRET header to prevent unauthorized invocation.

import { NextRequest, NextResponse } from 'next/server';
import { findRoadmapFeatureByVisIssueKey } from '@/app/data/roadmap';
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

  try {
    // Events we recognise and act on
    if (event_type === 'issue.completed' || event_type === 'issue.percentage_updated') {
      const issue = (payload.issue ?? {}) as Record<string, unknown>;
      const percentage = typeof issue.percentage === 'number' ? issue.percentage : null;

      if (!issue_key) {
        return { result: 'skipped', note: 'no issue_key — cannot correlate to roadmap feature' };
      }

      if (percentage !== null) {
        // Detect conflict: local roadmap % must match VIS payload. We don't auto-apply remote values.
        const localFeature = findRoadmapFeatureByVisIssueKey(issue_key);

        if (!localFeature) {
          const remote_value = { percentage, event_type };
          const { data: existingMissing, error: selMissingErr } = await supabase
            .from('sync_conflicts')
            .select('id')
            .eq('vis_issue_key', issue_key)
            .eq('resolved', false)
            .eq('conflict_type', 'missing_feature')
            .maybeSingle();

          if (selMissingErr) {
            return {
              result: 'failed',
              note: `sync_conflicts select (missing_feature): ${selMissingErr.message}`,
            };
          }

          const featureName = (issue.title ?? issue_key) as string;
          if (existingMissing) {
            const { error: updErr } = await supabase
              .from('sync_conflicts')
              .update({
                feature_name: featureName,
                remote_value,
                webhook_log_id: row.id,
              })
              .eq('id', existingMissing.id);
            if (updErr) {
              return {
                result: 'failed',
                note: `sync_conflicts update (missing_feature): ${updErr.message}`,
              };
            }
          } else {
            const { error: insErr } = await supabase.from('sync_conflicts').insert({
              feature_name: featureName,
              vis_issue_key: issue_key,
              conflict_type: 'missing_feature',
              local_value: null,
              remote_value,
              webhook_log_id: row.id,
            });
            if (insErr) {
              return {
                result: 'failed',
                note: `sync_conflicts insert (missing_feature): ${insErr.message}`,
              };
            }
          }
        } else if (localFeature.percentage !== percentage) {
          const { data: existingPct, error: selPctErr } = await supabase
            .from('sync_conflicts')
            .select('id')
            .eq('vis_issue_key', issue_key)
            .eq('resolved', false)
            .eq('conflict_type', 'percentage_mismatch')
            .maybeSingle();

          if (selPctErr) {
            return {
              result: 'failed',
              note: `sync_conflicts select (percentage_mismatch): ${selPctErr.message}`,
            };
          }

          const featureName = (issue.title ?? localFeature.name ?? issue_key) as string;
          const local_value = {
            percentage: localFeature.percentage,
            feature_id: localFeature.id,
          };
          const remote_value = { percentage, event_type };

          if (existingPct) {
            const { error: updErr } = await supabase
              .from('sync_conflicts')
              .update({
                feature_name: featureName,
                local_value,
                remote_value,
                webhook_log_id: row.id,
              })
              .eq('id', existingPct.id);
            if (updErr) {
              return {
                result: 'failed',
                note: `sync_conflicts update (percentage_mismatch): ${updErr.message}`,
              };
            }
          } else {
            const { error: insErr } = await supabase.from('sync_conflicts').insert({
              feature_name: featureName,
              vis_issue_key: issue_key,
              conflict_type: 'percentage_mismatch',
              local_value,
              remote_value,
              webhook_log_id: row.id,
            });
            if (insErr) {
              return {
                result: 'failed',
                note: `sync_conflicts insert (percentage_mismatch): ${insErr.message}`,
              };
            }
          }
        }
      }
      return { result: 'processed' };
    }

    if (event_type === 'issue.created') {
      return { result: 'processed' };
    }

    return { result: 'skipped', note: `unhandled event_type: ${event_type}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { result: 'failed', note: `unexpected: ${msg}` };
  }
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
  const { error: claimError } = await supabase
    .from('paperclip_webhook_logs')
    .update({ status: 'processing' })
    .in('id', ids);

  if (claimError) {
    return NextResponse.json(
      { ok: false, error: `claim batch failed: ${claimError.message}` },
      { status: 500 },
    );
  }

  const summary = { processed: 0, skipped: 0, failed: 0 };
  let finalizeFailures = 0;

  for (const row of rows as WebhookLogRow[]) {
    const { result, note } = await processEvent(supabase, row);
    summary[result]++;

    const { error: finalizeErr } = await supabase
      .from('paperclip_webhook_logs')
      .update({
        status: result,
        error_message: note ?? null,
        processed_at: new Date().toISOString(),
        attempt_count: row.attempt_count + 1,
      })
      .eq('id', row.id);

    if (finalizeErr) {
      finalizeFailures++;
      console.error(
        '[process-queue] failed to finalize webhook log row',
        row.id,
        finalizeErr.message,
      );
      const fallbackNote = `${note ?? '(no note)'} | finalize_error: ${finalizeErr.message}`;
      const { error: fallbackErr } = await supabase
        .from('paperclip_webhook_logs')
        .update({
          status: 'failed',
          error_message: fallbackNote.slice(0, 2000),
          processed_at: new Date().toISOString(),
          attempt_count: row.attempt_count + 1,
        })
        .eq('id', row.id);
      if (fallbackErr) {
        console.error(
          '[process-queue] fallback finalize also failed',
          row.id,
          fallbackErr.message,
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ...summary,
    ...(finalizeFailures > 0 ? { finalizeFailures } : {}),
  });
}
