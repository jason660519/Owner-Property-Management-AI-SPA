'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Upload } from 'lucide-react';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { KeyValidationResult, SavedKey } from '@/lib/hooks/useAISettings';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import { ImageToImageEvaluationDetailSheet, type ImageToImageRunHistoryEntry } from './ImageToImageEvaluationDetailSheet';
import {
  buildImageModelOptions,
  buildImageToImagePrompt,
  createImageToImageColumns,
  getImageToImageCategoryValue,
  getImageToImageSearchValue,
  IMAGE_TO_IMAGE_INITIAL_WIDTHS,
  IMAGE_TO_IMAGE_MIN_WIDTH_PX,
  IMAGE_TO_IMAGE_TABLE_ID,
  type ImageToImageEvaluationRow,
} from './image-to-image-evaluation-columns';
import { coerceUnsupportedImageToImageRows } from './image-to-image-model-capabilities';
import {
  createCustomImageToImageRow,
  duplicateImageToImageRow,
  fromStoredRows,
  normalizeImageToImageRows,
  pickNextCustomModel,
  rowToStored,
  suggestedBenchmarkRows,
  type StoredImageToImageRow,
} from './image-to-image-row-state';
import { loadSharedFloorPlanFile, saveSharedFloorPlanFile } from './image-to-image-shared-file-store';

type TestModelFn = (
  provider: string,
  modelId: string,
  prompt?: string,
  file?: File | null,
) => Promise<{ success: boolean; message?: string; output?: string; output_image_url?: string }>;

type ImageToImageEvaluationPanelProps = {
  savedKeys: SavedKey[];
  validateAllResultsByKeyId: Record<string, KeyValidationResult>;
  onTestModel: TestModelFn;
};

type RunRowOptions = { openDetail?: boolean };

const LS_IMAGE_TO_IMAGE_ROWS = 'ai-settings:image-to-image:rows';
const LS_IMAGE_TO_IMAGE_BENCHMARK_SEEDED = 'ai-settings:image-to-image:benchmark-v2-seeded';

function createStartedPatch(runStartedAtMs: number): Partial<ImageToImageEvaluationRow> {
  return {
    runStatus: 'running',
    message: '模型評估中...',
    resultText: '',
    resultImageUrl: '',
    resultImage2dUrl: '',
    resultImage3dUrl: '',
    runStartedAtMs,
    e2eMs: null,
    httpStatus: null,
  };
}

async function persistRun(row: ImageToImageEvaluationRow, result: Partial<ImageToImageEvaluationRow>) {
  const response = await fetch('/api/ai-settings/image-to-image-evaluation-runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      rowId: row.id,
      provider: row.providerId,
      modelId: row.modelId,
      style: row.style,
      outputMode: row.outputMode,
      fileName: row.fileName,
      prompt: row.prompt,
      success: result.runStatus === 'done',
      message: result.message ?? '',
      resultText: result.resultText ?? '',
      resultImageUrl: result.resultImageUrl ?? '',
      result2dImageUrl: result.resultImage2dUrl ?? result.resultImageUrl ?? '',
      result3dImageUrl: result.resultImage3dUrl ?? '',
      e2eMs: result.e2eMs == null ? null : Math.round(result.e2eMs),
      httpStatus: result.httpStatus ?? null,
    }),
  });
  if (!response.ok) throw new Error('Failed to save image-to-image run');
  return response.json() as Promise<{ run?: ImageToImageRunHistoryEntry }>;
}

type ImageOutputMode = '2d' | '3d';

function requestedImageModes(outputMode: ImageToImageEvaluationRow['outputMode']): ImageOutputMode[] {
  if (outputMode === '2d') return ['2d'];
  if (outputMode === '3d') return ['3d'];
  return ['2d', '3d'];
}

function promptForImageMode(row: ImageToImageEvaluationRow, mode: ImageOutputMode): string {
  const modeLabel = mode === '2d' ? '2D 彩繪平面圖（正俯視）' : '3D 立體彩繪圖（45 度斜角俯瞰）';
  const basePrompt = row.prompt.trim() || buildImageToImagePrompt(row.style, row.outputMode);
  return [
    basePrompt,
    `本次請只產生：${modeLabel}。`,
    buildImageToImagePrompt(row.style, mode),
  ].join('\n\n');
}

