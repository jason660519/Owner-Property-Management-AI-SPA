import { DEFAULT_ADAPTER_TEST_PROMPT } from '@/lib/adapter-config';
import {
  defaultInvocationPathForTool,
  isValidInvocationPath,
  OLLAMA_CLOUD_MODELS,
  TOOL_CONFIGS,
  type CodingTool,
  type InvocationPath,
} from './cli-eval-tool-config';

export type CliCapabilityRunStatus = 'idle' | 'running' | 'done' | 'failed';

export type CliCapabilityRow = {
  id: string;
  no: number;
  isBaseline: boolean;
  shouldTest: boolean;
  /** Which coding-tool wrapper to invoke (claude / codex / opencode / copilot). */
  codingTool: CodingTool;
  /** Which launch path should execute the coding-tool wrapper. */
  invocationPath: InvocationPath;
  /** Which ollama-cloud model the wrapper should be pointed at. */
  ollamaModel: string;
  prompt: string;
  runStatus: CliCapabilityRunStatus;
  resultText: string;
  rawLogs: string[];
  message: string;
  command: string;
  effectiveModel: string;
  modelSource: string;
  runStartedAtMs: number | null;
  e2eMs: number | null;
  ttftMs: number | null;
  tokensPerSec: number | null;
  exitStatus: number | null;
  errorType: string;
  lastRunAt: string | null;
};

export type StoredCliCapabilityRow = Omit<CliCapabilityRow, 'rawLogs'> & {
  rawLogs?: string[];
};

const BASELINE_TOOLS: ReadonlyArray<CodingTool> = ['claude', 'codex', 'opencode', 'copilot'];

function newId(prefix = 'cli-row'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultModelForBaseline(index: number): string {
  if (OLLAMA_CLOUD_MODELS.length === 0) return '';
  return OLLAMA_CLOUD_MODELS[index % OLLAMA_CLOUD_MODELS.length];
}

function emptyRunFields(): Pick<
  CliCapabilityRow,
  | 'runStatus'
  | 'resultText'
  | 'rawLogs'
  | 'message'
  | 'command'
  | 'effectiveModel'
  | 'modelSource'
  | 'runStartedAtMs'
  | 'e2eMs'
  | 'ttftMs'
  | 'tokensPerSec'
  | 'exitStatus'
  | 'errorType'
  | 'lastRunAt'
> {
  return {
    runStatus: 'idle',
    resultText: '',
    rawLogs: [],
    message: '',
    command: '',
    effectiveModel: '',
    modelSource: '',
    runStartedAtMs: null,
    e2eMs: null,
    ttftMs: null,
    tokensPerSec: null,
    exitStatus: null,
    errorType: '',
    lastRunAt: null,
  };
}

export function createCliCapabilityBaselineRow(
  codingTool: CodingTool,
  no: number,
  ollamaModel?: string,
): CliCapabilityRow {
  return {
    id: `baseline-${codingTool}`,
    no,
    isBaseline: true,
    shouldTest: true,
    codingTool,
    invocationPath: defaultInvocationPathForTool(codingTool),
    ollamaModel: ollamaModel ?? defaultModelForBaseline(no - 1),
    prompt: DEFAULT_ADAPTER_TEST_PROMPT,
    ...emptyRunFields(),
  };
}

export function createCustomCliCapabilityRow(
  no: number,
  init?: { codingTool?: CodingTool; invocationPath?: InvocationPath; ollamaModel?: string },
): CliCapabilityRow {
  const codingTool = init?.codingTool ?? TOOL_CONFIGS[0]?.id ?? 'claude';
  return {
    id: newId(),
    no,
    isBaseline: false,
    shouldTest: true,
    codingTool,
    invocationPath: init?.invocationPath ?? defaultInvocationPathForTool(codingTool),
    ollamaModel: init?.ollamaModel ?? defaultModelForBaseline(no - 1),
    prompt: DEFAULT_ADAPTER_TEST_PROMPT,
    ...emptyRunFields(),
  };
}

export function duplicateCliCapabilityRow(row: CliCapabilityRow, no: number): CliCapabilityRow {
  return {
    ...row,
    id: newId('copy'),
    no,
    isBaseline: false,
    shouldTest: true,
    ...emptyRunFields(),
  };
}

export function rowToStored(row: CliCapabilityRow): StoredCliCapabilityRow {
  // Drop transient logs from local-storage snapshot to keep payload small.
  const { rawLogs: _rawLogs, ...rest } = row;
  void _rawLogs;
  return { ...rest };
}

function isValidCodingTool(value: unknown): value is CodingTool {
  return typeof value === 'string' && TOOL_CONFIGS.some((tool) => tool.id === value);
}

export function fromStoredRows(stored: StoredCliCapabilityRow[]): CliCapabilityRow[] {
  if (stored.length === 0) {
    return BASELINE_TOOLS.map((codingTool, index) =>
      createCliCapabilityBaselineRow(codingTool, index + 1));
  }
  return stored.map((row, index) => {
    const codingTool: CodingTool = isValidCodingTool(row.codingTool) ? row.codingTool : 'claude';
    const invocationPath = isValidInvocationPath(row.invocationPath)
      ? row.invocationPath
      : defaultInvocationPathForTool(codingTool);
    const ollamaModel = row.ollamaModel || defaultModelForBaseline(index);
    return {
      ...row,
      no: index + 1,
      codingTool,
      invocationPath,
      ollamaModel,
      isBaseline: row.id?.startsWith('baseline-') ?? false,
      shouldTest: row.shouldTest ?? true,
      prompt: row.prompt || DEFAULT_ADAPTER_TEST_PROMPT,
      // Reset transient state so a refreshed page never shows a phantom "running" row.
      runStatus: row.runStatus === 'running' ? 'idle' : row.runStatus,
      runStartedAtMs: null,
      rawLogs: [],
    };
  });
}

export function normalizeCliCapabilityRows(rows: CliCapabilityRow[]): CliCapabilityRow[] {
  return rows.map((row, index) => ({ ...row, no: index + 1 }));
}

export function isCliCapabilityConfigLocked(row: CliCapabilityRow): boolean {
  return row.isBaseline || row.runStatus === 'done' || row.runStatus === 'running';
}
