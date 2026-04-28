import type {
  TranscriptAreaCalculation,
  TranscriptConsensusItem,
  TranscriptConsensusMatrix,
  TranscriptDocumentInventoryItem,
  TranscriptEvidenceRef,
  TranscriptPageObservation,
  TranscriptReportFieldConfidence,
  TranscriptStandardReport,
  TranscriptStandardReportMeta,
  TranscriptStandardReportStage,
} from '@/lib/transcript-parse/intake-types';

interface ConsensusSource {
  participant: string;
  structuredJson: unknown;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = nonEmptyString(item);
    return text ? [text] : [];
  });
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) return Number((value / 100).toFixed(4));
  return Math.max(0, Math.min(1, value));
}

function normalizeMeta(value: unknown): TranscriptStandardReportMeta | undefined {
  if (!isRecord(value)) return undefined;
  const stage = value.stage;
  if (stage !== 'parse' && stage !== 'review' && stage !== 'detail_builder') return undefined;
  return {
    stage,
    company: nonEmptyString(value.company) ?? '',
    provider: nonEmptyString(value.provider) ?? '',
    model: nonEmptyString(value.model) ?? '',
    generatedAt: nonEmptyString(value.generatedAt) ?? '',
    runId: nonEmptyString(value.runId) ?? undefined,
    roleLabel: nonEmptyString(value.roleLabel) ?? undefined,
  };
}

function normalizeDocumentInventory(value: unknown): TranscriptDocumentInventoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    return [{
      documentId: nonEmptyString(item.documentId) ?? undefined,
      documentName: typeof item.documentName === 'string' || item.documentName === null
        ? item.documentName
        : undefined,
      documentKind: nonEmptyString(item.documentKind) ?? undefined,
      pageCount: typeof item.pageCount === 'number' && Number.isFinite(item.pageCount)
        ? item.pageCount
        : null,
      structureSummary: normalizeStringArray(item.structureSummary),
    }];
  });
}

function normalizeEvidence(value: unknown): TranscriptEvidenceRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const text = nonEmptyString(item.text);
    if (!text) return [];
    return [{
      documentId: nonEmptyString(item.documentId) ?? undefined,
      page: typeof item.page === 'number' ? item.page : undefined,
      section: nonEmptyString(item.section) ?? undefined,
      text,
    }];
  });
}

function normalizePageObservations(value: unknown): TranscriptPageObservation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const page = typeof item.page === 'number' && Number.isFinite(item.page) ? item.page : null;
    if (page === null) return [];
    const sourceTrust = item.sourceTrust === 'authoritative' ||
      item.sourceTrust === 'reference_only' ||
      item.sourceTrust === 'ignore' ||
      item.sourceTrust === 'unknown'
      ? item.sourceTrust
      : undefined;
    return [{
      documentId: nonEmptyString(item.documentId) ?? undefined,
      documentName: typeof item.documentName === 'string' || item.documentName === null
        ? item.documentName
        : undefined,
      page,
      summary: nonEmptyString(item.summary) ?? '',
      visibleText: normalizeStringArray(item.visibleText),
      sourceTrust,
      evidence: normalizeEvidence(item.evidence),
    }];
  });
}

function normalizeConsensusItems(value: unknown): TranscriptConsensusItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const fieldPath = nonEmptyString(item.fieldPath);
    if (!fieldPath) return [];
    return [{
      fieldPath,
      value: item.value,
      participants: normalizeStringArray(item.participants),
      evidence: normalizeEvidence(item.evidence),
      note: nonEmptyString(item.note) ?? undefined,
    }];
  });
}

function normalizeConsensusMatrix(value: unknown): TranscriptConsensusMatrix | undefined {
  if (!isRecord(value)) return undefined;
  return {
    allAgree: normalizeConsensusItems(value.allAgree),
    majorityAgree: normalizeConsensusItems(value.majorityAgree),
    singleSource: normalizeConsensusItems(value.singleSource),
    allDiffer: normalizeConsensusItems(value.allDiffer),
    humanReviewRequired: normalizeConsensusItems(value.humanReviewRequired),
  };
}

function normalizeCalculations(value: unknown): TranscriptAreaCalculation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = nonEmptyString(item.label);
    if (!label) return [];
    const category = item.category === 'building' ||
      item.category === 'land' ||
      item.category === 'parking_building' ||
      item.category === 'parking_land' ||
      item.category === 'other'
      ? item.category
      : 'other';
    return [{
      category,
      label,
      areaSqm: nonEmptyString(item.areaSqm) ?? undefined,
      shareRatio: nonEmptyString(item.shareRatio) ?? undefined,
      calculatedAreaSqm: nonEmptyString(item.calculatedAreaSqm) ?? undefined,
      formula: nonEmptyString(item.formula) ?? undefined,
      confidence: normalizeConfidence(item.confidence),
      evidence: normalizeEvidence(item.evidence),
    }];
  });
}

function normalizeFieldConfidence(value: unknown): TranscriptReportFieldConfidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const fieldPath = nonEmptyString(item.fieldPath);
    if (!fieldPath) return [];
    return [{
      fieldPath,
      confidence: normalizeConfidence(item.confidence),
      rationale: nonEmptyString(item.rationale) ?? undefined,
    }];
  });
}

