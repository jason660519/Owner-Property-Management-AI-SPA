import type { AIProvider } from '@/lib/ai-providers';
import { startPromptAudit } from '@/lib/ai/audit';
import { resolveAgentModel, type AgentAssignmentReader } from '@/lib/ai/resolve-agent-model';
import { PromptNotFoundError, resolveSystemPrompt } from '@/lib/ai/prompt-safety';
import { decryptApiKey } from '@/lib/crypto';
import type {
  TranscriptIntakeAiStageModel,
  TranscriptDetectionResult,
  TranscriptDispositionKind,
  TranscriptDocumentKind,
  TranscriptDetailBuilderResult,
  TranscriptReviewFieldDecision,
  TranscriptReviewResult,
} from '@/lib/transcript-parse/intake-types';
import type { AgentModelConfig } from '@/lib/types/agent-assignment';
import { normalizeAreaDetailDraft } from '@/lib/transcript-parse/intake-area-details';
import {
  mergeTranscriptReviewAttempts,
  normalizeReviewConfidence,
} from '@/lib/transcript-parse/intake-review-merge';
import {
  TRANSCRIPT_INTAKE_DETAIL_BUILDER_MODULE_KEY,
  TRANSCRIPT_INTAKE_DETAIL_BUILDER_PROMPT,
  TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
  TRANSCRIPT_INTAKE_DETECT_PROMPT,
  TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
  TRANSCRIPT_INTAKE_REVIEW_PROMPT,
} from '@/lib/transcript-parse/intake-prompts';
import {
  limitTranscriptEnsembleModels,
  TRANSCRIPT_REVIEW_CANDIDATE_SIZE,
  TRANSCRIPT_REVIEW_ENSEMBLE_SIZE,
} from '@/lib/transcript-parse/transcript-ensemble-models';
import { runConcurrentUntilTargetSuccess } from '@/lib/utils/concurrent-success-runner';
import { CALLERS, extractJsonFromOutput, mimeFromPath } from '@/lib/utils/ai-api-callers';
import { createAdminClient } from '@/utils/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface IntakeDocumentForAi {
  id: string;
  file_path: string;
  document_type: string;
  document_name: string | null;
  mime_type?: string | null;
}

interface RunAiStageInput {
  adminClient: AdminClient;
  runId: string;
  userId: string;
  documentIds: string[];
  routeDecision: Record<string, unknown>;
  parsedResult?: unknown;
  signal?: AbortSignal;
  onModelEvent?: (event: {
    type: 'model_start' | 'model_result' | 'model_cancelled' | 'model_skipped';
    provider: string;
    model: string;
    success?: boolean;
    duration_ms?: number;
    confidence?: number;
    error?: string;
  }) => void;
}

export interface AgentLink {
  provider: string;
  model: string;
  config?: AgentModelConfig;
}

export interface TranscriptIntakeAiStageInfo {
  agentKey: 'transcript_detection' | 'transcript_audit' | 'transcript_detail_builder';
  moduleKey: string;
  provider: string | null;
  model: string | null;
  models?: AgentLink[];
  promptSource: string | null;
}

const STAGE_CONFIG = {
  detect: {
    agentKey: 'transcript_detection',
    moduleKey: TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_DETECT_PROMPT,
  },
  review: {
    agentKey: 'transcript_audit',
    moduleKey: TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_REVIEW_PROMPT,
  },
  detail_builder: {
    agentKey: 'transcript_detail_builder',
    moduleKey: TRANSCRIPT_INTAKE_DETAIL_BUILDER_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_DETAIL_BUILDER_PROMPT,
  },
} as const;

async function getApiKey(
  adminClient: AdminClient,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data: keyRow } = await adminClient
    .from('ai_api_keys')
    .select('api_key_encrypted, iv')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (!keyRow?.api_key_encrypted || !keyRow?.iv) return null;
  try {
    return await decryptApiKey(keyRow.api_key_encrypted as string, keyRow.iv as string);
  } catch {
    return null;
  }
}

async function resolveFirstAgentLink(
  adminClient: AdminClient,
  agentKey: string,
): Promise<AgentLink | null> {
  const links = await resolveAgentLinks(adminClient, agentKey, 1);
  return links[0] ?? null;
}

