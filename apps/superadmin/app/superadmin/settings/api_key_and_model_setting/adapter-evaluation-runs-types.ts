export type AdapterEvaluationHistoryEntryDto = {
  at: string;
  resultSummary: string;
  httpStatus: number | null;
  evaluationLevel: string;
};

export type AdapterEvaluationGroupSummaryDto = {
  adapterId: string;
  channel: 'cli' | 'http';
  totalRuns: number;
  lastAt: string | null;
  lastSummary: string;
  recentEntries: AdapterEvaluationHistoryEntryDto[];
};
