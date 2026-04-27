import type { AIProvider } from '@/lib/ai-providers';
import { startPromptAudit } from '@/lib/ai/audit';
import { resolveAgentModel, type AgentAssignmentReader } from '@/lib/ai/resolve-agent-model';
import { PromptNotFoundError, resolveSystemPrompt } from '@/lib/ai/prompt-safety';
import { decryptApiKey } from '@/lib/crypto';
import type {
  TranscriptDetectionResult,
  TranscriptDispositionKind,
  TranscriptDocumentKind,
  TranscriptReviewResult,
} from '@/lib/transcript-parse/intake-types';
import {
  TRANSCRIPT_INTAKE_DETECT_MODULE_KEY,
  TRANSCRIPT_INTAKE_DETECT_PROMPT,
  TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
  TRANSCRIPT_INTAKE_REVIEW_PROMPT,
} from '@/lib/transcript-parse/intake-prompts';
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
}

interface AgentLink {
  provider: string;
  model: string;
}

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
  const resolved = await resolveAgentModel(agentKey, {
    supabase: adminClient as unknown as AgentAssignmentReader,
  });
  const first = resolved.chain[0];
  if (!first) return null;
  return { provider: first.provider, model: first.model_id };
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
  return {
    approved: obj.approved === true,
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
    issues: Array.isArray(obj.issues) ? obj.issues as TranscriptReviewResult['issues'] : [],
    parkingTitleRights: parkingRaw.filter(
      (item): item is 'independent' | 'shared_facility' =>
        item === 'independent' || item === 'shared_facility',
    ),
    dispositionKind: normalizeDispositionKind(obj.dispositionKind),
    userConfirmationRequired: Array.isArray(obj.userConfirmationRequired)
      ? obj.userConfirmationRequired.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

async function runIntakeAiJson(
  input: RunAiStageInput & {
    agentKey: 'transcript_detection' | 'transcript_audit';
    moduleKey: string;
    fallbackPrompt: string;
    parsedResult?: unknown;
  },
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

  const apiKey = await getApiKey(input.adminClient, input.userId, link.provider);
  if (!apiKey) throw new Error(`找不到 ${link.provider} API Key`);

  const provider = link.provider as AIProvider;
  const caller = CALLERS[provider];
  if (!caller) throw new Error(`不支援的 AI provider：${link.provider}`);

  const { fileBase64, mimeType } = await downloadPrimaryDocument(input.adminClient, documents);
  const context = buildDocumentContext(
    input.runId,
    documents,
    input.routeDecision,
    input.parsedResult,
  );
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
  const result = await caller(apiKey, link.model, fileBase64, mimeType, systemPrompt, input.signal);
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
    return parsed;
  } catch (error) {
    await audit.complete('schema_mismatch', {
      errorMessage: error instanceof Error ? error.message : 'AI 回傳非合法 JSON',
      latencyMs,
    });
    throw error;
  }
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
  const raw = await runIntakeAiJson({
    ...input,
    agentKey: 'transcript_audit',
    moduleKey: TRANSCRIPT_INTAKE_REVIEW_MODULE_KEY,
    fallbackPrompt: TRANSCRIPT_INTAKE_REVIEW_PROMPT,
    parsedResult: input.parsedResult,
  });
  return normalizeReviewResult(raw);
}
