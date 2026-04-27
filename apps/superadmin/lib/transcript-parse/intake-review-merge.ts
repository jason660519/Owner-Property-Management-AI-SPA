import type {
  TranscriptDispositionKind,
  TranscriptIntakeAiStageModel,
  TranscriptReviewFieldDecision,
  TranscriptReviewIssue,
  TranscriptReviewResult,
} from '@/lib/transcript-parse/intake-types';
import type { ParkingTitleRight } from '@/lib/types/properties';

export interface TranscriptReviewAttempt {
  review: TranscriptReviewResult;
  model: TranscriptIntakeAiStageModel;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function normalizeReviewConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) return Number((value / 100).toFixed(4));
  return Math.max(0, Math.min(1, value));
}

function majorityDisposition(results: TranscriptReviewResult[]): TranscriptDispositionKind {
  const counts = new Map<TranscriptDispositionKind, number>();
  for (const result of results) {
    counts.set(result.dispositionKind, (counts.get(result.dispositionKind) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
}

function dedupeIssues(results: TranscriptReviewResult[]): TranscriptReviewIssue[] {
  const seen = new Set<string>();
  const issues: TranscriptReviewIssue[] = [];
  for (const result of results) {
    for (const issue of result.issues) {
      const key = `${issue.severity}:${issue.fieldPath}:${issue.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(issue);
    }
  }
  return issues;
}

function unionParkingRights(results: TranscriptReviewResult[]): ParkingTitleRight[] {
  const rights = new Set<ParkingTitleRight>();
  for (const result of results) {
    for (const right of result.parkingTitleRights) rights.add(right);
  }
  return [...rights];
}

function unionConfirmationItems(results: TranscriptReviewResult[], errors: string[]): string[] {
  const items = new Set<string>();
  for (const result of results) {
    for (const item of result.userConfirmationRequired) items.add(item);
  }
  for (const error of errors) items.add(`Reviewer 失敗：${error}`);
  return [...items];
}

function mergeFieldDecisions(results: TranscriptReviewResult[]): TranscriptReviewFieldDecision[] {
  const seen = new Set<string>();
  const decisions: TranscriptReviewFieldDecision[] = [];
  for (const result of results) {
    for (const decision of result.fieldDecisions ?? []) {
      const key = `${decision.fieldPath}:${decision.decision}:${JSON.stringify(decision.selectedValue)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      decisions.push({
        ...decision,
        confidence: normalizeReviewConfidence(decision.confidence),
      });
    }
  }
  return decisions;
}

function mergeDoubleCheckSummary(results: TranscriptReviewResult[]): string[] {
  const items = new Set<string>();
  for (const result of results) {
    for (const item of result.doubleCheckSummary ?? []) items.add(item);
  }
  return [...items];
}

export function mergeTranscriptReviewAttempts(
  attempts: TranscriptReviewAttempt[],
  errors: string[],
): TranscriptReviewResult {
  const reviews = attempts.map((attempt) => attempt.review);
  const issues = dedupeIssues(reviews);
  const blockingCount = issues.filter((issue) => issue.severity === 'blocking').length;
  return {
    approved: reviews.every((review) => review.approved) && blockingCount === 0,
    confidence: normalizeReviewConfidence(average(reviews.map((review) => review.confidence))),
    issues,
    parkingTitleRights: unionParkingRights(reviews),
    dispositionKind: majorityDisposition(reviews),
    userConfirmationRequired: unionConfirmationItems(reviews, errors),
    fieldDecisions: mergeFieldDecisions(reviews),
    doubleCheckSummary: mergeDoubleCheckSummary(reviews),
    reviewerModels: attempts.map((attempt) => ({
      ...attempt.model,
      confidence: normalizeReviewConfidence(attempt.review.confidence),
    })),
    reviewerReports: attempts.map((attempt) => ({
      provider: attempt.model.provider,
      model: attempt.model.model,
      durationMs: attempt.model.durationMs,
      review: attempt.review,
    })),
    reviewerErrors: errors,
  };
}
