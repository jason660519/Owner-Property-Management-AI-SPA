'use client';

import {
  buildImageToImagePrompt,
  createImageToImageBaselineRow,
  type ImageToImageEvaluationRow,
} from './image-to-image-evaluation-columns';

export type StoredImageToImageRow = Omit<ImageToImageEvaluationRow, 'file' | 'shouldTest'> & {
  shouldTest?: boolean;
};
export type ImageToImageModelSelection = { providerId: string; modelId: string };

function newId(prefix = 'custom'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function rowToStored(row: ImageToImageEvaluationRow): StoredImageToImageRow {
  return {
    id: row.id,
    no: row.no,
    isBaseline: row.isBaseline,
    shouldTest: row.shouldTest,
    providerId: row.providerId,
    modelId: row.modelId,
    style: row.style,
    outputMode: row.outputMode,
    prompt: row.prompt,
    fileName: row.fileName,
    runStatus: row.runStatus,
    resultText: row.resultText,
    resultImageUrl: row.resultImageUrl,
    resultImage2dUrl: row.resultImage2dUrl,
    resultImage3dUrl: row.resultImage3dUrl,
    message: row.message,
    runStartedAtMs: row.runStartedAtMs,
    e2eMs: row.e2eMs,
    httpStatus: row.httpStatus,
    lastRunAt: row.lastRunAt,
  };
}

export function fromStoredRows(rows: StoredImageToImageRow[]): ImageToImageEvaluationRow[] {
  const baseline = createImageToImageBaselineRow();
  const merged = rows.length > 0 ? rows : [rowToStored(baseline)];
  return merged.map((row, index) => ({
    ...row,
    no: index + 1,
    isBaseline: row.id === baseline.id ? true : row.isBaseline,
    shouldTest: row.shouldTest ?? true,
    outputMode: 'both',
    prompt: buildImageToImagePrompt(row.style ?? 'modern', 'both'),
    file: null,
    fileName: '',
    runStatus: row.runStatus === 'running' ? 'idle' : row.runStatus,
    runStartedAtMs: null,
    resultImage2dUrl: row.resultImage2dUrl ?? row.resultImageUrl ?? '',
    resultImage3dUrl: row.resultImage3dUrl ?? '',
  }));
}

function selectionPatch(selection?: ImageToImageModelSelection): Partial<ImageToImageEvaluationRow> {
  return selection ? { providerId: selection.providerId, modelId: selection.modelId } : {};
}

export function createCustomImageToImageRow(
  no: number,
  selection?: ImageToImageModelSelection,
): ImageToImageEvaluationRow {
  return {
    ...createImageToImageBaselineRow(),
    ...selectionPatch(selection),
    id: newId(),
    no,
    isBaseline: false,
    shouldTest: true,
    outputMode: 'both',
    prompt: buildImageToImagePrompt('modern', 'both'),
    fileName: '',
    runStatus: 'idle',
    resultText: '',
    resultImageUrl: '',
    resultImage2dUrl: '',
    resultImage3dUrl: '',
    message: '',
    runStartedAtMs: null,
    e2eMs: null,
    httpStatus: null,
    lastRunAt: null,
  };
}

export function duplicateImageToImageRow(row: ImageToImageEvaluationRow, no: number): ImageToImageEvaluationRow {
  return {
    ...row,
    id: newId('copy'),
    no,
    isBaseline: false,
    shouldTest: true,
    file: null,
    fileName: '',
    runStatus: 'idle',
    outputMode: 'both',
    prompt: buildImageToImagePrompt(row.style, 'both'),
  };
}

export function normalizeImageToImageRows(rows: ImageToImageEvaluationRow[]): ImageToImageEvaluationRow[] {
  return rows.map((row, index) => ({ ...row, no: index + 1 }));
}

export function suggestedBenchmarkRows(
  rows: ImageToImageEvaluationRow[],
  modelOptions: ImageToImageModelSelection[],
): ImageToImageEvaluationRow[] {
  const existingProviders = new Set(rows.map((row) => row.providerId));
  return ['openai', 'qwen']
    .map((providerId) => modelOptions.find((option) => option.providerId === providerId))
    .filter((option): option is ImageToImageModelSelection => option != null && !existingProviders.has(option.providerId))
    .map((option, index) => ({
      ...createCustomImageToImageRow(rows.length + index + 1, option),
      id: `benchmark-${option.providerId}-${option.modelId.replace(/[^a-z0-9]+/gi, '-')}`,
      message: '預設跨公司圖生圖評估模型。',
    }));
}

export function pickNextCustomModel(
  rows: ImageToImageEvaluationRow[],
  modelOptions: ImageToImageModelSelection[],
): ImageToImageModelSelection | undefined {
  if (modelOptions.length === 0) return undefined;
  const providerCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.providerId] = (acc[row.providerId] ?? 0) + 1;
    return acc;
  }, {});
  return [...modelOptions].sort((a, b) => {
    const countDelta = (providerCounts[a.providerId] ?? 0) - (providerCounts[b.providerId] ?? 0);
    if (countDelta !== 0) return countDelta;
    return modelOptions.indexOf(a) - modelOptions.indexOf(b);
  })[0];
}
