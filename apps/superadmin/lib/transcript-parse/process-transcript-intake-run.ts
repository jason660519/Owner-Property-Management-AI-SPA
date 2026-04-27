// filepath: apps/superadmin/lib/transcript-parse/process-transcript-intake-run.ts
// Background-safe processor for unified transcript intake runs.

import { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParseOutput } from '@/lib/types/transcript';
import type {
  TranscriptDetectionResult,
  TranscriptDispositionKind,
  TranscriptIntakeAiStageTrace,
  TranscriptDocumentKind,
  TranscriptIntakeParsedResult,
  TranscriptReviewResult,
  TranscriptTechnicalRoute,
  TranscriptDetailBuilderResult,
} from '@/lib/transcript-parse/intake-types';
import { buildAreaDetailDraftFromIntake } from '@/lib/transcript-parse/intake-area-details';
import { parseTranscriptTextLayer } from '@/lib/transcript-parse/local-text-parser';
import { loadTranscriptParserReports } from '@/lib/transcript-parse/parser-report';
import { extractTranscriptPdfTextForRouting } from '@/lib/transcript-parse/transcript-pdf-probe';
import {
  runTranscriptIntakeDetailBuilderAi,
  runTranscriptIntakeDetectionAi,
  runTranscriptIntakeReviewAi,
} from '@/lib/transcript-parse/intake-ai';
import { buildFailedParseStageTrace } from '@/lib/transcript-parse/intake-parse-failure-trace';
import { attachStageReportUrls, buildDetailBuilderCorrections, buildPendingDetailBuilderStageTrace, buildPendingParseStageTrace, buildPendingReviewStageTrace, buildParseStageTrace, buildReviewCorrections, replaceStageTrace, reviewStageModelsFromResult, safeResolveParseStageModels, safeResolveStageInfo, stageModelFromInfo } from '@/lib/transcript-parse/intake-stage-trace';
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
  file_path?: string | null;
  mime_type?: string | null;
  parsed_result: TranscriptParseOutput | null;
  consensus_metadata: Record<string, unknown> | null;
}

function documentKindFromType(documentType: string): TranscriptDocumentKind {
  if (documentType === 'registry_transcript_unclassified') return 'unknown';
  if (documentType === 'building_registry_transcript') return 'building_transcript';
  if (documentType === 'land_registry_transcript') return 'land_transcript';
  if (documentType === 'building_title') return 'building_title';
  if (documentType === 'land_title') return 'land_title';
  if (documentType === 'parking_building_registry_transcript') return 'parking_building_transcript';
  if (documentType === 'parking_land_registry_transcript') return 'parking_land_transcript';
  return 'unknown';
}

