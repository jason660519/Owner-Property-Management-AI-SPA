// Dynamic per-model transcript parser/reviewer report.

import { NextRequest, NextResponse } from 'next/server';

import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { buildTranscriptParserReportsFromRows } from '@/lib/transcript-parse/parser-report';
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
  reviewResult: unknown;
}): string {
  const report = findReviewerReport(params.reviewResult, params.provider, params.model);
  const review = asObject(report?.review ?? params.reviewResult);
  return [
    `# Verify / Review 審查結果報告`,
    '',
    `- Run ID: ${params.runId}`,
    `- Reviewer: ${params.provider}/${params.model}`,
    `- Duration: ${typeof report?.durationMs === 'number' ? `${(report.durationMs / 1000).toFixed(1)} 秒` : '未記錄'}`,
    `- Approved: ${String(review.approved ?? 'unknown')}`,
    `- Confidence: ${typeof review.confidence === 'number' ? `${Math.round(review.confidence * 100)}%` : 'unknown'}`,
    `- Disposition: ${String(review.dispositionKind ?? 'unknown')}`,
    '',
    '## Issues',
    '```json',
    formatJson(review.issues ?? []),
    '```',
    '',
    '## User Confirmation Required',
    '```json',
    formatJson(review.userConfirmationRequired ?? []),
    '```',
    '',
    '## Field Decisions',
    '```json',
    formatJson(review.fieldDecisions ?? []),
    '```',
    '',
    '## Double Check Summary',
    '```json',
    formatJson(review.doubleCheckSummary ?? []),
    '```',
    '',
    '## Raw Review Result',
    '```json',
    formatJson(review),
    '```',
  ].join('\n');
}

function buildDetailBuilderReport(params: {
  runId: string;
  provider: string;
  model: string;
  parsedResult: unknown;
}): string {
  const parsed = asObject(params.parsedResult);
  const result = asObject(parsed.detailBuilderResult);
  const draft = asObject(result.areaDetailDraft ?? parsed.areaDetailDraft);
  return [
    '# Detail Builder 明細草稿報告',
    '',
    `- Run ID: ${params.runId}`,
    `- Detail Builder: ${params.provider}/${params.model}`,
    `- Confidence: ${typeof result.confidence === 'number' ? `${Math.round(result.confidence * 100)}%` : 'unknown'}`,
    '',
    '## Summary',
    '```json',
    formatJson(result.summary ?? []),
    '```',
    '',
    '## Warnings',
    '```json',
    formatJson(result.warnings ?? []),
    '```',
    '',
    '## User Confirmation Required',
    '```json',
    formatJson(result.userConfirmationRequired ?? []),
    '```',
    '',
    '## Area Detail Draft',
    '```json',
    formatJson(draft),
    '```',
    '',
    '## Raw Detail Builder Result',
    '```json',
    formatJson(result),
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
      return markdownResponse(buildVerifierReport({ runId: id, provider, model, reviewResult: row.review_result }));
    }
    if (stage === 'detail_builder') {
      return markdownResponse(buildDetailBuilderReport({ runId: id, provider, model, parsedResult: row.parsed_result }));
    }
    return jsonError('Unsupported report stage', 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Failed to build report', 500);
  }
}
