interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

interface TestDocumentRow {
  id: string;
  document_type: string;
  document_name: string;
  parsed_result: unknown;
  consensus_metadata: unknown;
}

const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
let claimedRun: Record<string, unknown> | null = {
  id: 'run-1',
  requested_by_user_id: 'admin-1',
  source_document_ids: ['doc-1'],
  route_decision: { aggregateRoute: 'vlm_visual' },
};
let documents: TestDocumentRow[] = [
  {
    id: 'doc-1',
    document_type: 'building_registry_transcript',
    document_name: '建物謄本',
    parsed_result: null,
    consensus_metadata: null,
  },
];
let parseOutcome: { kind: 'complete' } | { kind: 'aborted' } | { kind: 'error'; message: string } = {
  kind: 'complete',
};
let detectShouldFail = false;
let reviewShouldFail = false;

const detectAiSpy = jest.fn(async (_input?: unknown) => {
  if (detectShouldFail) throw new Error('detect failed');
  return {
    dispositionKind: 'unit_building_with_land_share_sale',
    documentKinds: ['building_transcript'],
    parkingTitleRights: [],
    hasBuildingTranscript: true,
    hasLandTranscript: false,
    hasParkingEvidence: false,
    buildingOwnershipLikelyFull: null,
    landOwnershipLikelyFull: null,
    buildingNumberCount: null,
    landParcelCount: null,
    riskFlags: [],
    evidence: [],
  };
});

const reviewAiSpy = jest.fn(async (_input?: unknown) => {
  if (reviewShouldFail) throw new Error('review failed');
  return {
    approved: true,
    confidence: 0.8,
    issues: [],
    parkingTitleRights: [],
    dispositionKind: 'unit_building_with_land_share_sale',
    userConfirmationRequired: ['請確認 AI review 結果'],
  };
});

jest.mock('@/lib/transcript-parse/intake-ai', () => ({
  runTranscriptIntakeDetectionAi: (input: unknown) => detectAiSpy(input),
  runTranscriptIntakeReviewAi: (input: unknown) => reviewAiSpy(input),
}));

jest.mock('@/lib/transcript-parse/run-transcript-parse-core', () => ({
  runTranscriptParseCore: jest.fn(async () => {
    if (parseOutcome.kind === 'complete') {
      documents = documents.map((doc) => ({
        ...doc,
        parsed_result: {
          kind: 'building',
          buildingTranscript: { header: {}, description: {}, ownership: [], encumbrances: [] },
          landTranscript: { header: {}, description: {}, ownership: [], encumbrances: [] },
        },
        consensus_metadata: { strategy: 'single' },
      }));
    }
    return parseOutcome;
  }),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const builder = {
        update: (payload: Record<string, unknown>) => {
          updates.push({ table, payload });
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async (): Promise<QueryResult> => ({
                    data: claimedRun,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        },
        select: () => ({
          in: async () => ({ data: documents, error: null }),
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: { id: 'run-1' }, error: null }),
              }),
            }),
          }),
        }),
      };
      return builder;
    },
  }),
}));

import {
  peekOldestRouteSelectedTranscriptIntakeRunId,
  processTranscriptIntakeRunById,
} from '../process-transcript-intake-run';
import { runTranscriptParseCore } from '../run-transcript-parse-core';

beforeEach(() => {
  updates.length = 0;
  claimedRun = {
    id: 'run-1',
    requested_by_user_id: 'admin-1',
    source_document_ids: ['doc-1'],
    route_decision: { aggregateRoute: 'vlm_visual' },
  };
  documents = [
    {
      id: 'doc-1',
      document_type: 'building_registry_transcript',
      document_name: '建物謄本',
      parsed_result: null,
      consensus_metadata: null,
    },
  ];
  parseOutcome = { kind: 'complete' };
  detectShouldFail = false;
  reviewShouldFail = false;
  jest.clearAllMocks();
});

describe('processTranscriptIntakeRunById', () => {
  it('claims, parses, reviews, and marks the run as needing user confirmation', async () => {
    await processTranscriptIntakeRunById('run-1');

    expect(runTranscriptParseCore).toHaveBeenCalledWith(
      expect.anything(),
      { documentId: 'doc-1', userId: 'admin-1' },
      expect.objectContaining({ onEvent: expect.any(Function) }),
    );
    expect(detectAiSpy).toHaveBeenCalledTimes(1);
    expect(reviewAiSpy).toHaveBeenCalledTimes(1);
    expect(updates.some((u) => u.payload.status === 'detecting')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'parsing')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'reviewing')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'needs_user_confirmation')).toBe(true);
  });

  it('falls back to seeded detect and review when AI stages fail', async () => {
    detectShouldFail = true;
    reviewShouldFail = true;

    await processTranscriptIntakeRunById('run-1');

    const detectionUpdate = updates.find((u) => u.payload.detection_result);
    const finalUpdate = updates.find((u) => u.payload.status === 'needs_user_confirmation');
    expect(detectionUpdate?.payload.detection_result).toMatchObject({
      riskFlags: expect.arrayContaining([expect.stringContaining('AI detect failed')]),
    });
    expect(finalUpdate?.payload.review_result).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ fieldPath: 'review.ai' }),
      ]),
    });
  });

  it('marks the run failed when parse core returns an error', async () => {
    parseOutcome = { kind: 'error', message: 'parse failed' };

    await processTranscriptIntakeRunById('run-1');

    expect(updates.some((u) => u.payload.status === 'failed' && u.payload.error_message === 'parse failed'))
      .toBe(true);
  });

  it('does nothing when the run cannot be claimed', async () => {
    claimedRun = null;

    await processTranscriptIntakeRunById('run-1');

    expect(runTranscriptParseCore).not.toHaveBeenCalled();
  });
});

describe('peekOldestRouteSelectedTranscriptIntakeRunId', () => {
  it('returns the oldest route-selected run id', async () => {
    await expect(peekOldestRouteSelectedTranscriptIntakeRunId()).resolves.toBe('run-1');
  });
});