async function resolveAgentLinks(
  adminClient: AdminClient,
  agentKey: string,
  limit: number,
): Promise<AgentLink[]> {
  const resolved = await resolveAgentModel(agentKey, {
    supabase: adminClient as unknown as AgentAssignmentReader,
  });
  return limitTranscriptEnsembleModels(
    resolved.chain.map((link) => ({
      provider: link.provider,
      model: link.model_id,
      config: link.config,
    })),
    limit,
  );
}

async function resolvePromptOrFallback(
  adminClient: AdminClient,
  userId: string,
  moduleKey: string,
  fallback: string,
): Promise<{
  content: string;
  source: string;
  savedPromptId: string | null;
  aiSystemPromptId: string | null;
}> {
  try {
    const resolved = await resolveSystemPrompt({
      moduleKey,
      userId,
      client: adminClient,
    });
    return {
      content: resolved.content,
      source: resolved.source,
      savedPromptId: resolved.savedPromptId ?? null,
      aiSystemPromptId: resolved.aiSystemPromptId ?? null,
    };
  } catch (error) {
    if (!(error instanceof PromptNotFoundError)) throw error;
    return {
      content: fallback,
      source: 'hardcode_fallback',
      savedPromptId: null,
      aiSystemPromptId: null,
    };
  }
}

export async function resolveTranscriptIntakeAiStageInfo(
  adminClient: AdminClient,
  userId: string,
  stage: keyof typeof STAGE_CONFIG,
): Promise<TranscriptIntakeAiStageInfo> {
  const config = STAGE_CONFIG[stage];
  const prompt = await resolvePromptOrFallback(
    adminClient,
    userId,
    config.moduleKey,
    config.fallbackPrompt,
  );
  const limit = stage === 'review' ? TRANSCRIPT_REVIEW_CANDIDATE_SIZE : 1;
  const links = await resolveAgentLinks(adminClient, config.agentKey, limit);
  const link = links[0] ?? null;
  return {
    agentKey: config.agentKey,
    moduleKey: config.moduleKey,
    provider: link?.provider ?? null,
    model: link?.model ?? null,
    models: links,
    promptSource: prompt.source,
  };
}

async function loadDocuments(
  adminClient: AdminClient,
  documentIds: string[],
): Promise<IntakeDocumentForAi[]> {
  const { data, error } = await adminClient
    .from('property_documents')
    .select('id, file_path, document_type, document_name, mime_type')
    .in('id', documentIds)
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  return (data ?? []) as IntakeDocumentForAi[];
}

async function downloadPrimaryDocument(
  adminClient: AdminClient,
  documents: IntakeDocumentForAi[],
): Promise<{ document: IntakeDocumentForAi; fileBase64: string; mimeType: string }> {
  const document = documents[0];
  if (!document) throw new Error('沒有可供 AI 判讀的謄本文件');

  const { data: blob, error } = await adminClient.storage
    .from('property-documents')
    .download(document.file_path);

  if (error || !blob) {
    throw new Error(`下載謄本文件失敗：${error?.message ?? '未知錯誤'}`);
  }

  return {
    document,
    fileBase64: Buffer.from(await blob.arrayBuffer()).toString('base64'),
    mimeType: document.mime_type || mimeFromPath(document.file_path),
  };
}

function buildDocumentContext(
  runId: string,
  documents: IntakeDocumentForAi[],
  routeDecision: Record<string, unknown>,
  parsedResult?: unknown,
): string {
  return JSON.stringify(
    {
      runId,
      documents: documents.map((doc) => ({
        id: doc.id,
        documentType: doc.document_type,
        documentName: doc.document_name,
        filePath: doc.file_path,
      })),
      routeDecision,
      parsedResult,
    },
    null,
    2,
  );
}

function normalizeDocumentKinds(value: unknown): TranscriptDocumentKind[] {
  const allowed = new Set<TranscriptDocumentKind>([
    'building_transcript',
    'land_transcript',
    'building_title',
    'land_title',
    'parking_building_transcript',
    'parking_land_transcript',
    'mixed_transcript',
    'unknown',
  ]);
  if (!Array.isArray(value)) return ['unknown'];
  const kinds = value.filter((item): item is TranscriptDocumentKind =>
    typeof item === 'string' && allowed.has(item as TranscriptDocumentKind),
  );
  return kinds.length > 0 ? [...new Set(kinds)] : ['unknown'];
}

