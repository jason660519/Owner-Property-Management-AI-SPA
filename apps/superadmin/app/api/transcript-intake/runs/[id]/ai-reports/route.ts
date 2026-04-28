// Dynamic per-model transcript parser/reviewer report.

import { NextRequest, NextResponse } from 'next/server';

import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { buildTranscriptParserReportsFromRows } from '@/lib/transcript-parse/parser-report';
import {
  buildConsensusMatrixFromSources,
  createReportMeta,
  normalizeStandardReport,
} from '@/lib/transcript-parse/report-standard';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStandardStructuredJson(value: unknown, fallback: unknown): unknown {
  const standardReport = normalizeStandardReport(asObject(value).standardReport);
  return standardReport?.structuredJson ?? fallback;
}

function parserConsensusSources(parsedResult: unknown): Array<{ participant: string; structuredJson: unknown }> {
  const parsed = asObject(parsedResult);
  const reports = Array.isArray(parsed.parserReports) ? parsed.parserReports : [];
  return reports.flatMap((raw) => {
    const report = asObject(raw);
    const provider = nonEmptyString(report.provider) ?? 'unknown';
    const model = nonEmptyString(report.model) ?? 'unknown';
    const documents = Array.isArray(report.documents) ? report.documents : [];
    const structuredJson = readStandardStructuredJson(report, {
      documents: documents.map((document) => {
        const doc = asObject(document);
        return {
          documentId: doc.documentId,
          rawOutput: doc.rawOutput,
        };
      }),
    });
    return [{ participant: `Parser ${provider}/${model}`, structuredJson }];
  });
}

function reviewerConsensusSources(reviewResult: unknown): Array<{ participant: string; structuredJson: unknown }> {
  const review = asObject(reviewResult);
  const reports = Array.isArray(review.reviewerReports) ? review.reviewerReports : [];
  return reports.flatMap((raw) => {
    const report = asObject(raw);
    const provider = nonEmptyString(report.provider) ?? 'unknown';
    const model = nonEmptyString(report.model) ?? 'unknown';
    const reviewBody = asObject(report.review);
    return [{
      participant: `Reviewer ${provider}/${model}`,
      structuredJson: readStandardStructuredJson(reviewBody, {
        approved: reviewBody.approved,
        dispositionKind: reviewBody.dispositionKind,
        parkingTitleRights: reviewBody.parkingTitleRights,
        fieldDecisions: reviewBody.fieldDecisions,
        userConfirmationRequired: reviewBody.userConfirmationRequired,
      }),
    }];
  });
}

function consensusSection(matrix: ReturnType<typeof buildConsensusMatrixFromSources>): string[] {
  return [
    '### 100% 參與者都相同的 key value',
    '```json',
    formatJson(matrix.allAgree),
    '```',
    '',
    '### 66% / 多數參與者相同的 key value',
    '```json',
    formatJson(matrix.majorityAgree),
    '```',
    '',
    '### 33% / 只有單一參與者提供或相同的 key value',
    '```json',
    formatJson(matrix.singleSource),
    '```',
    '',
    '### 全部都不同的 key value',
    '```json',
    formatJson(matrix.allDiffer),
    '```',
    '',
    '### 需要人類審核的 items',
    '```json',
    formatJson(matrix.humanReviewRequired),
    '```',
  ];
}

