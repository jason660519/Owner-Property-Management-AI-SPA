// GET /api/backup/run-logs — recent backup execution audit rows (superadmin)

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('backup_run_logs')
    .select('id, trigger, destinations, backup_id, filename, success, error_message, stats, cloud_result, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