function normalizeDispositionKind(value: unknown): TranscriptDispositionKind {
  const allowed = new Set<TranscriptDispositionKind>([
    'pure_land_sale',
    'whole_building_sale',
    'townhouse_or_villa_sale',
    'unit_building_with_land_share_sale',
    'parking_only_sale',
    'mixed_or_unclear',
    'unknown',
  ]);
  return typeof value === 'string' && allowed.has(value as TranscriptDispositionKind)
    ? value as TranscriptDispositionKind
    : 'unknown';
}

function normalizeDetectionResult(raw: unknown): TranscriptDetectionResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const parkingRaw = Array.isArray(obj.parkingTitleRights) ? obj.parkingTitleRights : [];
  const parkingTitleRights = parkingRaw.filter(
    (item): item is 'independent' | 'shared_facility' =>
      item === 'independent' || item === 'shared_facility',
  );

  return {
    dispositionKind: normalizeDispositionKind(obj.dispositionKind),
    documentKinds: normalizeDocumentKinds(obj.documentKinds),
    parkingTitleRights: [...new Set(parkingTitleRights)],
    hasBuildingTranscript: obj.hasBuildingTranscript === true,
    hasLandTranscript: obj.hasLandTranscript === true,
    hasParkingEvidence: obj.hasParkingEvidence === true,
    buildingOwnershipLikelyFull:
      typeof obj.buildingOwnershipLikelyFull === 'boolean' ? obj.buildingOwnershipLikelyFull : null,
    landOwnershipLikelyFull:
      typeof obj.landOwnershipLikelyFull === 'boolean' ? obj.landOwnershipLikelyFull : null,
    buildingNumberCount: typeof obj.buildingNumberCount === 'number' ? obj.buildingNumberCount : null,
    landParcelCount: typeof obj.landParcelCount === 'number' ? obj.landParcelCount : null,
    riskFlags: Array.isArray(obj.riskFlags)
      ? obj.riskFlags.filter((item): item is string => typeof item === 'string')
      : [],
    evidence: Array.isArray(obj.evidence) ? obj.evidence as TranscriptDetectionResult['evidence'] : [],
  };
}

function normalizeReviewResult(raw: unknown): TranscriptReviewResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const parkingRaw = Array.isArray(obj.parkingTitleRights) ? obj.parkingTitleRights : [];
  const fieldDecisionRaw = Array.isArray(obj.fieldDecisions) ? obj.fieldDecisions : [];
  const fieldDecisions = fieldDecisionRaw.flatMap((item): TranscriptReviewFieldDecision[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const decision = item as Record<string, unknown>;
    const allowed = new Set<TranscriptReviewFieldDecision['decision']>([
      'majority_accept',
      'reviewer_double_checked',
      'needs_user_confirmation',
      'insufficient_evidence',
    ]);
    const rawDecision = decision.decision;
    const decisionType = typeof rawDecision === 'string' && allowed.has(rawDecision as TranscriptReviewFieldDecision['decision'])
      ? rawDecision as TranscriptReviewFieldDecision['decision']
      : 'needs_user_confirmation';
    const parserVotesRaw = Array.isArray(decision.parserVotes) ? decision.parserVotes : [];
    return [{
      fieldPath: typeof decision.fieldPath === 'string' ? decision.fieldPath : '',
      decision: decisionType,
      selectedValue: decision.selectedValue,
      parserVotes: parserVotesRaw.flatMap((vote): NonNullable<TranscriptReviewFieldDecision['parserVotes']> => {
        if (!vote || typeof vote !== 'object' || Array.isArray(vote)) return [];
        const voteObj = vote as Record<string, unknown>;
        return [{
          provider: typeof voteObj.provider === 'string' ? voteObj.provider : '',
          model: typeof voteObj.model === 'string' ? voteObj.model : '',
          value: voteObj.value,
        }];
      }),
      confidence: normalizeReviewConfidence(decision.confidence),
      rationale: typeof decision.rationale === 'string' ? decision.rationale : '',
      evidence: Array.isArray(decision.evidence) ? decision.evidence as TranscriptReviewFieldDecision['evidence'] : [],
    }];
  });
  return {
    approved: obj.approved === true,
    confidence: normalizeReviewConfidence(obj.confidence),
    issues: Array.isArray(obj.issues) ? obj.issues as TranscriptReviewResult['issues'] : [],
    parkingTitleRights: parkingRaw.filter(
      (item): item is 'independent' | 'shared_facility' =>
        item === 'independent' || item === 'shared_facility',
    ),
    dispositionKind: normalizeDispositionKind(obj.dispositionKind),
    userConfirmationRequired: Array.isArray(obj.userConfirmationRequired)
      ? obj.userConfirmationRequired.filter((item): item is string => typeof item === 'string')
      : [],
    fieldDecisions,
    doubleCheckSummary: normalizeStringArray(obj.doubleCheckSummary),
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function normalizeDetailBuilderResult(raw: unknown): TranscriptDetailBuilderResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const draft = normalizeAreaDetailDraft(obj.areaDetailDraft);
  if (!draft) throw new Error('detail_builder 回傳缺少合法 areaDetailDraft');
  return {
    areaDetailDraft: draft,
    summary: normalizeStringArray(obj.summary),
    warnings: normalizeStringArray(obj.warnings),
    userConfirmationRequired: normalizeStringArray(obj.userConfirmationRequired),
    confidence: normalizeReviewConfidence(obj.confidence),
  };
}