async function runImageOutputs(
  row: ImageToImageEvaluationRow,
  onTestModel: TestModelFn,
): Promise<Partial<ImageToImageEvaluationRow>> {
  const modes = requestedImageModes(row.outputMode);
  const results = await Promise.all(modes.map(async (mode) => ({
    mode,
    result: await onTestModel(row.providerId, row.modelId, promptForImageMode(row, mode), row.file),
  })));

  const result2d = results.find((item) => item.mode === '2d')?.result;
  const result3d = results.find((item) => item.mode === '3d')?.result;
  const resultImage2dUrl = result2d?.output_image_url ?? '';
  const resultImage3dUrl = result3d?.output_image_url ?? '';
  const resultText = results
    .map(({ mode, result }) => `${mode.toUpperCase()}: ${result.output ?? result.message ?? ''}`)
    .filter((text) => text.trim().length > 0)
    .join('\n\n');
  const failedMessage = results.find(({ result }) => result.success !== true)?.result.message;
  const missingImage = results.some(({ result }) => result.success === true && !result.output_image_url);
  const hasAllRequestedImages = modes.every((mode) => (mode === '2d' ? resultImage2dUrl : resultImage3dUrl));
  const success = hasAllRequestedImages && !failedMessage;

  return {
    runStatus: success ? 'done' : 'failed',
    resultText,
    resultImageUrl: resultImage2dUrl || resultImage3dUrl,
    resultImage2dUrl,
    resultImage3dUrl,
    message: success ? '測試完成。' : failedMessage ?? (missingImage ? '未產圖：模型回傳文字但沒有圖片。' : '測試失敗。'),
    httpStatus: success ? 200 : null,
  };
}

