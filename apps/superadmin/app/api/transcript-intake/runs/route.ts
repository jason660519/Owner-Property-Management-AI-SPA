// filepath: apps/superadmin/app/api/transcript-intake/runs/route.ts
// Create and list unified transcript intake runs.

import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import {
  decideTranscriptTechnicalRoute,
  inferTranscriptInputFormat,
} from '@/lib/transcript-parse/intake-router';
import type { TranscriptTechnicalRoute } from '@/lib/transcript-parse/intake-types';
import { extractTranscriptPdfTextForRouting } from '@/lib/transcript-parse/transcript-pdf-probe';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PropertyTypeInput = 'sale' | 'rental';

interface CreateRunBody {
  propertyId?: unknown;
  propertyType?: unknown;
  documentIds?: unknown;
}

interface PropertyDocumentRow {
  id: string;
  property_id: string;
  property_type: string;
  file_path: string;
  document_name: string | null;
  mime_type: string | null;
  original_filename: string | null;
  document_type: string | null;
}

const MAX_DOCUMENTS_PER_RUN = 20;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function parsePropertyType(raw: unknown): PropertyTypeInput | null {
  return raw === 'sale' || raw === 'rental' ? raw : null;
}

function propertyDocumentType(propertyType: PropertyTypeInput): 'sales' | 'rentals' {
  return propertyType === 'sale' ? 'sales' : 'rentals';
}

function parseDocumentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function chooseAggregateRoute(routes: TranscriptTechnicalRoute[]): TranscriptTechnicalRoute {
  if (routes.includes('unsupported')) return 'unsupported';
  if (routes.includes('vlm_visual')) return 'vlm_visual';
  if (routes.includes('local_python_text')) return 'local_python_text';
  if (routes.includes('structured_json')) return 'structured_json';
  return 'unsupported';
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

async function getPdfTextForRouting(
  admin: ReturnType<typeof createAdminClient>,
  filePath: string,
): Promise<{
  extractedText: string;
  probe: Record<string, unknown> | null;
  errorMessage: string | null;
}> {
  try {
    const { data: blob, error } = await admin.storage
      .from('property-documents')
      .download(filePath);
    if (error || !blob) {
      return {
        extractedText: '',
        probe: null,
        errorMessage: error?.message ?? 'download failed',
      };
    }
    const probe = await extractTranscriptPdfTextForRouting(
      Buffer.from(await blob.arrayBuffer()),
    );
    return {
      extractedText: probe.text,
      probe: {
        pageCount: probe.pageCount,
        totalChars: probe.totalChars,
        likelyScanned: probe.likelyScanned,
      },
      errorMessage: null,
    };
  } catch (error) {
    return {
      extractedText: '',
      probe: null,
      errorMessage: error instanceof Error ? error.message : 'PDF text probe failed',
    };
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin({
    request,
    routeLabel: 'api/transcript-intake/runs',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const rl = await checkRateLimit({
    userId: auth.userId,
    endpointKey: 'api/transcript-intake/runs',
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let body: CreateRunBody;
  try {
    body = await request.json() as CreateRunBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
  const propertyType = parsePropertyType(body.propertyType);
  const documentIds = parseDocumentIds(body.documentIds);

  if (!propertyId || !propertyType) {
    return jsonError('Missing propertyId or propertyType', 400);
  }
  if (documentIds.length === 0) {
    return jsonError('At least one documentId is required', 400);
  }
  if (documentIds.length > MAX_DOCUMENTS_PER_RUN) {
    return jsonError(`最多一次處理 ${MAX_DOCUMENTS_PER_RUN} 份謄本文件`, 400);
  }

  const admin = createAdminClient();
  const { data: docs, error: docsError } = await admin
    .from('property_documents')
    .select('id, property_id, property_type, file_path, document_name, mime_type, original_filename, document_type')
    .in('id', documentIds)
    .eq('is_active', true);

  if (docsError) return jsonError(docsError.message, 500);

  const rows = (docs ?? []) as PropertyDocumentRow[];
  if (rows.length !== documentIds.length) {
    return jsonError('部分謄本文件不存在或已停用，請重新整理後再試。', 400);
  }

  const expectedDocumentType = propertyDocumentType(propertyType);
  const mismatched = rows.find(
    (row) => row.property_id !== propertyId || row.property_type !== expectedDocumentType,
  );
  if (mismatched) {
    return jsonError('謄本文件與指定物件不一致，無法建立解析工作台任務。', 400);
  }

  const documentRouteDecisions = await Promise.all(rows.map(async (row) => {
    const fileName = row.original_filename || row.document_name || row.file_path;
    const inputFormat = inferTranscriptInputFormat(fileName, row.mime_type);
    const pdfProbe = inputFormat === 'pdf'
      ? await getPdfTextForRouting(admin, row.file_path)
      : { extractedText: '', probe: null, errorMessage: null };
    const decision = decideTranscriptTechnicalRoute({
      fileName,
      mimeType: row.mime_type,
      documentType: row.document_type,
      extractedText: pdfProbe.extractedText,
    });
    const reasons = pdfProbe.errorMessage
      ? [...decision.reasons, `PDF text probe failed: ${pdfProbe.errorMessage}`]
      : decision.reasons;
    return {
      documentId: row.id,
      filePath: row.file_path,
      documentName: row.document_name,
      originalFilename: row.original_filename,
      ...decision,
      reasons,
      pdfTextProbe: pdfProbe.probe,
    };
  }));
  const aggregateRoute = chooseAggregateRoute(documentRouteDecisions.map((item) => item.route));

  const routeDecision = {
    aggregateRoute,
    documents: documentRouteDecisions,
  };

  const { data: inserted, error: insertError } = await admin
    .from('transcript_intake_runs')
    .insert({
      property_id: propertyId,
      property_type: propertyType,
      requested_by_user_id: auth.userId,
      status: 'route_selected',
      current_phase: 'route_selected',
      source_document_ids: documentIds,
      route_decision: routeDecision,
    })
    .select(
      'id, property_id, property_type, requested_by_user_id, status, current_phase, source_document_ids, route_decision, detection_result, parsed_result, review_result, confirmed_result, error_message, created_at, updated_at, completed_at',
    )
    .single();

  if (insertError || !inserted) {
    return jsonError(insertError?.message ?? '無法建立謄本工作台任務', 500);
  }

  return NextResponse.json({ run: serializeRun(inserted as Record<string, unknown>) });
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/transcript-intake/runs',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('propertyId')?.trim() ?? '';
  const propertyType = parsePropertyType(url.searchParams.get('propertyType'));

  if (!propertyId || !propertyType) {
    return jsonError('Missing propertyId or propertyType', 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('transcript_intake_runs')
    .select(
      'id, property_id, property_type, requested_by_user_id, status, current_phase, source_document_ids, route_decision, detection_result, parsed_result, review_result, confirmed_result, error_message, created_at, updated_at, completed_at',
    )
    .eq('property_id', propertyId)
    .eq('property_type', propertyType)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return jsonError(error.message, 500);

  const runs = ((data ?? []) as Array<Record<string, unknown>>).map(serializeRun);
  return NextResponse.json({ runs });
}