type IntakeStageCallInput = RunAiStageInput & {
  agentKey: 'transcript_detection' | 'transcript_audit' | 'transcript_detail_builder';
  moduleKey: string;
  fallbackPrompt: string;
  parsedResult?: unknown;
};

type ResolvedIntakePrompt = Awaited<ReturnType<typeof resolvePromptOrFallback>>;

async function callIntakeModelJson(
  input: IntakeStageCallInput,
  link: AgentLink,
  prompt: ResolvedIntakePrompt,
  fileBase64: string,
  mimeType: string,
  context: string,
): Promise<{ raw: unknown; latencyMs: number }> {
  const apiKey = await getApiKey(input.adminClient, input.userId, link.provider);
  if (!apiKey) throw new Error(`找不到 ${link.provider} API Key`);

  const provider = link.provider as AIProvider;
  const caller = CALLERS[provider];
  if (!caller) throw new Error(`不支援的 AI provider：${link.provider}`);

  const systemPrompt = `${prompt.content}\n\n以下是本次工作台上下文 JSON，請一併納入判斷：\n${context}`;
  const audit = startPromptAudit({
    moduleKey: input.moduleKey,
    agentKey: input.agentKey,
    provider: link.provider,
    modelId: link.model,
    userId: input.userId,
    savedPromptId: prompt.savedPromptId,
    aiSystemPromptId: prompt.aiSystemPromptId,
    promptSource: prompt.source,
    userInput: context,
    client: input.adminClient,
  });

  const startedAt = Date.now();
  const result = await caller(apiKey, link.model, fileBase64, mimeType, systemPrompt, input.signal, link.config);
  const latencyMs = Date.now() - startedAt;
  if (!result.ok) {
    await audit.complete('api_error', {
      errorMessage: result.error ?? 'AI call failed',
      latencyMs,
    });
    throw new Error(result.error ?? 'AI call failed');
  }

  try {
    const parsed = extractJsonFromOutput(result.text);
    await audit.complete('success', { latencyMs });
    return { raw: parsed, latencyMs };
  } catch (error) {
    await audit.complete('schema_mismatch', {
      errorMessage: error instanceof Error ? error.message : 'AI 回傳非合法 JSON',
      latencyMs,
    });
    throw error;
  }
}

async function runIntakeAiJson(
  input: IntakeStageCallInput,
): Promise<unknown> {
  const documents = await loadDocuments(input.adminClient, input.documentIds);
  const prompt = await resolvePromptOrFallback(
    input.adminClient,
    input.userId,
    input.moduleKey,
    input.fallbackPrompt,
  );
  const link = await resolveFirstAgentLink(input.adminClient, input.agentKey);
  if (!link) throw new Error(`未設定 ${input.agentKey} 使用的 AI 模型`);

  const { fileBase64, mimeType } = await downloadPrimaryDocument(input.adminClient, documents);
  const context = buildDocumentContext(
    input.runId,
    documents,
    input.routeDecision,
    input.parsedResult,
  );
  const result = await callIntakeModelJson(input, link, prompt, fileBase64, mimeType, context);
  return result.raw;
}

