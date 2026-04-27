interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

interface TestDocumentRow {
  id: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  mime_type?: string;
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
let ocrRows: Array<Record<string, unknown>> = [];
let parseOutcome: { kind: 'complete' } | { kind: 'aborted' } | { kind: 'error'; message: string } = {
  kind: 'complete',
};
let parseResultOverride: unknown = null;
let detectShouldFail = false;
let reviewShouldFail = false;
let detailShouldFail = false;

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

const reviewAiSpy = jest.fn(async (input?: unknown) => {
  if (reviewShouldFail) throw new Error('review failed');
  const rec = input && typeof input === 'object' ? input as { onModelEvent?: (event: Record<string, unknown>) => void } : {};
  rec.onModelEvent?.({
    type: 'model_start',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
  });
  rec.onModelEvent?.({
    type: 'model_result',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    success: true,
    duration_ms: 23450,
  });
  return {
    approved: true,
    confidence: 0.8,
    issues: [],
    parkingTitleRights: [],
    dispositionKind: 'unit_building_with_land_share_sale',
    userConfirmationRequired: ['請確認 AI review 結果'],
  };
});

const detailAiSpy = jest.fn(async (_input?: unknown) => {
  if (detailShouldFail) throw new Error('detail failed');
  return {
    areaDetailDraft: {
      version: 1,
      dispositionKind: 'unit_building_with_land_share_sale',
      parkingTitleRights: [],
      buildingAreas: [{
        id: 'building-doc-1',
        sourceDocumentId: 'doc-1',
        sourceDocumentName: '建物謄本',
        label: '主建物',
        identifier: '001建號',
        areaSqm: '88.5',
        shareRatio: '全部',
        use: '住家用',
        evidenceText: '001建號 / 88.5',
        confidence: 0.9,
      }],
      landShareAreas: [],
      parkingBuildingAreas: [],
      parkingLandShareAreas: [],
    },
    summary: ['建物明細 1 列'],
    warnings: [],
    userConfirmationRequired: [],
    confidence: 0.9,
  };
});

jest.mock('@/lib/transcript-parse/intake-ai', () => ({
  resolveTranscriptIntakeAiStageInfo: async (_admin: unknown, _userId: string, stage: 'detect' | 'review' | 'detail_builder') => (
    stage === 'detect'
      ? {
          agentKey: 'transcript_detection',
          moduleKey: 'transcript.intake.detect',
          provider: 'openai',
          model: 'gpt-4.1',
          promptSource: 'ai_system_prompt',
        }
      : stage === 'detail_builder'
        ? {
            agentKey: 'transcript_detail_builder',
            moduleKey: 'transcript.intake.detail_builder',
            provider: 'gemini',
            model: 'gemini-3.1-pro-preview',
            promptSource: 'ai_system_prompt',
          }
      : {
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          promptSource: 'ai_system_prompt',
        }
  ),
  runTranscriptIntakeDetectionAi: (input: unknown) => detectAiSpy(input),
  runTranscriptIntakeReviewAi: (input: unknown) => reviewAiSpy(input),
  runTranscriptIntakeDetailBuilderAi: (input: unknown) => detailAiSpy(input),
}));

jest.mock('@/lib/transcript-parse/run-transcript-parse-core', () => ({
  resolveAssignedModels: jest.fn(async () => ({
    models: [{ provider: 'anthropic', model: 'claude-opus-4-20250514', priority: 1 }],
    guardrails: null,
  })),
  runTranscriptParseCore: jest.fn(async () => {
    if (parseOutcome.kind === 'complete') {
      documents = documents.map((doc) => ({
        ...doc,
        parsed_result: parseResultOverride ?? {
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
          if (table === 'property_documents' && typeof payload.document_type === 'string') {
            documents = documents.map((doc) => (
              doc.document_type === 'registry_transcript_unclassified'
                ? { ...doc, document_type: payload.document_type as string }
                : doc
            ));
          }
          if (table === 'property_documents' && payload.parsed_result) {
            documents = documents.map((doc) => ({
              ...doc,
              parsed_result: payload.parsed_result,
              consensus_metadata: payload.consensus_metadata ?? null,
            }));
          }
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
          in: async () => ({ data: table === 'ocr_parse_results' ? ocrRows : documents, error: null }),
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
    storage: {
      from: () => ({
        download: async () => ({
          data: {
            arrayBuffer: async () => Buffer.from(
              '建物登記第二類謄本\n建物標示部\n大安區大安段一小段 02058-000建號\n建物門牌：敦化南路二段28號十樓之一\n主要用途：住家用\n總面積：113.86平方公尺\n層次面積：113.86平方公尺\n所有權人：王小明\n權利範圍：全部1分之1',
              'utf8',
            ),
          },
          error: null,
        }),
      }),
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
  ocrRows = [];
  parseOutcome = { kind: 'complete' };
  parseResultOverride = null;
  detectShouldFail = false;
  reviewShouldFail = false;
  detailShouldFail = false;
  jest.clearAllMocks();
});

describe('processTranscriptIntakeRunById', () => {
  it('claims, parses, reviews, and marks the run as needing user confirmation', async () => {
    ocrRows = [{
      property_document_id: 'doc-1',
      provider: 'anthropic',
      model_id: 'claude-opus-4-20250514',
      role: 'parser',
      raw_output: {
        kind: 'building',
        buildingTranscript: {
          description: {
            buildingNumber: '001建號',
            doorAddress: '敦化南路二段28號十樓之一',
            totalArea: '88.5',
            mainUse: '住家用',
          },
          ownership: [{ ownerName: '王小明' }],
        },
        landTranscript: { description: {}, ownership: [] },
      },
      parse_duration_ms: 12345,
      error_message: null,
      created_at: new Date().toISOString(),
    }];

    await processTranscriptIntakeRunById('run-1');

    expect(runTranscriptParseCore).toHaveBeenCalledWith(
      expect.anything(),
      { documentId: 'doc-1', userId: 'admin-1' },
      expect.objectContaining({ onEvent: expect.any(Function) }),
    );
    expect(detectAiSpy).toHaveBeenCalledTimes(1);
    expect(reviewAiSpy).toHaveBeenCalledTimes(1);
    expect(detailAiSpy).toHaveBeenCalledTimes(1);
    expect(reviewAiSpy).toHaveBeenCalledWith(expect.objectContaining({
      parsedResult: expect.objectContaining({
        parserReports: [
          expect.objectContaining({
            provider: 'anthropic',
            model: 'claude-opus-4-20250514',
            markdown: expect.stringContaining('## 這個 parser 看到的東西'),
            observations: expect.arrayContaining([
              expect.stringContaining('看到建號：001建號'),
            ]),
          }),
        ],
      }),
    }));
    expect(updates.some((u) => u.payload.status === 'detecting')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'parsing')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'reviewing')).toBe(true);
    expect(updates.some((u) => u.payload.status === 'needs_user_confirmation')).toBe(true);
    const parsingUpdate = updates.find((u) => u.payload.status === 'parsing');
    expect(parsingUpdate?.payload.parsed_result).toMatchObject({
      aiStageTrace: expect.arrayContaining([
        expect.objectContaining({
          stage: 'parse',
          models: [expect.objectContaining({ provider: 'anthropic', model: 'claude-opus-4-20250514' })],
        }),
      ]),
    });
    const reviewingUpdate = updates.find((u) => u.payload.status === 'reviewing');
    expect(reviewingUpdate?.payload.parsed_result).toMatchObject({
      aiStageTrace: expect.arrayContaining([
        expect.objectContaining({
          stage: 'verify_review',
          models: [expect.objectContaining({ provider: 'anthropic', model: 'claude-sonnet-4-5' })],
        }),
      ]),
    });
    expect(updates.some((u) => String(JSON.stringify(u.payload.parsed_result) ?? '').includes('"durationMs":23450')))
      .toBe(true);
    const finalUpdate = updates.find((u) => u.payload.status === 'needs_user_confirmation');
    expect(finalUpdate?.payload.parsed_result).toMatchObject({
      aiStageTrace: [
        expect.objectContaining({
          stage: 'detect',
          durationMs: expect.any(Number),
          models: [expect.objectContaining({ provider: 'openai', model: 'gpt-4.1' })],
        }),
        expect.objectContaining({
          stage: 'parse',
          durationMs: expect.any(Number),
          models: [expect.objectContaining({ provider: 'anthropic', model: 'claude-opus-4-20250514', reportUrl: expect.stringContaining('/api/transcript-intake/runs/run-1/ai-reports') })],
        }),
        expect.objectContaining({
          stage: 'verify_review',
          durationMs: expect.any(Number),
          models: [expect.objectContaining({ provider: 'anthropic', model: 'claude-sonnet-4-5', reportUrl: expect.stringContaining('/api/transcript-intake/runs/run-1/ai-reports') })],
        }),
        expect.objectContaining({
          stage: 'detail_builder',
          durationMs: expect.any(Number),
          models: [expect.objectContaining({ provider: 'gemini', model: 'gemini-3.1-pro-preview', reportUrl: expect.stringContaining('/api/transcript-intake/runs/run-1/ai-reports') })],
        }),
      ],
      parserReports: [
        expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-opus-4-20250514',
          markdown: expect.stringContaining('# Parse 解析成果報告'),
        }),
      ],
      areaDetailDraft: expect.objectContaining({
        buildingAreas: [expect.objectContaining({ identifier: '001建號' })],
      }),
    });
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
    expect(finalUpdate?.payload.parsed_result).toMatchObject({
      aiStageTrace: expect.arrayContaining([
        expect.objectContaining({ stage: 'detect', status: 'fallback' }),
        expect.objectContaining({ stage: 'verify_review', status: 'fallback' }),
      ]),
    });
  });

  it('marks the run failed when parse core returns an error', async () => {
    parseOutcome = { kind: 'error', message: 'parse failed' };
    ocrRows = [{
      property_document_id: 'doc-1',
      provider: 'gemini',
      model_id: 'gemini-3.1-pro-preview',
      role: 'parser',
      parse_duration_ms: 12345,
      error_message: 'bad json',
      created_at: new Date().toISOString(),
    }];

    await processTranscriptIntakeRunById('run-1');

    expect(updates.some((u) => u.payload.status === 'failed' && u.payload.error_message === 'parse failed'))
      .toBe(true);
    expect(updates.some((u) => String(JSON.stringify(u.payload.parsed_result) ?? '').includes('bad json')))
      .toBe(true);
    expect(updates.some((u) => String(JSON.stringify(u.payload.parsed_result) ?? '').includes('/api/transcript-intake/runs/run-1/ai-reports')))
      .toBe(true);
  });

  it('classifies unclassified transcripts after parse returns a concrete kind', async () => {
    documents = [
      {
        id: 'doc-1',
        document_type: 'registry_transcript_unclassified',
        document_name: '待判讀謄本',
        parsed_result: null,
        consensus_metadata: null,
      },
    ];

    await processTranscriptIntakeRunById('run-1');

    expect(updates).toContainEqual({
      table: 'property_documents',
      payload: { document_type: 'building_registry_transcript' },
    });
    const finalUpdate = updates.find((u) => u.payload.status === 'needs_user_confirmation');
    expect(finalUpdate?.payload.parsed_result).toMatchObject({
      documents: [
        expect.objectContaining({
          documentType: 'building_registry_transcript',
        }),
      ],
    });
  });

  it('keeps mixed building and land title copies unclassified after parsing', async () => {
    documents = [
      {
        id: 'doc-1',
        document_type: 'registry_transcript_unclassified',
        document_name: '建物+土地權狀影本',
        parsed_result: null,
        consensus_metadata: null,
      },
    ];
    parseResultOverride = {
      kind: 'land',
      buildingTranscript: {
        header: {},
        description: { buildingNumber: '001建號', totalArea: '88.5', mainBuildings: [] },
        ownership: [],
        encumbrances: [],
      },
      landTranscript: {
        header: {},
        description: { landNumber: '100地號', area: '220' },
        ownership: [],
        encumbrances: [],
      },
    };

    await processTranscriptIntakeRunById('run-1');

    expect(updates).not.toContainEqual({
      table: 'property_documents',
      payload: { document_type: 'land_registry_transcript' },
    });
    const finalUpdate = updates.find((u) => u.payload.status === 'needs_user_confirmation');
    expect(finalUpdate?.payload.parsed_result).toMatchObject({
      documents: [
        expect.objectContaining({
          documentType: 'registry_transcript_unclassified',
        }),
      ],
    });
  });

  it('uses local text parsing for local_python_text route before falling back to VLM core', async () => {
    claimedRun = {
      ...claimedRun,
      route_decision: {
        aggregateRoute: 'local_python_text',
        documents: [{ documentId: 'doc-1', route: 'local_python_text' }],
      },
    };
    documents = [
      {
        id: 'doc-1',
        document_type: 'registry_transcript_unclassified',
        document_name: '待判讀謄本',
        file_path: 'property-1/transcript.txt',
        mime_type: 'text/plain',
        parsed_result: null,
        consensus_metadata: null,
      },
    ];

    await processTranscriptIntakeRunById('run-1');

    expect(runTranscriptParseCore).not.toHaveBeenCalled();
    expect(updates).toContainEqual({
      table: 'property_documents',
      payload: expect.objectContaining({
        parse_strategy: 'single',
        vlm_provider: 'local_python_text',
      }),
    });
    expect(updates).toContainEqual({
      table: 'property_documents',
      payload: { document_type: 'building_registry_transcript' },
    });
    const finalUpdate = updates.find((u) => u.payload.status === 'needs_user_confirmation');
    expect(finalUpdate?.payload.parsed_result).toMatchObject({
      parseOutcomes: [
        expect.objectContaining({ kind: 'local_python_text' }),
      ],
    });
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
