// filepath: apps/superadmin/lib/transcript-parse/process-transcript-intake-run.ts
// Background-safe processor for unified transcript intake runs.

import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import type {
  TranscriptDetectionResult,
  TranscriptDispositionKind,
  TranscriptDocumentKind,
  TranscriptIntakeParsedResult,
  TranscriptReviewResult,
} from '@/lib/transcript-parse/intake-types';
import {
  runTranscriptIntakeDetectionAi,
  runTranscriptIntakeReviewAi,
} from '@/lib/transcript-parse/intake-ai';
import { runTranscriptParseCore } from '@/lib/transcript-parse/run-transcript-parse-core';

type AdminClient = ReturnType<typeof createAdminClient>;

interface IntakeRunRow {
  id: string;
  requested_by_user_id: string;
  source_document_ids: string[];
  route_decision: Record<string, unknown>;
}

interface DocumentSnapshotRow {
  id: string;
  document_type: string;
  document_name: string | null;
  parsed_result: TranscriptParseOutput | null;
  consensus_metadata: Record<string, unknown> | null;
}

function documentKindFromType(documentType: string): TranscriptDocumentKind {
  if (documentType === 'building_registry_transcript') return 'building_transcript';
  if (documentType === 'land_registry_transcript') return 'land_transcript';
  if (documentType === 'parking_building_registry_transcript') return 'parking_building_transcript';
  if (documentType === 'parking_land_registry_transcript') return 'parking_land_transcript';
  return 'unknown';
}

function dispositionFromKinds(kinds: TranscriptDocumentKind[]): TranscriptDispositionKind {
  const hasBuilding = kinds.includes('building_transcript');
  const hasLand = kinds.includes('land_transcript');
  const hasParking = kinds.includes('parking_building_transcript') || kinds.includes('parking_land_transcript');

  if (!hasBuilding && hasLand && !hasParking) return 'pure_land_sale';
  if (hasParking && !hasBuilding && !hasLand) return 'parking_only_sale';
  if (hasBuilding && hasLand) return 'unit_building_with_land_share_sale';
  if (hasParking || hasBuilding || hasLand) return 'mixed_or_unclear';
  return 'unknown';
}

function buildDetectionSeed(documents: DocumentSnapshotRow[]): TranscriptDetectionResult {
  const documentKinds = [...new Set(documents.map((doc) => documentKindFromType(doc.document_type)))];
  const hasIndependentParking = documentKinds.includes('parking_building_transcript') ||
    documentKinds.includes('parking_land_transcript');

  return {
    dispositionKind: dispositionFromKinds(documentKinds),
    documentKinds,
    parkingTitleRights: hasIndependentParking ? ['independent'] : [],
    hasBuildingTranscript: documentKinds.includes('building_transcript'),
    hasLandTranscript: documentKinds.includes('land_transcript'),
    hasParkingEvidence: hasIndependentParking,
    buildingOwnershipLikelyFull: null,
    landOwnershipLikelyFull: null,
    buildingNumberCount: null,
    landParcelCount: null,
    riskFlags: ['AI detect stage pending; seeded from uploaded document types.'],
    evidence: documents.map((doc) => ({
      documentId: doc.id,
      section: 'property_documents.document_type',
      text: doc.document_name || doc.document_type,
    })),
  };
}

function buildReviewSeed(
  detection: TranscriptDetectionResult,
  parsedDocuments: DocumentSnapshotRow[],
): TranscriptReviewResult {
  const missingParsed = parsedDocuments
    .filter((doc) => !doc.parsed_result)
    .map((doc) => doc.document_name || doc.id);

  return {
    approved: missingParsed.length === 0,
    confidence: missingParsed.length === 0 ? 0.55 : 0.2,
    issues: missingParsed.map((label) => ({
      severity: 'blocking',
      fieldPath: 'documents.parsed_result',
      message: `文件尚未產生解析結果：${label}`,
    })),
    parkingTitleRights: detection.parkingTitleRights,
    dispositionKind: detection.dispositionKind,
    userConfirmationRequired: [
      '請確認案件出售型態、建物/土地持分與車位產權型態。',
      'AI review stage pending; current review is a processor seed.',
    ],
  };
}

