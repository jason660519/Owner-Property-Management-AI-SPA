import type { createAdminClient } from '@/utils/supabase/admin';
import type { TranscriptParserReport } from '@/lib/transcript-parse/intake-types';

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

function buildMarkdown(report: Omit<TranscriptParserReport, 'markdown'>, runId: string): string {
  return [
    '# Parse 解析成果報告',
    '',
    `- Run ID: ${runId}`,
    `- Parser: ${report.provider}/${report.model}`,
    `- Documents: ${report.documentCount}`,
    `- Duration: ${typeof report.durationMs === 'number' ? `${(report.durationMs / 1000).toFixed(1)} 秒` : '未記錄'}`,
    '',
    '## 這個 parser 看到的東西',
    ...report.observations.map((item) => `- ${item}`),
    '',
    ...report.documents.map((document, index) => [
      `## Document ${index + 1}`,
      '',
      `- Document ID: ${document.documentId}`,
      `- Duration: ${typeof document.durationMs === 'number' ? `${(document.durationMs / 1000).toFixed(1)} 秒` : '未記錄'}`,
      `- Error: ${document.errorMessage || '無'}`,
      '',
      '### 觀察摘要',
      ...document.observations.map((item) => `- ${item}`),
      '',
      '### Structured JSON',
      '```json',
      formatJson(document.rawOutput),
      '```',
      '',
    ].join('\n')),
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
    return {
      ...reportWithoutMarkdown,
      markdown: buildMarkdown(reportWithoutMarkdown, params.runId),
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