export function normalizeStandardReport(value: unknown): TranscriptStandardReport | undefined {
  if (!isRecord(value)) return undefined;
  const confidence = isRecord(value.confidence) ? value.confidence : {};
  return {
    reportMeta: normalizeMeta(value.reportMeta),
    documentInventory: normalizeDocumentInventory(value.documentInventory),
    pageObservations: normalizePageObservations(value.pageObservations),
    observedContentSummary: normalizeStringArray(value.observedContentSummary),
    structuredJson: value.structuredJson,
    consensusMatrix: normalizeConsensusMatrix(value.consensusMatrix),
    missingInformation: normalizeStringArray(value.missingInformation),
    calculations: normalizeCalculations(value.calculations),
    preliminarySummary: normalizeStringArray(value.preliminarySummary),
    areaDetailDraft: value.areaDetailDraft,
    confidence: {
      overall: normalizeConfidence(confidence.overall),
      fieldLevel: normalizeFieldConfidence(confidence.fieldLevel),
    },
    humanReviewRequired: normalizeStringArray(value.humanReviewRequired),
  };
}

function canonicalValue(value: unknown): string {
  if (typeof value === 'string') {
    const compact = value.trim().replace(/\s+/g, ' ').replace(/,/g, '');
    if (/^-?\d+(\.\d+)?$/.test(compact)) {
      return Number(Number(compact).toFixed(6)).toString();
    }
    return compact;
  }
  if (typeof value === 'number') return Number(value.toFixed(6)).toString();
  if (typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  return JSON.stringify(value);
}

function flattenPrimitiveValues(value: unknown, path: string, output: Map<string, unknown>): void {
  if (value === undefined) return;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (typeof value === 'string' && value.trim().length === 0) return;
    output.set(path, value);
    return;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
      if (value.length > 0) output.set(path, value);
      return;
    }
    value.slice(0, 20).forEach((item, index) => {
      flattenPrimitiveValues(item, `${path}[${index}]`, output);
    });
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    flattenPrimitiveValues(child, nextPath, output);
  }
}

export function buildConsensusMatrixFromSources(sources: ConsensusSource[]): TranscriptConsensusMatrix {
  const populatedSources = sources.filter((source) => source.participant.trim().length > 0);
  const totalParticipants = populatedSources.length;
  const valuesByPath = new Map<string, Array<{ participant: string; value: unknown; key: string }>>();
  for (const source of populatedSources) {
    const flattened = new Map<string, unknown>();
    flattenPrimitiveValues(source.structuredJson, '', flattened);
    for (const [fieldPath, value] of flattened.entries()) {
      const entries = valuesByPath.get(fieldPath) ?? [];
      entries.push({ participant: source.participant, value, key: canonicalValue(value) });
      valuesByPath.set(fieldPath, entries);
    }
  }

  const allAgree: TranscriptConsensusItem[] = [];
  const majorityAgree: TranscriptConsensusItem[] = [];
  const singleSource: TranscriptConsensusItem[] = [];
  const allDiffer: TranscriptConsensusItem[] = [];
  const humanReviewRequired: TranscriptConsensusItem[] = [];

  for (const [fieldPath, entries] of valuesByPath.entries()) {
    const groups = new Map<string, Array<{ participant: string; value: unknown }>>();
    for (const entry of entries) {
      groups.set(entry.key, [...(groups.get(entry.key) ?? []), entry]);
    }
    const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length);
    const largest = sortedGroups[0];
    if (!largest) continue;
    const item: TranscriptConsensusItem = {
      fieldPath,
      value: largest[0]?.value,
      participants: largest.map((entry) => entry.participant),
    };
    if (largest.length === totalParticipants && groups.size === 1) {
      allAgree.push(item);
      continue;
    }
    if (groups.size === entries.length && entries.length === totalParticipants && totalParticipants > 1) {
      const differItem: TranscriptConsensusItem = {
        fieldPath,
        value: Object.fromEntries(entries.map((entry) => [entry.participant, entry.value])),
        participants: entries.map((entry) => entry.participant),
        note: '所有參與者都提供不同值',
      };
      allDiffer.push(differItem);
      humanReviewRequired.push(differItem);
      continue;
    }
    if (largest.length >= 2) {
      majorityAgree.push(item);
      humanReviewRequired.push({
        ...item,
        note: '部分參與者一致，但仍有不同或缺漏值',
      });
      continue;
    }
    singleSource.push(item);
    humanReviewRequired.push({
      ...item,
      note: '只有一位參與者提供此值',
    });
  }

  return { allAgree, majorityAgree, singleSource, allDiffer, humanReviewRequired };
}

export function createReportMeta(params: {
  stage: TranscriptStandardReportStage;
  company?: string;
  provider: string;
  model: string;
  runId: string;
  roleLabel: string;
  generatedAt?: string;
}): TranscriptStandardReportMeta {
  return {
    stage: params.stage,
    company: params.company ?? params.provider,
    provider: params.provider,
    model: params.model,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    runId: params.runId,
    roleLabel: params.roleLabel,
  };
}