function dispositionFromKinds(kinds: TranscriptDocumentKind[]): TranscriptDispositionKind {
  const hasBuilding = kinds.includes('building_transcript');
  const hasLand = kinds.includes('land_transcript');
  const hasBuildingTitle = kinds.includes('building_title');
  const hasLandTitle = kinds.includes('land_title');
  const hasParking = kinds.includes('parking_building_transcript') || kinds.includes('parking_land_transcript');

  if (!hasBuilding && !hasBuildingTitle && (hasLand || hasLandTitle) && !hasParking) return 'pure_land_sale';
  if (hasParking && !hasBuilding && !hasLand) return 'parking_only_sale';
  if ((hasBuilding || hasBuildingTitle) && (hasLand || hasLandTitle)) return 'unit_building_with_land_share_sale';
  if (hasParking || hasBuilding || hasLand || hasBuildingTitle || hasLandTitle) return 'mixed_or_unclear';
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
    hasBuildingTranscript: documentKinds.includes('building_transcript') || documentKinds.includes('building_title'),
    hasLandTranscript: documentKinds.includes('land_transcript') || documentKinds.includes('land_title'),
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

function buildDetailBuilderSeed(
  parsedResult: TranscriptIntakeParsedResult,
  detection: TranscriptDetectionResult,
  review: TranscriptReviewResult,
  warnings: string[] = [],
): TranscriptDetailBuilderResult {
  const areaDetailDraft = buildAreaDetailDraftFromIntake({
    parsedResult,
    dispositionKind: review.dispositionKind || detection.dispositionKind,
    parkingTitleRights: review.parkingTitleRights.length ? review.parkingTitleRights : detection.parkingTitleRights,
  });
  return {
    areaDetailDraft,
    summary: [
      `建物明細 ${areaDetailDraft.buildingAreas.length} 列`,
      `土地持分 ${areaDetailDraft.landShareAreas.length} 列`,
      `車位建物 ${areaDetailDraft.parkingBuildingAreas.length} 列`,
      `車位土地 ${areaDetailDraft.parkingLandShareAreas.length} 列`,
    ],
    warnings,
    userConfirmationRequired: warnings.length ? ['Detail Builder 失敗，已改用 parser seed 草稿，請人工確認明細。'] : [],
    confidence: warnings.length ? 0.2 : 0.45,
  };
}

async function loadDocumentSnapshots(
  admin: AdminClient,
  documentIds: string[],
): Promise<DocumentSnapshotRow[]> {
  const { data, error } = await admin
    .from('property_documents')
    .select('id, document_type, document_name, file_path, mime_type, parsed_result, consensus_metadata')
    .in('id', documentIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentSnapshotRow[];
}

function readRouteForDocument(routeDecision: Record<string, unknown>, documentId: string): TranscriptTechnicalRoute | null {
  const documents = Array.isArray(routeDecision.documents) ? routeDecision.documents : [];
  const match = documents.find((item): item is Record<string, unknown> => (
    typeof item === 'object' &&
    item !== null &&
    !Array.isArray(item) &&
    item.documentId === documentId
  ));
  const route = match?.route;
  return route === 'local_python_text' ||
    route === 'vlm_visual' ||
    route === 'structured_json' ||
    route === 'unsupported'
    ? route
    : null;
}

function updateStageTraceModel(
  traces: TranscriptIntakeAiStageTrace[],
  stage: TranscriptIntakeAiStageTrace['stage'],
  event: Record<string, unknown>,
): boolean {
  const type = typeof event.type === 'string' ? event.type : '';
  if (!['model_start', 'model_result', 'model_cancelled', 'model_skipped'].includes(type)) return false;

  const provider = typeof event.provider === 'string' ? event.provider : null;
  const model = typeof event.model === 'string' ? event.model : null;
  if (!provider || !model) return false;

  const trace = traces.find((item) => item.stage === stage);
  if (!trace) return false;
  let modelIndex = trace.models.findIndex((item) => item.provider === provider && item.model === model);
  if (modelIndex < 0) {
    trace.models.push({
      provider,
      model,
      role: stage === 'verify_review' ? 'review' : stage === 'detail_builder' ? 'detail_builder' : 'parse',
      status: 'pending',
    });
    modelIndex = trace.models.length - 1;
  }

  const current = trace.models[modelIndex];
  if (type === 'model_start') {
    trace.models[modelIndex] = {
      ...current,
      status: 'running',
      startedAt: new Date().toISOString(),
      durationMs: null,
      errorMessage: null,
    };
    return true;
  }
  if (type === 'model_result') {
    const success = event.success === true;
    trace.models[modelIndex] = {
      ...current,
      status: success ? 'success' : 'error',
      durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : current.durationMs,
      confidence: typeof event.confidence === 'number' ? event.confidence : current.confidence,
      errorMessage: typeof event.error === 'string' ? event.error : current.errorMessage,
    };
    return true;
  }
  if (type === 'model_cancelled') {
    trace.models[modelIndex] = { ...current, status: 'cancelled' };
    return true;
  }
  if (type === 'model_skipped') {
    trace.models[modelIndex] = { ...current, status: 'skipped' };
    return true;
  }
  return false;
}

function updateParseStageProgress(
  traces: TranscriptIntakeAiStageTrace[],
  event: Record<string, unknown>,
): boolean {
  const type = typeof event.type === 'string' ? event.type : '';
  const trace = traces.find((item) => item.stage === 'parse');
  if (!trace) return false;

  if (type === 'parse_start') {
    const target = typeof event.targetSuccessCount === 'number' ? event.targetSuccessCount : null;
    const total = typeof event.total === 'number' ? event.total : null;
    trace.status = 'running';
    trace.summary = [
      target && total
        ? `Parser 正在解析上傳文件，目標取得 ${target}/${total} 份有效報告`
        : 'Parser 正在解析上傳文件',
    ];
    return true;
  }

  if (type === 'consensus' || type === 'judge_start' || type === 'saving') {
    const message = typeof event.message === 'string' ? event.message : null;
    trace.status = 'running';
    trace.summary = [message ?? 'Parse 後處理中'];
    return true;
  }

  if (type === 'judge_done') {
    trace.status = 'running';
    trace.summary = [event.success === true ? '裁判審查完成，準備儲存解析結果' : '裁判審查未採用，使用多模型共識結果'];
    return true;
  }

  if (type === 'complete') {
    trace.summary = ['解析完成，準備進入驗證審查'];
    return true;
  }

  return false;
}

function persistTraceProgress(params: {
  admin: AdminClient;
  runId: string;
  parsedResult: TranscriptIntakeParsedResult;
}): void {
  void params.admin
    .from('transcript_intake_runs')
    .update({
      parsed_result: params.parsedResult,
    })
    .eq('id', params.runId);
}

function mergeModelProgress(
  baseModels: TranscriptIntakeAiStageTrace['models'],
  progressedModels: TranscriptIntakeAiStageTrace['models'],
): TranscriptIntakeAiStageTrace['models'] {
  const merged = baseModels.map((model) => {
    const progressed = progressedModels.find((item) => item.provider === model.provider && item.model === model.model);
    return progressed ? { ...model, ...progressed } : model;
  });
  const baseKeys = new Set(baseModels.map((model) => `${model.provider}:${model.model}`));
  return [
    ...merged,
    ...progressedModels.filter((model) => !baseKeys.has(`${model.provider}:${model.model}`)),
  ];
}

async function readLocalTextLayer(admin: AdminClient, doc: DocumentSnapshotRow): Promise<string | null> {
  if (!doc.file_path) return null;
  const { data: blob, error } = await admin.storage
    .from('property-documents')
    .download(doc.file_path);
  if (error || !blob) return null;

  const filePath = doc.file_path.toLowerCase();
  const mimeType = (doc.mime_type ?? '').toLowerCase();
  if (mimeType.includes('pdf') || filePath.endsWith('.pdf')) {
    const probe = await extractTranscriptPdfTextForRouting(Buffer.from(await blob.arrayBuffer()));
    return probe.text;
  }
  if (mimeType.startsWith('text/') || mimeType.includes('json')) {
    return Buffer.from(await blob.arrayBuffer()).toString('utf8');
  }
  return null;
}

async function parseWithLocalTextLayer(
  admin: AdminClient,
  doc: DocumentSnapshotRow,
): Promise<boolean> {
  const startedAt = Date.now();
  const text = await readLocalTextLayer(admin, doc);
  if (!text) return false;
  const parsed = parseTranscriptTextLayer(text);
  if (!parsed) return false;

  const durationMs = Date.now() - startedAt;
  const metadata = {
    strategy: 'single',
    field_confidences: {},
    conflicts: [],
    total_confidence: 0.65,
    models_used: [{
      provider: 'local',
      model: 'local-python-text',
      duration_ms: durationMs,
    }],
    total_duration_ms: durationMs,
  };

  const { error } = await admin
    .from('property_documents')
    .update({
      parsed_result: parsed as unknown as Record<string, unknown>,
      consensus_metadata: metadata,
      parse_strategy: 'single',
      parsed_at: new Date().toISOString(),
      ocr_status: 'completed',
      vlm_provider: 'local_python_text',
      vlm_model_version: 'local-text-layer-parser',
      parsing_duration_ms: durationMs,
      confidence_score: metadata.total_confidence,
    })
    .eq('id', doc.id);

  if (error) {
    throw new Error(`local text parser failed to save result: ${error.message}`);
  }

  return true;
}

function inferClassifiedDocumentType(doc: DocumentSnapshotRow): string | null {
  if (doc.document_type !== 'registry_transcript_unclassified') return null;
  if (!doc.parsed_result) return null;
  const building = doc.parsed_result.buildingTranscript;
  const land = doc.parsed_result.landTranscript;
  const hasBuildingContent = Boolean(building.description.buildingNumber || building.description.totalArea || building.description.floorArea || building.description.mainBuildings?.length || building.ownership.length);
  const hasLandContent = Boolean(land.description.landNumber || land.description.area || land.ownership.length);
  if (hasBuildingContent && hasLandContent) return null;
  if (doc.parsed_result.kind === 'land') return 'land_registry_transcript';
  if (doc.parsed_result.kind === 'building') return 'building_registry_transcript';
  return null;
}

async function classifyParsedUnclassifiedDocuments(
  admin: AdminClient,
  documents: DocumentSnapshotRow[],
): Promise<DocumentSnapshotRow[]> {
  const updated: DocumentSnapshotRow[] = [];

  for (const doc of documents) {
    const documentType = inferClassifiedDocumentType(doc);
    if (!documentType) {
      updated.push(doc);
      continue;
    }

    await admin
      .from('property_documents')
      .update({ document_type: documentType })
      .eq('id', doc.id)
      .eq('document_type', 'registry_transcript_unclassified');
    updated.push({ ...doc, document_type: documentType });
  }

  return updated;
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
    const aiStageTrace: TranscriptIntakeAiStageTrace[] = [];
    const detectStageInfo = await safeResolveStageInfo(admin, run.requested_by_user_id, 'detect');
    const detectStartedAt = Date.now();
    let detection = buildDetectionSeed(initialDocuments);
    let detectStatus: TranscriptIntakeAiStageTrace['status'] = 'success';
    let detectErrorMessage: string | null = null;
    try {
      detection = await runTranscriptIntakeDetectionAi({
        adminClient: admin,
        runId,
        userId: run.requested_by_user_id,
        documentIds: run.source_document_ids,
        routeDecision: run.route_decision,
      });
    } catch (error) {
      detectStatus = 'fallback';
      detectErrorMessage = error instanceof Error ? error.message : 'unknown error';
      detection = {
        ...detection,
        riskFlags: [
          ...detection.riskFlags,
          `AI detect failed; using seeded detection: ${detectErrorMessage}`,
        ],
      };
    }
    aiStageTrace.push({
      stage: 'detect',
      label: 'Detect 初判',
      status: detectStatus,
      engine: detectStatus === 'success' ? 'vlm_ai' : 'processor_seed',
      durationMs: Date.now() - detectStartedAt,
      agentKey: detectStageInfo?.agentKey ?? 'transcript_detection',
      moduleKey: detectStageInfo?.moduleKey ?? null,
      promptSource: detectStageInfo?.promptSource ?? null,
      models: stageModelFromInfo(detectStageInfo, 'detect'),
      confidence: null,
      summary: [
        `物件型態：${detection.dispositionKind}`,
        `文件類型：${detection.documentKinds.join('、')}`,
        `車位產權：${detection.parkingTitleRights.length ? detection.parkingTitleRights.join('、') : '無'}`,
      ],
      corrections: [],
      warnings: detection.riskFlags,
      errorMessage: detectErrorMessage,
    });
    const pendingParseTrace = buildPendingParseStageTrace(await safeResolveParseStageModels(admin, run.requested_by_user_id, run.route_decision), run.route_decision);
    replaceStageTrace(aiStageTrace, pendingParseTrace);

    await admin
      .from('transcript_intake_runs')
      .update({
        detection_result: detection as unknown as Record<string, unknown>,
        parsed_result: {
          strategy: 'existing_transcript_parse_core',
          routeDecision: run.route_decision,
          aiStageTrace,
          parseOutcomes: [],
          documents: [],
        } satisfies TranscriptIntakeParsedResult,
        status: 'parsing',
        current_phase: 'parsing',
      })
      .eq('id', runId);

    const neverAborted = new AbortController();
    const parseOutcomes: Array<{ documentId: string; kind: string; message?: string }> = [];
    const parseStartedAt = Date.now();

    for (const documentId of run.source_document_ids) {
      await admin
        .from('transcript_intake_runs')
        .update({ current_phase: `parsing:${documentId}` })
        .eq('id', runId);

      const localRoute = readRouteForDocument(run.route_decision, documentId) === 'local_python_text';
      const documentSnapshot = initialDocuments.find((doc) => doc.id === documentId);
      const localCompleted = localRoute && documentSnapshot
        ? await parseWithLocalTextLayer(admin, documentSnapshot)
        : false;
      const outcome = localCompleted
        ? { kind: 'complete' as const }
        : await runTranscriptParseCore(
          admin,
          { documentId, userId: run.requested_by_user_id },
          {
            stopSignal: neverAborted.signal,
            onEvent: (event) => {
              const changed = updateStageTraceModel(aiStageTrace, 'parse', event) ||
                updateParseStageProgress(aiStageTrace, event);
              if (!changed) return;
              persistTraceProgress({
                admin,
                runId,
                parsedResult: {
                  strategy: 'existing_transcript_parse_core',
                  routeDecision: run.route_decision,
                  aiStageTrace,
                  parseOutcomes,
                  documents: [],
                },
              });
            },
          },
        );
      parseOutcomes.push({
        documentId,
        kind: localCompleted ? 'local_python_text' : outcome.kind,
        message: outcome.kind === 'error' ? outcome.message : undefined,
      });
      if (outcome.kind !== 'complete') {
        const message = outcome.kind === 'error' ? outcome.message : '解析已中止';
        replaceStageTrace(aiStageTrace, await buildFailedParseStageTrace({
          admin,
          runId,
          documentIds: run.source_document_ids,
          fallbackModels: pendingParseTrace.models,
          errorMessage: message,
          startedAtMs: parseStartedAt,
          durationMs: Date.now() - parseStartedAt,
        }));
        await admin
          .from('transcript_intake_runs')
          .update({
            parsed_result: {
              strategy: 'existing_transcript_parse_core',
              routeDecision: run.route_decision,
              aiStageTrace,
              parseOutcomes,
              documents: [],
            } satisfies TranscriptIntakeParsedResult,
          })
          .eq('id', runId);
        await failRun(admin, runId, message);
        return;
      }
    }

    const parsedDocuments = await classifyParsedUnclassifiedDocuments(
      admin,
      await loadDocumentSnapshots(admin, run.source_document_ids),
    );
    const parserReports = await loadTranscriptParserReports({
      admin,
      runId,
      sourceDocumentIds: run.source_document_ids,
    });
    const parsedResult: TranscriptIntakeParsedResult = {
      strategy: 'existing_transcript_parse_core',
      routeDecision: run.route_decision,
      parserReports,
      parseOutcomes,
      documents: parsedDocuments.map((doc) => ({
        documentId: doc.id,
        documentType: doc.document_type,
        documentName: doc.document_name,
        parsedResult: doc.parsed_result,
        consensusMetadata: doc.consensus_metadata,
      })),
    };
    replaceStageTrace(aiStageTrace, attachStageReportUrls(runId, buildParseStageTrace(parsedDocuments, parseOutcomes, Date.now() - parseStartedAt, pendingParseTrace.models)));
    parsedResult.aiStageTrace = aiStageTrace;
    const reviewStageInfo = await safeResolveStageInfo(admin, run.requested_by_user_id, 'review');
    replaceStageTrace(aiStageTrace, buildPendingReviewStageTrace(reviewStageInfo));

    await admin
      .from('transcript_intake_runs')
      .update({
        status: 'reviewing',
        current_phase: 'reviewing',
        parsed_result: parsedResult,
      })
      .eq('id', runId);

    const reviewStartedAt = Date.now();
    let review = buildReviewSeed(detection, parsedDocuments);
    let reviewStatus: TranscriptIntakeAiStageTrace['status'] = 'success';
    let reviewErrorMessage: string | null = null;
    try {
      review = await runTranscriptIntakeReviewAi({
        adminClient: admin,
        runId,
        userId: run.requested_by_user_id,
        documentIds: run.source_document_ids,
        routeDecision: run.route_decision,
        parsedResult,
        onModelEvent: (event) => {
          if (!updateStageTraceModel(aiStageTrace, 'verify_review', event)) return;
          parsedResult.aiStageTrace = aiStageTrace;
          persistTraceProgress({
            admin,
            runId,
            parsedResult,
          });
        },
      });
    } catch (error) {
      reviewStatus = 'fallback';
      reviewErrorMessage = error instanceof Error ? error.message : 'unknown error';
      review = {
        ...review,
        issues: [
          ...review.issues,
          {
            severity: 'warning',
            fieldPath: 'review.ai',
            message: `AI review failed; using seeded review: ${reviewErrorMessage}`,
          },
        ],
      };
    }
    const corrections = buildReviewCorrections(review);
    const progressedReviewModels = aiStageTrace.find((trace) => trace.stage === 'verify_review')?.models ?? [];
    replaceStageTrace(aiStageTrace, attachStageReportUrls(runId, {
      stage: 'verify_review',
      label: 'Verify / Review 驗證審查',
      status: reviewStatus,
      engine: reviewStatus === 'success' ? 'vlm_ai' : 'processor_seed',
      durationMs: Date.now() - reviewStartedAt,
      agentKey: reviewStageInfo?.agentKey ?? 'transcript_audit',
      moduleKey: reviewStageInfo?.moduleKey ?? null,
      promptSource: reviewStageInfo?.promptSource ?? null,
      models: mergeModelProgress(reviewStageModelsFromResult(review, reviewStageInfo), progressedReviewModels),
      confidence: review.confidence,
      summary: [
        review.approved ? '審核結果：通過' : '審核結果：需人工確認',
        `判定型態：${review.dispositionKind}`,
        `問題數：${review.issues.length}`,
      ],
      corrections,
      warnings: [
        ...review.issues.map((issue) => `${issue.severity}: ${issue.message}`),
        ...review.userConfirmationRequired,
      ],
      errorMessage: reviewErrorMessage,
    }));
    parsedResult.aiStageTrace = aiStageTrace;

    const detailStageInfo = await safeResolveStageInfo(admin, run.requested_by_user_id, 'detail_builder');
    replaceStageTrace(aiStageTrace, buildPendingDetailBuilderStageTrace(detailStageInfo));
    parsedResult.aiStageTrace = aiStageTrace;

    await admin
      .from('transcript_intake_runs')
      .update({
        status: 'reviewing',
        current_phase: 'detail_builder',
        parsed_result: parsedResult,
        review_result: review as unknown as Record<string, unknown>,
      })
      .eq('id', runId);

    const detailBuilderStartedAt = Date.now();
    let detailBuilder = buildDetailBuilderSeed(parsedResult, detection, review);
    let detailStatus: TranscriptIntakeAiStageTrace['status'] = 'success';
    let detailErrorMessage: string | null = null;
    try {
      detailBuilder = await runTranscriptIntakeDetailBuilderAi({
        adminClient: admin,
        runId,
        userId: run.requested_by_user_id,
        documentIds: run.source_document_ids,
        routeDecision: run.route_decision,
        parsedResult,
        reviewResult: review,
      });
    } catch (error) {
      detailStatus = 'fallback';
      detailErrorMessage = error instanceof Error ? error.message : 'unknown error';
      detailBuilder = buildDetailBuilderSeed(parsedResult, detection, review, [
        `AI detail_builder failed; using parser seed draft: ${detailErrorMessage}`,
      ]);
    }

    replaceStageTrace(aiStageTrace, attachStageReportUrls(runId, {
      stage: 'detail_builder',
      label: 'Detail Builder 明細草稿',
      status: detailStatus,
      engine: detailStatus === 'success' ? 'vlm_ai' : 'processor_seed',
      durationMs: Date.now() - detailBuilderStartedAt,
      agentKey: detailStageInfo?.agentKey ?? 'transcript_detail_builder',
      moduleKey: detailStageInfo?.moduleKey ?? null,
      promptSource: detailStageInfo?.promptSource ?? null,
      models: stageModelFromInfo(detailStageInfo, 'detail_builder'),
      confidence: detailBuilder.confidence,
      summary: detailBuilder.summary.length ? detailBuilder.summary : [
        `建物明細 ${detailBuilder.areaDetailDraft.buildingAreas.length} 列`,
        `土地持分 ${detailBuilder.areaDetailDraft.landShareAreas.length} 列`,
      ],
      corrections: buildDetailBuilderCorrections(detailBuilder),
      warnings: [
        ...detailBuilder.warnings,
        ...detailBuilder.userConfirmationRequired,
      ],
      errorMessage: detailErrorMessage,
    }));
    parsedResult.aiStageTrace = aiStageTrace;
    parsedResult.areaDetailDraft = detailBuilder.areaDetailDraft;
    parsedResult.detailBuilderResult = detailBuilder;

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
