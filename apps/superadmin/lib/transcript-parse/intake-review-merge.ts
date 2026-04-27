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

function clampConfidence(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

export function normalizeReviewConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) return Number((value / 100).toFixed(4));
  return Math.max(0, Math.min(1, value));
}

function defaultFieldDecisionConfidence(decision: TranscriptReviewFieldDecision['decision']): number {
  if (decision === 'majority_accept') return 0.85;
  if (decision === 'reviewer_double_checked') return 0.78;
  if (decision === 'needs_user_confirmation') return 0.55;
  return 0.4;
}

function fieldDecisionConfidence(decisions: TranscriptReviewFieldDecision[] | undefined): number | null {
  if (!decisions?.length) return null;
  const scores = decisions.map((decision) => {
    const normalized = normalizeReviewConfidence(decision.confidence);
    return normalized > 0 ? normalized : defaultFieldDecisionConfidence(decision.decision);
  });
  return average(scores);
}

function issueEvidenceConfidence(review: TranscriptReviewResult): number {
  if (review.issues.length === 0) return review.approved ? 0.82 : 0.68;

  const evidenceCount = review.issues.filter((issue) => issue.evidence?.length).length;
  const evidenceRatio = evidenceCount / review.issues.length;
  const hasBlocking = review.issues.some((issue) => issue.severity === 'blocking');
  const base = hasBlocking ? 0.68 : 0.72;
  return clampConfidence(base + (evidenceRatio * 0.12));
}

function confirmationPenalty(review: TranscriptReviewResult): number {
  const needsUser = review.userConfirmationRequired.length;
  const insufficient = review.fieldDecisions?.filter((decision) => (
    decision.decision === 'insufficient_evidence' ||
    decision.decision === 'needs_user_confirmation'
  )).length ?? 0;
  return Math.min(0.18, (needsUser * 0.02) + (insufficient * 0.04));
}

export function calibrateReviewConfidence(review: TranscriptReviewResult): number {
  const raw = normalizeReviewConfidence(review.confidence);
  const decisionScore = fieldDecisionConfidence(review.fieldDecisions);
  const evidenceScore = issueEvidenceConfidence(review);
  const derived = clampConfidence((decisionScore ?? evidenceScore) - confirmationPenalty(review));
  if (raw === 0) return derived;
  if (raw < derived) return clampConfidence((raw * 0.3) + (derived * 0.7));
  return clampConfidence(raw);
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
  const calibratedConfidences = reviews.map(calibrateReviewConfidence);
  const issues = dedupeIssues(reviews);
  const blockingCount = issues.filter((issue) => issue.severity === 'blocking').length;
  const dispositionCount = new Set(reviews.map((review) => review.dispositionKind)).size;
  const agreementAdjustment = dispositionCount <= 1 ? 0.04 : -0.04;
  const errorPenalty = Math.min(0.12, errors.length * 0.04);
  return {
    approved: reviews.every((review) => review.approved) && blockingCount === 0,
    confidence: clampConfidence(average(calibratedConfidences) + agreementAdjustment - errorPenalty),
    issues,
    parkingTitleRights: unionParkingRights(reviews),
    dispositionKind: majorityDisposition(reviews),
    userConfirmationRequired: unionConfirmationItems(reviews, errors),
    fieldDecisions: mergeFieldDecisions(reviews),
    doubleCheckSummary: mergeDoubleCheckSummary(reviews),
    reviewerModels: attempts.map((attempt, index) => ({
      ...attempt.model,
      confidence: calibratedConfidences[index] ?? calibrateReviewConfidence(attempt.review),
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
