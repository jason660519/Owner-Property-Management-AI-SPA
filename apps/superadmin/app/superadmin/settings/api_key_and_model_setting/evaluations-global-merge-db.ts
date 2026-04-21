import type { AdapterEvaluationGroupSummaryDto } from './adapter-evaluation-runs-types';
import type { EvaluationsGlobalTableRow } from './evaluations-global-columns';

/** Merge per-user DB history summary into rows built from Adapter drafts. */
export function mergeEvaluationsGlobalDbHistory(
  rows: EvaluationsGlobalTableRow[],
  summaries: AdapterEvaluationGroupSummaryDto[] | null | undefined,
): EvaluationsGlobalTableRow[] {
  if (!summaries?.length) return rows;
  const map = new Map(summaries.map((s) => [`${s.adapterId}:${s.channel}`, s] as const));
  return rows.map((row) => {
    if (!row.adapterItemId || !row.adapterChannel) return row;
    const s = map.get(`${row.adapterItemId}:${row.adapterChannel}`);
    if (!s) return row;
    return {
      ...row,
      historyTotalRuns: s.totalRuns,
      historyLastAt: s.lastAt,
      historyLastSummary: s.lastSummary.trim() ? s.lastSummary : row.historyLastSummary,
      historyEntries: s.recentEntries.map((e) => ({
        at: e.at,
        resultSummary: e.resultSummary,
        httpStatus: e.httpStatus,
        evaluationLevel: e.evaluationLevel,
      })),
    };
  });
}
