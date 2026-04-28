import type { createAdminClient } from '@/utils/supabase/admin';
import type {
  TranscriptAreaCalculation,
  TranscriptParserReport,
  TranscriptStandardReport,
} from '@/lib/transcript-parse/intake-types';
import {
  createReportMeta,
  normalizeStandardReport,
} from '@/lib/transcript-parse/report-standard';

type AdminClient = ReturnType<typeof createAdminClient>;

interface OcrParseRow {
  property_document_id?: string | null;
  provider?: string | null;
  model_id?: string | null;
  role?: string | null;
  raw_output?: unknown;
  parse_duration_ms?: number | null;
  error_message?: string | null;
  created_at?: string | null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

function valueAt(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}

function numberOrText(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return nonEmptyString(value) ?? undefined;
}

function collectAreaCalculations(rawOutput: unknown): TranscriptAreaCalculation[] {
  const output = asObject(rawOutput);
  const calculations: TranscriptAreaCalculation[] = [];
  const buildingArea = numberOrText(valueAt(output, 'buildingTranscript.description.totalArea')) ||
    numberOrText(valueAt(output, 'buildingTranscript.description.floorArea'));
  if (buildingArea) {
    calculations.push({
      category: 'building',
      label: '建物面積',
      areaSqm: buildingArea,
      formula: '依 parser structuredJson.buildingTranscript.description 面積欄位',
      confidence: 0,
    });
  }
  const landArea = numberOrText(valueAt(output, 'landTranscript.description.area'));
  const landShareRatio = nonEmptyString(valueAt(output, 'landTranscript.ownership.0.ownershipRatio'));
  if (landArea || landShareRatio) {
    calculations.push({
      category: 'land',
      label: '土地面積與持分',
      areaSqm: landArea,
      shareRatio: landShareRatio ?? undefined,
      formula: '依 parser structuredJson.landTranscript.description.area 與 ownershipRatio',
      confidence: 0,
    });
  }
  return calculations;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function collectOwnerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  for (const raw of value) {
    const owner = asObject(raw);
    const name = nonEmptyString(owner.ownerName);
    if (name) names.add(name);
  }
  return [...names];
}

function summarizeRawOutput(rawOutput: unknown): string[] {
  const output = asObject(rawOutput);
  const observations: string[] = [];
  const kind = nonEmptyString(output.kind);
  if (kind) observations.push(`文件解析 kind：${kind}`);

  const buildingNumber = nonEmptyString(valueAt(output, 'buildingTranscript.description.buildingNumber'));
  const doorAddress = nonEmptyString(valueAt(output, 'buildingTranscript.description.doorAddress'));
  const buildingArea = nonEmptyString(valueAt(output, 'buildingTranscript.description.totalArea')) ||
    nonEmptyString(valueAt(output, 'buildingTranscript.description.floorArea'));
  const buildingUse = nonEmptyString(valueAt(output, 'buildingTranscript.description.mainUse'));
  const commonAreas = valueAt(output, 'buildingTranscript.description.commonAreas');
  const buildingOwners = collectOwnerNames(valueAt(output, 'buildingTranscript.ownership'));

  if (buildingNumber) observations.push(`看到建號：${buildingNumber}`);
  if (doorAddress) observations.push(`看到門牌：${doorAddress}`);
  if (buildingArea) observations.push(`看到建物面積：${buildingArea}`);
  if (buildingUse) observations.push(`看到建物用途：${buildingUse}`);
  if (Array.isArray(commonAreas) && commonAreas.length > 0) {
    observations.push(`看到共同使用部分 ${commonAreas.length} 筆`);
  }
  if (buildingOwners.length > 0) observations.push(`看到建物所有權人：${buildingOwners.join('、')}`);

  const landNumber = nonEmptyString(valueAt(output, 'landTranscript.description.landNumber'));
  const landArea = nonEmptyString(valueAt(output, 'landTranscript.description.area'));
  const landUse = nonEmptyString(valueAt(output, 'landTranscript.description.useZone')) ||
    nonEmptyString(valueAt(output, 'landTranscript.description.landCategory'));
  const landOwners = collectOwnerNames(valueAt(output, 'landTranscript.ownership'));
  if (landNumber) observations.push(`看到地號：${landNumber}`);
  if (landArea) observations.push(`看到土地面積：${landArea}`);
  if (landUse) observations.push(`看到土地用途／分區：${landUse}`);
  if (landOwners.length > 0) observations.push(`看到土地所有權人：${landOwners.join('、')}`);

  if (observations.length === 0) observations.push('未擷取到可直接摘要的建物、土地或所有權欄位。');
  return observations;
}

function buildFallbackStandardReport(
  report: Omit<TranscriptParserReport, 'markdown' | 'standardReport'>,
  runId: string,
): TranscriptStandardReport {
  const rawOutputs = report.documents.map((document) => ({
    documentId: document.documentId,
    rawOutput: document.rawOutput,
  }));
  return {
    reportMeta: createReportMeta({
      stage: 'parse',
      provider: report.provider,
      model: report.model,
      runId,
      roleLabel: 'Parser',
    }),
    documentInventory: report.documents.map((document, index) => ({
      documentId: document.documentId,
      documentName: `Document ${index + 1}`,
      documentKind: nonEmptyString(valueAt(document.rawOutput, 'kind')) ?? undefined,
      pageCount: null,
      structureSummary: document.observations,
    })),
    pageObservations: [],
    observedContentSummary: report.observations,
    structuredJson: rawOutputs.length === 1 ? rawOutputs[0]?.rawOutput : { documents: rawOutputs },
    missingInformation: [],
    calculations: report.documents.flatMap((document) => collectAreaCalculations(document.rawOutput)),
    preliminarySummary: report.observations,
    confidence: {
      overall: 0,
      fieldLevel: [],
    },
    humanReviewRequired: report.documents
      .filter((document) => document.errorMessage)
      .map((document) => `${document.documentId}: ${document.errorMessage}`),
  };
}

function standardReportFromDocuments(
  report: Omit<TranscriptParserReport, 'markdown' | 'standardReport'>,
  runId: string,
): TranscriptStandardReport {
  const modelProvided = report.documents
    .map((document) => normalizeStandardReport(asObject(document.rawOutput).standardReport))
    .find((standardReport): standardReport is TranscriptStandardReport => Boolean(standardReport));
  return modelProvided ?? buildFallbackStandardReport(report, runId);
}

function buildMarkdown(report: Omit<TranscriptParserReport, 'markdown'>, runId: string): string {
  const standardReport = report.standardReport ?? buildFallbackStandardReport(report, runId);
  return [
    '# Parse 解析成果報告',
    '',
    '## 第一段：報告人＋日期時間',
    `- 公司：${standardReport.reportMeta?.company || report.provider}`,
    `- 模型型號：${standardReport.reportMeta?.model || report.model}`,
    `- 日期時間：${standardReport.reportMeta?.generatedAt || '未記錄'}`,
    `- Run ID: ${standardReport.reportMeta?.runId || runId}`,
    `- Duration: ${typeof report.durationMs === 'number' ? `${(report.durationMs / 1000).toFixed(1)} 秒` : '未記錄'}`,
    '',
    '## 第二段：我看到的內容',
    `- User 上傳文件數：${report.documentCount}`,
    ...(standardReport.documentInventory.length
      ? standardReport.documentInventory.flatMap((document, index) => [
        `- 文件 ${index + 1}：${document.documentName ?? document.documentId ?? 'unknown'}；類型：${document.documentKind ?? 'unknown'}；頁數：${document.pageCount ?? '未知'}`,
        ...document.structureSummary.map((item) => `  - 架構：${item}`),
      ])
      : report.observations.map((item) => `- ${item}`)),
    ...(standardReport.pageObservations.length
      ? standardReport.pageObservations.flatMap((page) => [
        '',
        `### ${page.documentName ?? page.documentId ?? '文件'} 第 ${page.page} 頁`,
        page.summary ? `- 摘要：${page.summary}` : '- 摘要：未提供',
        '- 看到的文字：',
        ...page.visibleText.map((text) => `  - ${text}`),
      ])
      : ['', '### 逐頁文字', '此 parser 未提供逐頁完整文字；請以 Raw Structured JSON 與原始文件 evidence 複核。']),
    '',
    '## 第三段：Structured JSON',
    '```json',
    formatJson(standardReport.structuredJson),
    '```',
    '',
    '## 第四段：我認為 user 提供的文件少了哪些重要資訊',
    ...(standardReport.missingInformation.length
      ? standardReport.missingInformation.map((item) => `- ${item}`)
      : ['- 未由 parser 明確標示缺漏資訊。']),
    '',
    '## 第五段：我的計算結果',
    ...(standardReport.calculations.length
      ? standardReport.calculations.map((item) => `- ${item.label}：${item.areaSqm ?? '未知'} 平方公尺；持分 ${item.shareRatio ?? '未知'}；計算式：${item.formula ?? '未提供'}`)
      : ['- parser 未提供可確認的面積計算結果。']),
    '',
    '## 第六段：初步內容、面積明細與信心分數',
    ...(standardReport.preliminarySummary.length
      ? standardReport.preliminarySummary.map((item) => `- ${item}`)
      : ['- 未提供初步摘要。']),
    `- 信心分數：${Math.round(standardReport.confidence.overall * 100)}%`,
    '',
    '## Raw Parser Documents',
    '```json',
    formatJson(report.documents),
    '```',
  ].join('\n');
}

export function buildTranscriptParserReportsFromRows(params: {
  runId: string;
  rows: OcrParseRow[];
}): TranscriptParserReport[] {
  const groups = new Map<string, OcrParseRow[]>();
  for (const row of params.rows) {
    if (row.role !== 'parser') continue;
    if (!row.provider || !row.model_id) continue;
    const key = `${row.provider}::${row.model_id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.values()].map((rows) => {
    const first = rows[0];
    const documents = rows.map((row) => {
      const observations = row.error_message
        ? [`解析失敗：${row.error_message}`]
        : summarizeRawOutput(row.raw_output);
      return {
        documentId: row.property_document_id ?? 'unknown',
        durationMs: typeof row.parse_duration_ms === 'number' ? row.parse_duration_ms : null,
        errorMessage: row.error_message ?? null,
        observations,
        rawOutput: row.raw_output ?? null,
      };
    });
    const observations = [...new Set(documents.flatMap((document) => document.observations))];
    const durationMs = documents.reduce((sum, document) => sum + (document.durationMs ?? 0), 0);
    const reportWithoutMarkdown = {
      provider: first?.provider ?? 'unknown',
      model: first?.model_id ?? 'unknown',
      durationMs: durationMs > 0 ? durationMs : null,
      documentCount: documents.length,
      observations,
      documents,
    };
    const standardReport = standardReportFromDocuments(reportWithoutMarkdown, params.runId);
    return {
      ...reportWithoutMarkdown,
      standardReport,
      markdown: buildMarkdown({ ...reportWithoutMarkdown, standardReport }, params.runId),
    };
  });
}

export async function loadTranscriptParserReports(params: {
  admin: AdminClient;
  runId: string;
  sourceDocumentIds: string[];
}): Promise<TranscriptParserReport[]> {
  if (params.sourceDocumentIds.length === 0) return [];
  const { data, error } = await params.admin
    .from('ocr_parse_results')
    .select('property_document_id, provider, model_id, role, raw_output, parse_duration_ms, error_message, created_at')
    .in('property_document_id', params.sourceDocumentIds);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data as OcrParseRow[] : [];
  return buildTranscriptParserReportsFromRows({ runId: params.runId, rows });
}
