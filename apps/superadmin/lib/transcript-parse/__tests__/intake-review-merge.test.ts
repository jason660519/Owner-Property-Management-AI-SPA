import {
  mergeTranscriptReviewAttempts,
  normalizeReviewConfidence,
  type TranscriptReviewAttempt,
} from '@/lib/transcript-parse/intake-review-merge';

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
});
