// filepath: apps/superadmin/app/api/transcript-parse/jobs/[id]/route.ts
// Poll job status + progress for UI (service_role read).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/transcript-parse/jobs/[id]',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('transcript_parse_jobs')
    .select(
      'id, status, phase_message, progress, error_message, created_at, started_at, completed_at, property_document_id',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: '找不到任務' }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    phaseMessage: row.phase_message,
    progress: row.progress,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    propertyDocumentId: row.property_document_id,
  });
}
