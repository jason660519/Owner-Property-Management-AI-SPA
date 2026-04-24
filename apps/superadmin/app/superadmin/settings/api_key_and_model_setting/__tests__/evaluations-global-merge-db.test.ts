import { mergeEvaluationsGlobalDbHistory } from '../evaluations-global-merge-db';
import type { EvaluationsGlobalTableRow } from '../evaluations-global-columns';

function baseRow(over: Partial<EvaluationsGlobalTableRow>): EvaluationsGlobalTableRow {
  return {
    id: 'cli-adapter-pass-x',
    no: 1,
    companyName: 'Anthropic',
    invocationPath: 'cli',
    executionPlane: 'vendor_saas',
    adapterModel: 'Test',
    adapterChannel: 'cli',
    adapterItemId: 'claude-opus-4-7',
    testPrompt: '',
    testFileNames: [],
    runStatus: 'idle',
    requestedModel: 'm',
    effectiveModel: 'm',
    outputLines: [],
    rawOutput: '',
    renderedOutput: '',
    evaluation: '',
    ttftMs: null,
    e2eMs: null,
    throughputTokensPerSec: null,
    httpStatus: null,
    historyLastSummary: 'local',
    historyLastAt: null,
    historyLogUrl: null,
    historyTotalRuns: 1,
    historyEntries: [],
    ...over,
  };
}

describe('mergeEvaluationsGlobalDbHistory', () => {
  it('returns rows unchanged when summaries empty', () => {
    const rows = [baseRow({})];
    expect(mergeEvaluationsGlobalDbHistory(rows, null)).toBe(rows);
    expect(mergeEvaluationsGlobalDbHistory(rows, [])).toBe(rows);
  });

  it('merges counts and recent entries by adapter id + channel', () => {
    const rows = [
      baseRow({
        adapterItemId: 'a1',
        adapterChannel: 'cli',
        historyLastSummary: 'draft',
        historyTotalRuns: 2,
      }),
    ];
    const out = mergeEvaluationsGlobalDbHistory(rows, [
      {
        adapterId: 'a1',
        channel: 'cli',
        totalRuns: 9,
        lastAt: '2026-04-21T12:00:00.000Z',
        lastSummary: 'db last',
        recentEntries: [
          {
            at: '2026-04-21T12:00:00.000Z',
            resultSummary: 'db last',
            httpStatus: 200,
            evaluationLevel: 'pass',
          },
        ],
      },
    ]);
    expect(out[0].historyTotalRuns).toBe(9);
    expect(out[0].historyLastAt).toBe('2026-04-21T12:00:00.000Z');
    expect(out[0].historyLastSummary).toBe('db last');
    expect(out[0].historyEntries).toHaveLength(1);
    expect(out[0].historyEntries[0].evaluationLevel).toBe('pass');
  });
});