async function runReviewAiEnsemble(input: IntakeStageCallInput): Promise<TranscriptReviewResult> {
  const documents = await loadDocuments(input.adminClient, input.documentIds);
  const prompt = await resolvePromptOrFallback(
    input.adminClient,
    input.userId,
    input.moduleKey,
    input.fallbackPrompt,
  );
  const links = await resolveAgentLinks(
    input.adminClient,
    input.agentKey,
    TRANSCRIPT_REVIEW_CANDIDATE_SIZE,
  );
  if (links.length === 0) throw new Error(`未設定 ${input.agentKey} 使用的 AI 模型`);

  const { fileBase64, mimeType } = await downloadPrimaryDocument(input.adminClient, documents);
  const context = buildDocumentContext(input.runId, documents, input.routeDecision, input.parsedResult);
  const targetSuccessCount = Math.min(TRANSCRIPT_REVIEW_ENSEMBLE_SIZE, links.length);
  const settled = await runConcurrentUntilTargetSuccess<AgentLink, {
    attempt: { review: TranscriptReviewResult; model: TranscriptIntakeAiStageModel } | null;
    error: string | null;
    durationMs: number;
  }>({
    items: links,
    maxConcurrency: targetSuccessCount,
    targetSuccessCount,
    stopSignal: input.signal,
    onItemStart: (link) => {
      input.onModelEvent?.({
        type: 'model_start',
        provider: link.provider,
        model: link.model,
      });
    },
    runItem: async (link) => {
      const startedAt = Date.now();
      try {
        const result = await callIntakeModelJson(input, link, prompt, fileBase64, mimeType, context);
        const review = normalizeReviewResult(result.raw);
        const model: TranscriptIntakeAiStageModel = {
          provider: link.provider,
          model: link.model,
          role: 'review',
          status: 'success',
          durationMs: result.latencyMs,
          confidence: review.confidence,
        };
        return { attempt: { review, model }, error: null, durationMs: result.latencyMs };
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : 'unknown error';
        return {
          attempt: null,
          error: `${link.provider}/${link.model}: ${message}`,
          durationMs,
        };
      }
    },
    onItemResult: (link, _index, result) => {
      input.onModelEvent?.({
        type: 'model_result',
        provider: link.provider,
        model: link.model,
        success: result.attempt !== null,
        duration_ms: result.durationMs,
        confidence: result.attempt?.review.confidence,
        error: result.error ? result.error.replace(`${link.provider}/${link.model}: `, '') : undefined,
      });
    },
    isSuccessful: (result) => result.attempt !== null,
  });

  if (settled.successCount >= targetSuccessCount) {
    for (const index of settled.cancelledIndices) {
      const link = links[index];
      if (!link) continue;
      input.onModelEvent?.({
        type: 'model_cancelled',
        provider: link.provider,
        model: link.model,
      });
    }
    for (let index = settled.launchedCount; index < links.length; index += 1) {
      const link = links[index];
      if (!link) continue;
      input.onModelEvent?.({
        type: 'model_skipped',
        provider: link.provider,
        model: link.model,
      });
    }
  }

  const attempts = settled.results.flatMap((item) => item.attempt ? [item.attempt] : []);
  const errors = settled.results.flatMap((item) => item.error ? [item.error] : []);
  if (attempts.length === 0) {
    throw new Error(errors.join('；') || '所有 reviewer 皆失敗');
  }
  return mergeTranscriptReviewAttempts(attempts, errors);
}

export async function runTranscriptIntakeDetectionAi(
  input: RunAiStageInput,
): Promise<TranscriptDetectionResult> {
  const raw = await runIntakeAiJson({
    ...input,
    agentKey: 'transcript_detection',
    moduleKey: TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_DETECT_PROMPT,
  });
  return normalizeDetectionResult(raw);
}

export async function runTranscriptIntakeReviewAi(
  input: RunAiStageInput & { parsedResult: unknown },
): Promise<TranscriptReviewResult> {
  return runReviewAiEnsemble({
    ...input,
    agentKey: 'transcript_audit',
    moduleKey: TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_REVIEW_PROMPT,
    parsedResult: input.parsedResult,
  });
}

export async function runTranscriptIntakeDetailBuilderAi(
  input: RunAiStageInput & {
    parsedResult: unknown;
    reviewResult: unknown;
  },
): Promise<TranscriptDetailBuilderResult> {
  const raw = await runIntakeAiJson({
    ...input,
    agentKey: 'transcript_detail_builder',
    moduleKey: TRANSCRIPT_INTAKE_DETAIL_BUILDER_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_DETAIL_BUILDER_PROMPT,
    parsedResult: {
      parsedResult: input.parsedResult,
      reviewResult: input.reviewResult,
    },
  });
  return normalizeDetailBuilderResult(raw);
}