async function loadDocumentSnapshots(
  admin: AdminClient,
  documentIds: string[],
): Promise<DocumentSnapshotRow[]> {
  const { data, error } = await admin
    .from('property_documents')
    .select('id, document_type, document_name, parsed_result, consensus_metadata')
    .in('id', documentIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentSnapshotRow[];
}

async function failRun(admin: AdminClient, runId: string, message: string): Promise<void> {
  await admin
    .from('transcript_intake_runs')
    .update({
      status: 'failed',
      current_phase: 'failed',
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

export async function processTranscriptIntakeRunById(runId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: claimed, error: claimError } = await admin
    .from('transcript_intake_runs')
    .update({
      status: 'detecting',
      current_phase: 'detecting',
      error_message: null,
    })
    .eq('id', runId)
    .eq('status', 'route_selected')
    .select('id, requested_by_user_id, source_document_ids, route_decision')
    .maybeSingle();

  if (claimError || !claimed?.id) return;

  const run = claimed as IntakeRunRow;
  if (!Array.isArray(run.source_document_ids) || run.source_document_ids.length === 0) {
    await failRun(admin, runId, '任務缺少 source_document_ids');
    return;
  }

  try {
    const initialDocuments = await loadDocumentSnapshots(admin, run.source_document_ids);
    let detection = buildDetectionSeed(initialDocuments);
    try {
      detection = await runTranscriptIntakeDetectionAi({
        adminClient: admin,
        runId,
        userId: run.requested_by_user_id,
        documentIds: run.source_document_ids,
        routeDecision: run.route_decision,
      });
    } catch (error) {
      detection = {
        ...detection,
        riskFlags: [
          ...detection.riskFlags,
          `AI detect failed; using seeded detection: ${error instanceof Error ? error.message : 'unknown error'}`,
        ],
      };
    }

    await admin
      .from('transcript_intake_runs')
      .update({
        detection_result: detection as unknown as Record<string, unknown>,
        status: 'parsing',
        current_phase: 'parsing',
      })
      .eq('id', runId);

    const neverAborted = new AbortController();
    const parseOutcomes: Array<{ documentId: string; kind: string; message?: string }> = [];

    for (const documentId of run.source_document_ids) {
      await admin
        .from('transcript_intake_runs')
        .update({ current_phase: `parsing:${documentId}` })
        .eq('id', runId);

      const outcome = await runTranscriptParseCore(
        admin,
        { documentId, userId: run.requested_by_user_id },
        { stopSignal: neverAborted.signal, onEvent: () => undefined },
      );
      parseOutcomes.push({
        documentId,
        kind: outcome.kind,
        message: outcome.kind === 'error' ? outcome.message : undefined,
      });
      if (outcome.kind !== 'complete') {
        await failRun(admin, runId, outcome.kind === 'error' ? outcome.message : '解析已中止');
        return;
      }
    }

    await admin
      .from('transcript_intake_runs')
      .update({
        status: 'reviewing',
        current_phase: 'reviewing',
      })
      .eq('id', runId);

    const parsedDocuments = await loadDocumentSnapshots(admin, run.source_document_ids);
    const parsedResult: TranscriptIntakeParsedResult = {
      strategy: 'existing_transcript_parse_core',
      routeDecision: run.route_decision,
      parseOutcomes,
      documents: parsedDocuments.map((doc) => ({
        documentId: doc.id,
        documentType: doc.document_type,
        documentName: doc.document_name,
        parsedResult: doc.parsed_result,
        consensusMetadata: doc.consensus_metadata,
      })),
    };
    let review = buildReviewSeed(detection, parsedDocuments);
    try {
      review = await runTranscriptIntakeReviewAi({
        adminClient: admin,
        runId,
        userId: run.requested_by_user_id,
        documentIds: run.source_document_ids,
        routeDecision: run.route_decision,
        parsedResult,
      });
    } catch (error) {
      review = {
        ...review,
        issues: [
          ...review.issues,
          {
            severity: 'warning',
            fieldPath: 'review.ai',
            message: `AI review failed; using seeded review: ${error instanceof Error ? error.message : 'unknown error'}`,
          },
        ],
      };
    }

    await admin
      .from('transcript_intake_runs')
      .update({
        status: 'needs_user_confirmation',
        current_phase: 'needs_user_confirmation',
        parsed_result: parsedResult,
        review_result: review as unknown as Record<string, unknown>,
        error_message: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  } catch (error) {
    await failRun(admin, runId, error instanceof Error ? error.message : '謄本工作台任務失敗');
  }
}

export async function peekOldestRouteSelectedTranscriptIntakeRunId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('transcript_intake_runs')
    .select('id')
    .eq('status', 'route_selected')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (row?.id as string | undefined) ?? null;
}
