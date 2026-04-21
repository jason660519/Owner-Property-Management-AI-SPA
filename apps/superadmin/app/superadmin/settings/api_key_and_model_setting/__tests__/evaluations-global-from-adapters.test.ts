import type { AdapterConfigItem } from '@/lib/adapter-config';
import type { AdapterConfigDraftCell, AdapterConfigTableRow } from '../adapter-config-columns';
import { buildEvaluationsGlobalRowsFromAdapterTables } from '../evaluations-global-from-adapters';

const mockItem = (overrides: Partial<AdapterConfigItem>): AdapterConfigItem =>
  ({
    id: 'test-adapter',
    optionValue: 'test',
    optionLabel: 'Test Adapter',
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    fallbackModels: [],
    status: 'active',
    useCases: [],
    cliCommandTemplate: 'claude',
    docsPath: '',
    ...overrides,
  }) as AdapterConfigItem;

function baseDraft(overrides: Partial<AdapterConfigDraftCell> = {}): AdapterConfigDraftCell {
  return {
    promptText: 'Hello',
    selectedPromptId: '',
    testFileName: '',
    testFile: null,
    runStartedAtMs: null,
    runStatus: 'idle',
    logCursor: 0,
    pid: null,
    commandPreview: '',
    renderedOutput:
      'I am Claude Sonnet 4.6. Here is a helpful response with enough characters to pass validation.',
    requestedModel: 'claude-sonnet-4-6',
    effectiveModel: 'claude-sonnet-4-6',
    modelSource: '',
    outputLines: ['meta: ok', 'Real model output line with sufficient length for the test.'],
    runCount: 1,
    ttftMs: 100,
    e2eLatencyMs: 500,
    tokensPerSec: 12.5,
    httpStatus: 200,
    retryCount: 0,
    errorType: '',
    successRateRecent: null,
    ...overrides,
  };
}

function row(item: AdapterConfigItem, draft: AdapterConfigDraftCell): AdapterConfigTableRow {
  return {
    serialNo: 1,
    provider: item.provider,
    item,
    draft,
    commandPreview: '',
  };
}

describe('buildEvaluationsGlobalRowsFromAdapterTables', () => {
  const labels: Record<string, string> = { claude: 'Claude' };

  it('returns empty when nothing passes', () => {
    const item = mockItem({ id: 'a1' });
    const d = baseDraft({ runCount: 0 });
    expect(buildEvaluationsGlobalRowsFromAdapterTables([row(item, d)], [], labels)).toEqual([]);
  });

  it('keeps running rows visible so per-row re-run does not make them disappear', () => {
    const item = mockItem({ id: 'a2' });
    const d = baseDraft({ runStatus: 'running', runCount: 1 });
    const out = buildEvaluationsGlobalRowsFromAdapterTables([row(item, d)], [], labels);
    expect(out).toHaveLength(1);
    expect(out[0]!.runStatus).toBe('running');
    expect(out[0]!.adapterChannel).toBe('cli');
    expect(out[0]!.adapterItemId).toBe('a2');
  });

  it('still excludes never-run rows', () => {
    const item = mockItem({ id: 'a2b' });
    const d = baseDraft({ runStatus: 'idle', runCount: 0 });
    expect(buildEvaluationsGlobalRowsFromAdapterTables([row(item, d)], [], labels)).toEqual([]);
  });

  it('excludes idle rows whose last run did not pass', () => {
    const item = mockItem({ id: 'a2c' });
    const d = baseDraft({
      runStatus: 'idle',
      runCount: 1,
      renderedOutput: '',
      outputLines: [],
      errorType: 'timeout',
    });
    expect(buildEvaluationsGlobalRowsFromAdapterTables([row(item, d)], [], labels)).toEqual([]);
  });

  it('includes CLI pass rows with stable id', () => {
    const item = mockItem({ id: 'gem-x', optionLabel: 'Gemini CLI + X' });
    const d = baseDraft({
      requestedModel: 'gemini-2.5-flash',
      effectiveModel: 'gemini-2.5-flash',
      renderedOutput:
        'I am gemini 2.5 flash model. This response is long enough to satisfy the minimum meaningful output requirement here.',
      outputLines: ['line one with content is definitely long enough'],
    });
    const out = buildEvaluationsGlobalRowsFromAdapterTables([row(item, d)], [], labels);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('cli-adapter-pass-gem-x');
    expect(out[0]!.transport).toBe('local');
    expect(out[0]!.adapterModel).toBe('Gemini CLI + X');
    expect(out[0]!.adapterChannel).toBe('cli');
    expect(out[0]!.adapterItemId).toBe('gem-x');
  });

  it('includes HTTP pass rows separately', () => {
    const item = mockItem({ id: 'http-1' });
    const d = baseDraft();
    const out = buildEvaluationsGlobalRowsFromAdapterTables([], [row(item, d)], labels);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('http-adapter-pass-http-1');
    expect(out[0]!.transport).toBe('internet');
    expect(out[0]!.adapterChannel).toBe('http');
    expect(out[0]!.adapterItemId).toBe('http-1');
  });
});
