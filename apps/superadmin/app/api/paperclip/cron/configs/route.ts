// GET/PATCH /api/paperclip/cron/configs
//
// Manage Paperclip cron job configurations (enable/disable, interval).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { CronJobType } from '@/lib/paperclip/adapter-models';

const VALID_JOB_TYPES: CronJobType[] = ['agent_health', 'work_summary', 'auto_dispatch'];

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('paperclip_cron_configs')
    .select('*')
    .order('job_type');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configs: data });
}

export async function PATCH(request: NextRequest) {
  let body: {
    job_type: CronJobType;
    enabled?: boolean;
    interval_seconds?: number;
  };

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

  if (body.interval_seconds !== undefined && body.interval_seconds < 30) {
    return NextResponse.json(
      { ok: false, error: 'interval_seconds must be >= 30' },
      { status: 400 },
    );
  }

  const userId = request.headers.get('x-user-id');
  const updates: Record<string, unknown> = {};
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.interval_seconds !== undefined) updates.interval_seconds = body.interval_seconds;
  if (userId) updates.updated_by = userId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('paperclip_cron_configs')
    .update(updates)
    .eq('job_type', body.job_type)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config: data });
}
