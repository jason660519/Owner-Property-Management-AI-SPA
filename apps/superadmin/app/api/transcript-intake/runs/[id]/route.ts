// filepath: apps/superadmin/app/api/transcript-intake/runs/[id]/route.ts
// Read a unified transcript intake run by id.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { buildPropertySyncFromConfirmedTranscriptIntake } from '@/lib/transcript-parse/confirmed-result-to-property-details';
import type { TranscriptDetectionResult, TranscriptReviewResult } from '@/lib/transcript-parse/intake-types';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function serializeRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyType: row.property_type,
    requestedByUserId: row.requested_by_user_id,
    status: row.status,
    currentPhase: row.current_phase,
    sourceDocumentIds: row.source_document_ids,
    routeDecision: row.route_decision,
    detectionResult: row.detection_result,
    parsedResult: row.parsed_result,
    reviewResult: row.review_result,
    confirmedResult: row.confirmed_result,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function propertyTable(propertyType: unknown): 'property_sales' | 'property_rentals' | null {
  if (propertyType === 'sale') return 'property_sales';
  if (propertyType === 'rental') return 'property_rentals';
  return null;
}

async function syncPrimaryOwner(params: {
  admin: ReturnType<typeof createAdminClient>;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerName: string | null;
}): Promise<void> {
  if (!params.ownerName) return;

  const { data: existingOwner } = await params.admin
    .from('property_owners')
    .select('id')
    .eq('property_id', params.propertyId)
    .eq('property_type', params.propertyType)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingOwner?.id) {
    await params.admin
      .from('property_owners')
      .update({ owner_name: params.ownerName })
      .eq('id', existingOwner.id);
  } else {
    await params.admin.from('property_owners').insert({
      property_id: params.propertyId,
      property_type: params.propertyType,
      owner_name: params.ownerName,
    });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/transcript-intake/runs/[id]',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { id } = await context.params;
  if (!id) return jsonError('Missing id', 400);

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('transcript_intake_runs')
    .select(
      'id, property_id, property_type, requested_by_user_id, status, current_phase, source_document_ids, route_decision, detection_result, parsed_result, review_result, confirmed_result, error_message, created_at, updated_at, completed_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!row) return jsonError('找不到謄本工作台任務', 404);

  return NextResponse.json({ run: serializeRun(row as Record<string, unknown>) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/transcript-intake/runs/[id]',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-intake/runs/confirm',
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await context.params;
  if (!id) return jsonError('Missing id', 400);

  const body = await request.json().catch(() => ({})) as {
    areaDetailDraft?: unknown;
  };
  const admin = createAdminClient();
  const completedAt = new Date().toISOString();
  const { data: row, error } = await admin
    .from('transcript_intake_runs')
    .select(
      'id, property_id, property_type, requested_by_user_id, status, current_phase, source_document_ids, route_decision, detection_result, parsed_result, review_result, confirmed_result, error_message, created_at, updated_at, completed_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!row || row.status !== 'needs_user_confirmation') {
    return jsonError('找不到可確認的謄本工作台任務', 404);
  }

  const snapshot = row as Record<string, unknown>;
  const propertyId = typeof snapshot.property_id === 'string' ? snapshot.property_id : '';
  const propertyType = snapshot.property_type === 'sale' || snapshot.property_type === 'rental'
    ? snapshot.property_type
    : null;
  const table = propertyTable(propertyType);
  if (!propertyId || !propertyType || !table) {
    return jsonError('謄本工作台任務缺少物件資料，無法儲存。', 400);
  }

  const propertySync = buildPropertySyncFromConfirmedTranscriptIntake({
    runId: id,
    parsedResult: snapshot.parsed_result,
    detection: (snapshot.detection_result ?? null) as TranscriptDetectionResult | null,
    review: (snapshot.review_result ?? null) as TranscriptReviewResult | null,
    confirmedAt: completedAt,
    areaDetailDraft: body.areaDetailDraft,
  });

  const { data: propertyRow, error: propertyFetchError } = await admin
    .from(table)
    .select('details')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyFetchError) return jsonError(propertyFetchError.message, 500);
  if (!propertyRow) return jsonError('找不到謄本對應物件，無法儲存。', 404);

  const existingDetails = (propertyRow.details ?? {}) as Record<string, unknown>;
  const updatedDetails = {
    ...existingDetails,
    ...propertySync.detailsPatch,
  };

  const { error: propertyUpdateError } = await admin
    .from(table)
    .update({
      details: updatedDetails,
      has_independent_parking: propertySync.hasIndependentParking,
      is_pure_land: propertySync.isPureLand,
      land_number: propertySync.landNumber,
    })
    .eq('id', propertyId);
  if (propertyUpdateError) return jsonError(propertyUpdateError.message, 500);

  await syncPrimaryOwner({
    admin,
    propertyId,
    propertyType,
    ownerName: propertySync.primaryOwnerName,
  });

  const confirmedResult = {
    confirmedAt: completedAt,
    confirmedByUserId: auth.userId,
    detection: snapshot.detection_result,
    parsed: snapshot.parsed_result,
    review: snapshot.review_result,
    propertySync: {
      hasIndependentParking: propertySync.hasIndependentParking,
      isPureLand: propertySync.isPureLand,
      landNumber: propertySync.landNumber,
      syncedDetailKeys: Object.keys(propertySync.detailsPatch),
    },
    areaDetailDraft: body.areaDetailDraft ?? null,
  };

  const { data: confirmedRow, error: confirmedError } = await admin
    .from('transcript_intake_runs')
    .update({
      confirmed_result: confirmedResult,
      status: 'confirmed',
      current_phase: 'confirmed',
      completed_at: completedAt,
    })
    .eq('id', id)
    .eq('status', 'needs_user_confirmation')
    .select(
      'id, property_id, property_type, requested_by_user_id, status, current_phase, source_document_ids, route_decision, detection_result, parsed_result, review_result, confirmed_result, error_message, created_at, updated_at, completed_at',
    )
    .maybeSingle();

  if (confirmedError) return jsonError(confirmedError.message, 500);
  if (!confirmedRow) return jsonError('謄本確認狀態已變更，請重新整理。', 409);

  revalidatePath(`/superadmin/properties/${propertyId}/edit`);
  revalidatePath('/superadmin/properties');
  return NextResponse.json({ run: serializeRun(confirmedRow as Record<string, unknown>) });
}