function markdownResponse(markdown: string): NextResponse {
  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function findReviewerReport(reviewResult: unknown, provider: string, model: string): Record<string, unknown> | null {
  const review = asObject(reviewResult);
  const reports = Array.isArray(review.reviewerReports) ? review.reviewerReports : [];
  for (const raw of reports) {
    const report = asObject(raw);
    if (report.provider === provider && report.model === model) return report;
  }
  return null;
}

function findParserReport(parsedResult: unknown, provider: string, model: string): Record<string, unknown> | null {
  const parsed = asObject(parsedResult);
  const reports = Array.isArray(parsed.parserReports) ? parsed.parserReports : [];
  for (const raw of reports) {
    const report = asObject(raw);
    if (report.provider === provider && report.model === model) return report;
  }
  return null;
}

function buildVerifierReport(params: {
  runId: string;
  provider: string;
  model: string;
  parsedResult: unknown;
  reviewResult: unknown;
}): string {
  const report = findReviewerReport(params.reviewResult, params.provider, params.model);
  const review = asObject(report?.review ?? params.reviewResult);
  const standardReport = normalizeStandardReport(review.standardReport);
  const reviewerSource = {
    participant: `Reviewer ${params.provider}/${params.model}`,
    structuredJson: readStandardStructuredJson(review, {
      approved: review.approved,
      dispositionKind: review.dispositionKind,
      parkingTitleRights: review.parkingTitleRights,
      fieldDecisions: review.fieldDecisions,
      userConfirmationRequired: review.userConfirmationRequired,
    }),
  };
  const matrix = standardReport?.consensusMatrix ??
    buildConsensusMatrixFromSources([...parserConsensusSources(params.parsedResult), reviewerSource]);
  const meta = standardReport?.reportMeta ?? createReportMeta({
    stage: 'review',
    provider: params.provider,
    model: params.model,
    runId: params.runId,
    roleLabel: 'Reviewer',
  });
  return [
    `# Verify / Review 審查結果報告`,
    '',
    '## 第一段：審查人＋日期時間',
    `- 公司：${meta.company || params.provider}`,
    `- 模型型號：${meta.model || params.model}`,
    `- 日期時間：${meta.generatedAt || '未記錄'}`,
    `- Run ID: ${meta.runId || params.runId}`,
    `- Duration: ${typeof report?.durationMs === 'number' ? `${(report.durationMs / 1000).toFixed(1)} 秒` : '未記錄'}`,
    `- Approved: ${String(review.approved ?? 'unknown')}`,
    `- Confidence: ${typeof review.confidence === 'number' ? `${Math.round(review.confidence * 100)}%` : 'unknown'}`,
    `- Disposition: ${String(review.dispositionKind ?? 'unknown')}`,
    '',
    '## 第二段：我看到的內容',
    `- 收到 parser 報告數：${parserConsensusSources(params.parsedResult).length}`,
    ...consensusSection(matrix),
    '',
    '## 第三段：最終標的物 Structured JSON',
    '```json',
    formatJson(standardReport?.structuredJson ?? reviewerSource.structuredJson),
    '```',
    '',
    '## 第四段：parser 說少的資訊是否找到',
    '```json',
    formatJson({
      missingInformation: standardReport?.missingInformation ?? [],
      userConfirmationRequired: review.userConfirmationRequired ?? [],
      issues: review.issues ?? [],
    }),
    '```',
    '',
    '## 第五段：我的計算結果',
    '```json',
    formatJson(standardReport?.calculations ?? []),
    '```',
    '',
    '## 第六段：初步內容、面積明細與信心分數',
    '```json',
    formatJson({
      preliminarySummary: standardReport?.preliminarySummary ?? review.doubleCheckSummary ?? [],
      confidence: standardReport?.confidence ?? { overall: review.confidence ?? 0, fieldLevel: review.fieldDecisions ?? [] },
      fieldDecisions: review.fieldDecisions ?? [],
      rawReviewResult: review,
    }),
    '```',
  ].join('\n');
}

function buildDetailBuilderReport(params: {
  runId: string;
  provider: string;
  model: string;
  parsedResult: unknown;
  reviewResult: unknown;
}): string {
  const parsed = asObject(params.parsedResult);
  const result = asObject(parsed.detailBuilderResult);
  const draft = asObject(result.areaDetailDraft ?? parsed.areaDetailDraft);
  const standardReport = normalizeStandardReport(result.standardReport);
  const detailSource = {
    participant: `Detail Builder ${params.provider}/${params.model}`,
    structuredJson: readStandardStructuredJson(result, {
      areaDetailDraft: draft,
      summary: result.summary,
      warnings: result.warnings,
      userConfirmationRequired: result.userConfirmationRequired,
    }),
  };
  const matrix = standardReport?.consensusMatrix ??
    buildConsensusMatrixFromSources([...reviewerConsensusSources(params.reviewResult), detailSource]);
  const meta = standardReport?.reportMeta ?? createReportMeta({
    stage: 'detail_builder',
    provider: params.provider,
    model: params.model,
    runId: params.runId,
    roleLabel: 'Detail Builder',
  });
  return [
    '# Detail Builder 明細草稿報告',
    '',
    '## 第一段：Detail Builder＋日期時間',
    `- 公司：${meta.company || params.provider}`,
    `- 模型型號：${meta.model || params.model}`,
    `- 日期時間：${meta.generatedAt || '未記錄'}`,
    `- Run ID: ${meta.runId || params.runId}`,
    `- Confidence: ${typeof result.confidence === 'number' ? `${Math.round(result.confidence * 100)}%` : 'unknown'}`,
    '',
    '## 第二段：我看到的內容',
    `- 收到 Verify / Review 報告數：${reviewerConsensusSources(params.reviewResult).length}`,
    ...consensusSection(matrix),
    '',
    '## 第三段：最終標的物 Structured JSON',
    '```json',
    formatJson(standardReport?.structuredJson ?? detailSource.structuredJson),
    '```',
    '',
    '## 第四段：Reviewer 說少的資訊是否找到',
    '```json',
    formatJson({
      missingInformation: standardReport?.missingInformation ?? [],
      userConfirmationRequired: result.userConfirmationRequired ?? [],
      warnings: result.warnings ?? [],
    }),
    '```',
    '',
    '## 第五段：我的計算結果',
    '```json',
    formatJson(standardReport?.calculations ?? []),
    '```',
    '',
    '## 第六段：初步內容、面積明細與信心分數',
    '```json',
    formatJson({
      preliminarySummary: standardReport?.preliminarySummary ?? result.summary ?? [],
      areaDetailDraft: standardReport?.areaDetailDraft ?? draft,
      confidence: standardReport?.confidence ?? { overall: result.confidence ?? 0, fieldLevel: [] },
      rawDetailBuilderResult: result,
    }),
    '```',
  ].join('\n');
}

async function buildParserReport(params: {
  runId: string;
  provider: string;
  model: string;
  parsedResult: unknown;
  sourceDocumentIds: string[];
  admin: ReturnType<typeof createAdminClient>;
}): Promise<string> {
  const persisted = findParserReport(params.parsedResult, params.provider, params.model);
  if (typeof persisted?.markdown === 'string' && persisted.markdown.trim().length > 0) {
    return persisted.markdown;
  }

  const { data, error } = await params.admin
    .from('ocr_parse_results')
    .select('property_document_id, provider, model_id, role, raw_output, parse_duration_ms, token_usage, error_message, created_at')
    .in('property_document_id', params.sourceDocumentIds)
    .eq('role', 'parser')
    .eq('provider', params.provider)
    .eq('model_id', params.model)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data.map(asObject) : [];
  const reports = buildTranscriptParserReportsFromRows({
    runId: params.runId,
    rows,
  });
  return reports.find((report) => report.provider === params.provider && report.model === params.model)?.markdown ??
    [
      '# Parse 解析成果報告',
      '',
      `- Run ID: ${params.runId}`,
      `- Parser: ${params.provider}/${params.model}`,
      '- Result rows: 0',
      '',
      '尚未找到此 parser 的解析紀錄。',
    ].join('\n');
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/transcript-intake/runs/[id]/ai-reports',
  });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const provider = searchParams.get('provider');
  const model = searchParams.get('model');
  if (!id || !stage || !provider || !model) return jsonError('Missing report parameters', 400);

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('transcript_intake_runs')
    .select('id, source_document_ids, parsed_result, review_result')
    .eq('id', id)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!row) return jsonError('找不到謄本工作台任務', 404);

  const sourceDocumentIds = Array.isArray(row.source_document_ids)
    ? row.source_document_ids.filter((item): item is string => typeof item === 'string')
    : [];

  try {
    if (stage === 'parse') {
      return markdownResponse(await buildParserReport({ runId: id, provider, model, parsedResult: row.parsed_result, sourceDocumentIds, admin }));
    }
    if (stage === 'verify_review') {
      return markdownResponse(buildVerifierReport({ runId: id, provider, model, parsedResult: row.parsed_result, reviewResult: row.review_result }));
    }
    if (stage === 'detail_builder') {
      return markdownResponse(buildDetailBuilderReport({ runId: id, provider, model, parsedResult: row.parsed_result, reviewResult: row.review_result }));
    }
    return jsonError('Unsupported report stage', 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Failed to build report', 500);
  }
}
