// POST /api/paperclip/cron/run
//
// Manually trigger a single execution of a cron job type.
// Delegates to the existing API routes, logs the event, and updates last_run_at.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { CronJobType } from '@/lib/paperclip/adapter-models';

const VALID_JOB_TYPES: CronJobType[] = ['agent_health', 'work_summary', 'auto_dispatch'];

function getInternalUrl(jobType: CronJobType): string {
  const base = process.env.NEXT_PUBLIC_SUPERADMIN_URL ?? 'http://localhost:3001';
  const map: Record<CronJobType, string> = {
    agent_health: '/api/paperclip/agent-health',
    work_summary: '/api/paperclip/work-summary',
    auto_dispatch: '/api/paperclip/auto-dispatch',
  };
  return `${base.replace(/\/+$/, '')}${map[jobType]}`;
}

export async function POST(request: NextRequest) {
  let body: { job_type: CronJobType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.job_type || !VALID_JOB_TYPES.includes(body.job_type)) {
    return NextResponse.json(
      { ok: false, error: `Invalid job_type. Valid: ${VALID_JOB_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const userId = request.headers.get('x-user-id');
  const url = getInternalUrl(body.job_type);
  const method = body.job_type === 'auto_dispatch' ? 'POST' : 'GET';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify({ dryRun: false, limit: 2 }) } : {}),
    });

    const result = await res.json().catch(() => ({}));

    // Update last_run_at + last_result
    const supabase = createAdminClient();
    await supabase
      .from('paperclip_cron_configs')
      .update({
        last_run_at: new Date().toISOString(),
        last_result: { status: res.ok ? 'success' : 'error', httpStatus: res.status, data: result },
        ...(userId ? { updated_by: userId } : {}),
      })
      .eq('job_type', body.job_type);

    // Log event
    if (userId) {
      await supabase.from('paperclip_task_events').insert({
        agent_id: null,
        event_type: 'cron_triggered',
        detail: { job_type: body.job_type, manual: true, httpStatus: res.status },
        performed_by: userId,
      });
    }

    return NextResponse.json({
      ok: res.ok,
      job_type: body.job_type,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Network error' },
      { status: 502 },
    );
  }
}
