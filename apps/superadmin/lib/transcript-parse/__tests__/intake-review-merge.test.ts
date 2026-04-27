import {
  calibrateReviewConfidence,
  mergeTranscriptReviewAttempts,
  normalizeReviewConfidence,
  type TranscriptReviewAttempt,
} from '@/lib/transcript-parse/intake-review-merge';
import type { TranscriptReviewResult } from '@/lib/transcript-parse/intake-types';

function attempt(confidence: number): TranscriptReviewAttempt {
  return {
    model: {
      provider: 'openai',
      model: 'gpt-5.5',
      role: 'review',
      durationMs: 1000,
    },
    review: {
      approved: true,
      confidence,
      issues: [],
      parkingTitleRights: [],
      dispositionKind: 'unit_building_with_land_share_sale',
      userConfirmationRequired: [],
    },
  };
}

describe('normalizeReviewConfidence', () => {
  it('accepts normalized confidence values', () => {
    expect(normalizeReviewConfidence(0.83)).toBe(0.83);
  });

  it('converts percent-like model output into 0..1 confidence', () => {
    expect(normalizeReviewConfidence(12.63)).toBe(0.1263);
    expect(normalizeReviewConfidence(85)).toBe(0.85);
  });

  it('clamps invalid confidence values', () => {
    expect(normalizeReviewConfidence(1263)).toBe(1);
    expect(normalizeReviewConfidence(-3)).toBe(0);
    expect(normalizeReviewConfidence(Number.NaN)).toBe(0);
  });
});

describe('mergeTranscriptReviewAttempts', () => {
  it('does not emit confidence above 1', () => {
    const result = mergeTranscriptReviewAttempts([attempt(12.63), attempt(0.8)], []);

    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('uses calibrated reviewer confidence instead of raw low self-scores only', () => {
    const review: TranscriptReviewResult = {
      approved: false,
      confidence: 0,
      issues: [{
        severity: 'blocking',
        fieldPath: 'buildingTranscript',
        message: '建物權狀漏讀',
        evidence: [{ documentId: 'doc-1', page: 1, section: '建物所有權狀', text: '建號02073-000' }],
      }],
      parkingTitleRights: [],
      dispositionKind: 'unit_building_with_land_share_sale',
      userConfirmationRequired: [],
      fieldDecisions: [{
        fieldPath: 'buildingTranscript.description.buildingNumber',
        decision: 'reviewer_double_checked',
        selectedValue: '02073-000',
        parserVotes: [],
        confidence: 0,
        rationale: 'Reviewer 重新檢視文件後確認',
        evidence: [{ documentId: 'doc-1', page: 1, section: '建號', text: '02073-000' }],
      }],
    };

    expect(calibrateReviewConfidence(review)).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps aggregate review confidence useful when one fallback reviewer failed', () => {
    const result = mergeTranscriptReviewAttempts([
      attempt(0.82),
      attempt(0.74),
      attempt(0.7),
    ], ['openai/gpt-5.5: Unexpected end of JSON input']);

    expect(result.confidence).toBeGreaterThan(0.65);
    expect(result.reviewerModels?.map((model) => model.confidence)).toEqual([0.82, 0.8, 0.78]);
    expect(result.userConfirmationRequired).toEqual([
      'Reviewer 失敗：openai/gpt-5.5: Unexpected end of JSON input',
    ]);
  });
});