export function ImageToImageEvaluationPanel({
  savedKeys,
  validateAllResultsByKeyId,
  onTestModel,
}: ImageToImageEvaluationPanelProps) {
  const sharedFileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ImageToImageEvaluationRow[]>(() => {
    const stored = readLocalStorage<StoredImageToImageRow[]>(LS_IMAGE_TO_IMAGE_ROWS, []);
    return fromStoredRows(stored);
  });
  const [detailRow, setDetailRow] = useState<ImageToImageEvaluationRow | null>(null);
  const [sharedFileName, setSharedFileName] = useState('');
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [historyRuns, setHistoryRuns] = useState<ImageToImageRunHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const modelOptions = useMemo(
    () => buildImageModelOptions(savedKeys, validateAllResultsByKeyId),
    [savedKeys, validateAllResultsByKeyId],
  );

  useEffect(() => {
    setRows((prev) => {
      const next = normalizeImageToImageRows(coerceUnsupportedImageToImageRows(prev, modelOptions));
      const changed = next.some((row, index) => (
        row.providerId !== prev[index]?.providerId || row.modelId !== prev[index]?.modelId
      ));
      return changed ? next : prev;
    });
  }, [modelOptions]);

  useEffect(() => {
    if (readLocalStorage(LS_IMAGE_TO_IMAGE_BENCHMARK_SEEDED, false)) return;
    setRows((prev) => {
      const additions = suggestedBenchmarkRows(prev, modelOptions);
      const providerCount = new Set([...prev, ...additions].map((row) => row.providerId)).size;
      if (additions.length === 0) {
        if (providerCount >= 2) writeLocalStorage(LS_IMAGE_TO_IMAGE_BENCHMARK_SEEDED, true);
        return prev;
      }
      writeLocalStorage(LS_IMAGE_TO_IMAGE_BENCHMARK_SEEDED, true);
      return normalizeImageToImageRows([...prev, ...additions]);
    });
  }, [modelOptions]);

  useEffect(() => {
    writeLocalStorage(LS_IMAGE_TO_IMAGE_ROWS, rows.map(rowToStored));
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    void loadSharedFloorPlanFile()
      .then((file) => {
        if (cancelled || !file) return;
        setSharedFile(file);
        setSharedFileName(file.name);
        setRows((prev) => prev.map((row) => ({
          ...row,
          file,
          fileName: file.name,
          message: row.message || '已從本機記憶還原共用格局圖。',
        })));
      })
      .catch((err) => console.warn('[image-to-image-evaluation] shared floor plan restore failed', err));

    return () => {
      cancelled = true;
    };
  }, []);

  const patchRow = useCallback((rowId: string, patch: Partial<ImageToImageEvaluationRow>) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }, []);

  const uploadFile = useCallback((rowId: string, file: File | null) => {
    patchRow(rowId, { file, fileName: file?.name ?? '' });
  }, [patchRow]);

  const loadHistory = useCallback(async (rowId: string) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/ai-settings/image-to-image-evaluation-runs?rowId=${encodeURIComponent(rowId)}&limit=10`);
      if (!response.ok) throw new Error('Failed to load image-to-image history');
      const payload = await response.json() as { runs?: ImageToImageRunHistoryEntry[] };
      setHistoryRuns(payload.runs ?? []);
    } catch (err) {
      console.warn('[image-to-image-evaluation] history load failed', err);
      setHistoryRuns([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openDetailRow = useCallback((row: ImageToImageEvaluationRow) => {
    setDetailRow(row);
    void loadHistory(row.id);
  }, [loadHistory]);

  const applySharedFile = useCallback((file: File) => {
    setSharedFile(file);
    setSharedFileName(file.name);
    void saveSharedFloorPlanFile(file)
      .catch((err) => console.warn('[image-to-image-evaluation] shared floor plan save failed', err));
    setRows((prev) => prev.map((row) => ({
      ...row,
      file,
      fileName: file.name,
      runStatus: row.runStatus === 'running' ? row.runStatus : 'idle',
      resultText: '',
      resultImageUrl: '',
      resultImage2dUrl: '',
      resultImage3dUrl: '',
      message: '已套用共用格局圖。',
      runStartedAtMs: null,
      e2eMs: null,
      httpStatus: null,
      lastRunAt: null,
    })));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const row = createCustomImageToImageRow(prev.length + 1, pickNextCustomModel(prev, modelOptions));
      if (sharedFile) {
        row.file = sharedFile;
        row.fileName = sharedFile.name;
        row.message = '已套用共用格局圖。';
      }
      return normalizeImageToImageRows([...prev, row]);
    });
  }, [modelOptions, sharedFile]);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (next.length > 0) return normalizeImageToImageRows(next);
      const row = createCustomImageToImageRow(1, pickNextCustomModel(prev, modelOptions));
      if (sharedFile) {
        row.file = sharedFile;
        row.fileName = sharedFile.name;
        row.message = '已套用共用格局圖。';
      }
      return [row];
    });
  }, [modelOptions, sharedFile]);

  const duplicateRow = useCallback((row: ImageToImageEvaluationRow) => {
    setRows((prev) => normalizeImageToImageRows([...prev, duplicateImageToImageRow(row, prev.length + 1)]));
  }, []);

  const runRow = useCallback(async (row: ImageToImageEvaluationRow, options: RunRowOptions = {}) => {
    const shouldOpenDetail = options.openDetail ?? true;
    if (!row.file) {
      const next = { ...row, runStatus: 'failed' as const, message: '請先上傳普通或手繪格局圖。', runStartedAtMs: null };
      patchRow(row.id, next);
      if (shouldOpenDetail) setDetailRow(next);
      return;
    }
    const runStartedAtMs = Date.now();
    const startedRow = { ...row, ...createStartedPatch(runStartedAtMs) };
    patchRow(row.id, startedRow);
    if (shouldOpenDetail) openDetailRow(startedRow);
    const startMs = performance.now();
    try {
      const resultPatch = await runImageOutputs(row, onTestModel);
      const next: Partial<ImageToImageEvaluationRow> = {
        ...resultPatch,
        runStartedAtMs: null,
        e2eMs: performance.now() - startMs,
        lastRunAt: new Date().toISOString(),
      };
      patchRow(row.id, next);
      setDetailRow((current) => current?.id === row.id ? { ...current, ...next } : current);
      void persistRun(row, next)
        .then((payload) => {
          if (payload.run) setHistoryRuns((prev) => [payload.run as ImageToImageRunHistoryEntry, ...prev].slice(0, 10));
        })
        .catch((err) => console.warn('[image-to-image-evaluation] run history save failed', err));
    } catch (err) {
      const next = {
        runStatus: 'failed' as const,
        message: err instanceof Error ? err.message : '測試失敗。',
        runStartedAtMs: null,
        e2eMs: performance.now() - startMs,
        httpStatus: null,
        lastRunAt: new Date().toISOString(),
      };
      patchRow(row.id, next);
      setDetailRow((current) => current?.id === row.id ? { ...current, ...next } : current);
      void persistRun(row, next)
        .then((payload) => {
          if (payload.run) setHistoryRuns((prev) => [payload.run as ImageToImageRunHistoryEntry, ...prev].slice(0, 10));
        })
        .catch((saveErr) => console.warn('[image-to-image-evaluation] run history save failed', saveErr));
    }
  }, [onTestModel, openDetailRow, patchRow]);

  const columns = useMemo(
    () => createImageToImageColumns({
      modelOptions,
      onPatchRow: patchRow,
      onUploadFile: uploadFile,
      onRunRow: (row) => void runRow(row),
      onDeleteRow: deleteRow,
      onDuplicateRow: duplicateRow,
      onOpenDetail: openDetailRow,
    }),
    [deleteRow, duplicateRow, modelOptions, openDetailRow, patchRow, runRow, uploadFile],
  );

  const runAll = useCallback(async () => {
    setDetailRow(null);
    const runnableRows = rows.filter((row) => row.shouldTest && row.file && row.runStatus !== 'running');
    if (runnableRows.length === 0) return;

    const startedAt = Date.now();
    const startedPatch = createStartedPatch(startedAt);
    const runnableIds = new Set(runnableRows.map((row) => row.id));
    setRows((prev) => prev.map((row) => (
      runnableIds.has(row.id) ? { ...row, ...startedPatch } : row
    )));

    const tasks = runnableRows.map(async (row) => {
      const startMs = performance.now();
      try {
        const resultPatch = await runImageOutputs(row, onTestModel);
        const next: Partial<ImageToImageEvaluationRow> = {
          ...resultPatch,
          runStartedAtMs: null,
          e2eMs: performance.now() - startMs,
          lastRunAt: new Date().toISOString(),
        };
        patchRow(row.id, next);
        void persistRun(row, next).catch((err) => console.warn('[image-to-image-evaluation] run history save failed', err));
      } catch (err) {
        const next = {
          runStatus: 'failed' as const,
          message: err instanceof Error ? err.message : '測試失敗。',
          runStartedAtMs: null,
          e2eMs: performance.now() - startMs,
          httpStatus: null,
          lastRunAt: new Date().toISOString(),
        };
        patchRow(row.id, next);
        void persistRun(row, next).catch((saveErr) => console.warn('[image-to-image-evaluation] run history save failed', saveErr));
      }
    });

    await Promise.allSettled(tasks);
  }, [onTestModel, patchRow, rows]);

  const detail = detailRow ? rows.find((row) => row.id === detailRow.id) ?? detailRow : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EnhancedTable<ImageToImageEvaluationRow>
          tableId={IMAGE_TO_IMAGE_TABLE_ID}
          columns={columns}
          data={rows}
          initialWidths={[...IMAGE_TO_IMAGE_INITIAL_WIDTHS]}
          minWidth={IMAGE_TO_IMAGE_MIN_WIDTH_PX}
          stretchToContainer={false}
          fillAvailableHeight
          persistentHorizontalScrollbar
          onAddRow={addRow}
          getSearchValue={getImageToImageSearchValue}
          getCategoryValue={getImageToImageCategoryValue}
          extraToolbar={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => sharedFileInputRef.current?.click()}
                className="inline-flex h-8 max-w-[260px] items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
                title="上傳一次，套用到全部模型列"
              >
                <Upload size={14} aria-hidden />
                <span className="truncate">{sharedFileName || '套用共用格局圖'}</span>
              </button>
              <input
                ref={sharedFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  applySharedFile(file);
                }}
              />
              <button type="button" onClick={() => void runAll()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700">
                <Play size={14} aria-hidden />
                全測
              </button>
            </div>
          }
        />
      </div>

      <ImageToImageEvaluationDetailSheet
        detail={detail}
        historyLoading={historyLoading}
        historyRuns={historyRuns}
        onClose={() => setDetailRow(null)}
      />
    </div>
  );
}
