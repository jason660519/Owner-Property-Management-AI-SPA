'use client';

import React, { useEffect, useState } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Copy, Eye, Loader2, Play } from 'lucide-react';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { KeyValidationResult, SavedKey } from '@/lib/hooks/useAISettings';
import { getModelDisplayName } from '@/components/ai-settings/model-evaluator/utils';
import { getAvailableModelsList, type KeyWithId } from '@/lib/utils/total-available-models';
import {
  imageToImageDefaultModelsForActiveProviders,
  imageToImageModelDisplayName,
  isImageToImageCapableModel,
} from './image-to-image-model-capabilities';
import { ImageToImageRawOutputCell } from './ImageToImageRawOutputCell';
import { ImageToImageFloorPlanInputCell } from './ImageToImageFloorPlanInputCell';
import { ImageToImageRowActionsCell } from './ImageToImageRowActionsCell';
import { ImageToImageRequestedEffectiveCell } from './ImageToImageRequestedEffectiveCell';
import { ImageToImageShouldTestCell } from './ImageToImageShouldTestCell';
import { ImageToImageRenderedImageCell } from './ImageToImageRenderedImageCell';

export const IMAGE_TO_IMAGE_TABLE_ID = 'ai-settings-image-to-image-evaluation-v1';
export const IMAGE_TO_IMAGE_INITIAL_WIDTHS = [
  3, 4, 5, 6, 4, 4, 8, 4, 4, 7, 12, 5, 8, 9, 9, 9, 5, 3, 3, 3, 2, 1,
] as const;
export const IMAGE_TO_IMAGE_MIN_WIDTH_PX = 4850;
export const GEMINI_BANANA_PROVIDER = 'gemini';
export const GEMINI_BANANA_MODEL = 'gemini-3.1-flash-image-preview';

export type ImageToImageStyle = 'modern' | 'nordic' | 'japanese' | 'luxury' | 'rental' | 'minimal';
export type ImageToImageOutputMode = '2d' | '3d' | 'both';
export type ImageToImageRunStatus = 'idle' | 'running' | 'done' | 'failed';

export type ImageModelOption = {
  key: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  canLikelyGenerateImage: boolean;
};

export type ImageToImageEvaluationRow = {
  id: string;
  no: number;
  isBaseline: boolean;
  shouldTest: boolean;
  providerId: string;
  modelId: string;
  style: ImageToImageStyle;
  outputMode: ImageToImageOutputMode;
  prompt: string;
  file: File | null;
  fileName: string;
  runStatus: ImageToImageRunStatus;
  resultText: string;
  resultImageUrl: string;
  resultImage2dUrl: string;
  resultImage3dUrl: string;
  message: string;
  runStartedAtMs: number | null;
  e2eMs: number | null;
  httpStatus: number | null;
  lastRunAt: string | null;
};

export const STYLE_OPTIONS: Array<{ id: ImageToImageStyle; label: string; prompt: string }> = [
  { id: 'modern', label: '現代清爽', prompt: '現代清爽住宅風格，明亮中性色、俐落線條、低彩度家具、清楚的空間分區。' },
  { id: 'nordic', label: '北歐溫潤', prompt: '北歐溫潤風格，淺木色、白牆、柔和採光、簡潔家具配置，呈現舒適可居住感。' },
  { id: 'japanese', label: '日式無印', prompt: '日式無印風格，木質地板、收納感、低飽和配色、簡潔生活動線。' },
  { id: 'luxury', label: '高質感豪宅', prompt: '高質感住宅提案，石材、金屬細節、深淺對比、精緻燈光與高端室內設計感。' },
  { id: 'rental', label: '租屋廣告', prompt: '租屋廣告友善風格，空間清楚、色彩容易辨識、家具配置實用，讓承租人快速理解格局。' },
  { id: 'minimal', label: '簡約彩繪', prompt: '簡約彩繪格局圖風格，使用清楚色塊標示每個空間，保留牆線、門窗與房間名稱。' },
];

export const OUTPUT_MODE_OPTIONS: Array<{ id: ImageToImageOutputMode; label: string; prompt: string }> = [
  { id: '2d', label: '2D 彩繪平面圖', prompt: '輸出 2D 彩繪平面圖，正俯視（top-down / 90 度垂直俯視）視角，保留原始牆線比例，清楚標註客廳、臥室、廚房、衛浴、陽台與走道。' },
  { id: '3d', label: '3D 立體彩繪圖', prompt: '輸出 3D 立體彩繪圖，採用 45 度斜角俯瞰視角（isometric / 三點透視，從房屋右前上方俯瞰），清楚呈現牆面厚度、家具高度、地板與屋頂層次，營造可看見家具立面與空間深度的立體感；不得改變原始格局邊界與房間配置。' },
  { id: 'both', label: '2D + 3D 同時評估', prompt: '同時產出兩張圖：(1) 2D 彩繪平面圖，正俯視 90 度垂直俯視視角；(2) 3D 立體彩繪圖，45 度斜角俯瞰視角（isometric / 從右前上方俯瞰），需展現家具立面、牆面厚度與空間深度立體感。若模型只能回一張圖，優先產出 3D 立體彩繪圖（45 度斜角），並用文字說明 2D 平面配置。' },
];

export function buildImageToImagePrompt(style: ImageToImageStyle, outputMode: ImageToImageOutputMode): string {
  const styleText = STYLE_OPTIONS.find((s) => s.id === style)?.prompt ?? STYLE_OPTIONS[0].prompt;
  const outputText = OUTPUT_MODE_OPTIONS.find((m) => m.id === outputMode)?.prompt ?? OUTPUT_MODE_OPTIONS[0].prompt;
  return [
    '你是房地產格局圖轉換與室內設計視覺化助理。',
    '請根據使用者上傳的普通格局圖、掃描格局圖或手繪格局圖，理解牆線、門窗、房間用途與主要動線，再生成可供房產展示或室內設計討論的參考圖。',
    `風格要求：${styleText}`,
    `輸出要求：${outputText}`,
    '硬性限制：不要憑空新增不存在的房間；若原圖資訊不足，請明確列出不確定處；保留入口、濕區、主要隔間與大致比例；輸出是參考圖，不是施工圖。',
  ].join('\n\n');
}

export function buildImageModelOptions(
  savedKeys: SavedKey[],
  validateAllResultsByKeyId: Record<string, KeyValidationResult>,
): ImageModelOption[] {
  const activeKeys: KeyWithId[] = savedKeys.filter((key) => key.is_active).map((key) => ({ id: key.id, provider: key.provider }));
  const activeProviders = new Set(activeKeys.map((key) => key.provider));
  const validated = getAvailableModelsList(validateAllResultsByKeyId, activeKeys);
  const baseRows = validated.length > 0
    ? validated
    : activeKeys.flatMap((key) => {
      const provider = AI_PROVIDERS.find((p) => p.id === key.provider);
      return (provider?.models ?? []).map((model) => ({ providerId: key.provider, modelId: model.id }));
    });
  const rows = [
    ...imageToImageDefaultModelsForActiveProviders(activeProviders),
    ...baseRows,
  ];
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = `${row.providerId}::${row.modelId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return isImageToImageCapableModel(row.providerId, row.modelId);
    })
    .map((row) => {
      const provider = AI_PROVIDERS.find((p) => p.id === row.providerId);
      const model = provider?.models.find((m) => m.id === row.modelId);
      const imageModelName = imageToImageModelDisplayName(row.providerId, row.modelId);
      return {
        key: `${row.providerId}::${row.modelId}`,
        providerId: row.providerId,
        providerName: provider?.name ?? row.providerId,
        modelId: row.modelId,
        modelName: imageModelName ?? model?.name ?? getModelDisplayName(row.providerId, row.modelId),
        canLikelyGenerateImage: true,
      };
    });
}

export function createImageToImageBaselineRow(): ImageToImageEvaluationRow {
  return {
    id: 'baseline-gemini-banana',
    no: 1,
    isBaseline: true,
    shouldTest: true,
    providerId: GEMINI_BANANA_PROVIDER,
    modelId: GEMINI_BANANA_MODEL,
    style: 'modern',
    outputMode: 'both',
    prompt: buildImageToImagePrompt('modern', 'both'),
    file: null,
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

export function getImageToImageSearchValue(row: ImageToImageEvaluationRow): string {
  return [row.providerId, row.modelId, row.fileName, row.prompt, row.resultText, row.message].filter(Boolean).join('\n');
}

export function getImageToImageCategoryValue(row: ImageToImageEvaluationRow): string {
  return row.isBaseline ? '預設 Gemini Banana' : '自訂模型';
}

type CreateColumnsDeps = {
  modelOptions: ImageModelOption[];
  onPatchRow: (rowId: string, patch: Partial<ImageToImageEvaluationRow>) => void;
  onUploadFile: (rowId: string, file: File | null) => void;
  onRunRow: (row: ImageToImageEvaluationRow) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (row: ImageToImageEvaluationRow) => void;
  onOpenDetail: (row: ImageToImageEvaluationRow) => void;
};

const col = createColumnHelper<ImageToImageEvaluationRow>();

function providerLabel(providerId: string): string {
  return AI_PROVIDERS.find((provider) => provider.id === providerId)?.name ?? providerId;
}

function executionPlaneLabel(providerId: string): string {
  if (providerId === 'ollama_local') return '地端／內網';
  return '公有雲 API';
}

function statusLabel(status: ImageToImageRunStatus): string {
  if (status === 'done') return '完成';
  if (status === 'failed') return '失敗';
  if (status === 'running') return '模型測試中';
  return '尚未測試';
}

function stopTablePointerEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function ImageGenerationElapsedLabel({
  runStatus,
  runStartedAtMs,
}: {
  runStatus: ImageToImageRunStatus;
  runStartedAtMs: number | null;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (runStatus !== 'running' || runStartedAtMs == null) return;
    const tick = () => setElapsedSec((Date.now() - runStartedAtMs) / 1000);
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [runStatus, runStartedAtMs]);

  if (runStatus !== 'running' || runStartedAtMs == null) return null;
  return (
    <div className="mt-1 flex min-h-[18px] items-center gap-1 text-[11px] text-emerald-800" aria-live="polite">
      <span className="tabular-nums font-mono font-semibold">生成 {elapsedSec.toFixed(1)} 秒</span>
    </div>
  );
}

export function createImageToImageColumns(deps: CreateColumnsDeps): ColumnDef<ImageToImageEvaluationRow, unknown>[] {
  const { modelOptions, onPatchRow, onUploadFile, onRunRow, onDeleteRow, onDuplicateRow, onOpenDetail } = deps;
  return [
    col.display({
      id: 'no',
      header: 'No',
      meta: { headerEn: 'No.', headerZh: '編號' },
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums text-text-secondary">{row.original.no}</span>,
    }),
    col.display({
      id: 'should-test',
      header: 'Test?',
      meta: { headerEn: 'Whether to test', headerZh: '是否測試' },
      cell: ({ row }) => (
        <ImageToImageShouldTestCell row={row.original} onPatchRow={onPatchRow} />
      ),
    }),
    col.display({
      id: 'row-actions',
      header: 'Actions',
      meta: { headerEn: 'Actions', headerZh: '操作' },
      cell: ({ row }) => (
        <ImageToImageRowActionsCell row={row.original} onDeleteRow={onDeleteRow} />
      ),
    }),
    col.display({
      id: 'company',
      header: 'Company',
      meta: { headerEn: 'Company', headerZh: '公司名稱' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-text-primary">{providerLabel(row.original.providerId)}</p>
          {row.original.isBaseline && <p className="text-[10px] text-emerald-500">預設 Gemini Banana</p>}
        </div>
      ),
    }),
    col.display({
      id: 'invocation-path',
      header: 'Invoke',
      meta: { headerEn: 'Invocation path', headerZh: '觸發路徑' },
      cell: () => (
        <span className="inline-flex rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-primary">
          HTTP 直連
        </span>
      ),
    }),
    col.display({
      id: 'execution-plane',
      header: 'Compute',
      meta: { headerEn: 'Execution plane', headerZh: '運算面' },
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-primary">
          {executionPlaneLabel(row.original.providerId)}
        </span>
      ),
    }),
    col.display({
      id: 'adapter-model',
      header: 'Adapter',
      meta: { headerEn: 'Adapter model', headerZh: 'ADAPTER 模型' },
      cell: ({ row }) => {
        const r = row.original;
        return (
          <select value={`${r.providerId}::${r.modelId}`} onMouseDown={stopTablePointerEvent} onPointerDown={stopTablePointerEvent} onClick={stopTablePointerEvent} onChange={(event) => {
            const [providerId, modelId] = event.target.value.split('::');
            onPatchRow(r.id, { providerId, modelId });
          }} className="h-8 w-full min-w-[220px] rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500">
            {modelOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.modelName}
              </option>
            ))}
          </select>
        );
      },
    }),
    col.display({
      id: 'style',
      header: 'Style',
      meta: { headerEn: 'style', headerZh: 'style' },
      cell: ({ row }) => (
        <select value={row.original.style} onMouseDown={stopTablePointerEvent} onPointerDown={stopTablePointerEvent} onClick={stopTablePointerEvent} onChange={(event) => {
          const style = event.target.value as ImageToImageStyle;
          onPatchRow(row.original.id, { style, prompt: buildImageToImagePrompt(style, row.original.outputMode) });
        }} className="h-8 w-full rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500">
          {STYLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      ),
    }),
    col.display({
      id: 'output',
      header: 'Output',
      meta: { headerEn: 'output', headerZh: 'output' },
      cell: ({ row }) => (
        <select value={row.original.outputMode} onMouseDown={stopTablePointerEvent} onPointerDown={stopTablePointerEvent} onClick={stopTablePointerEvent} onChange={(event) => {
          const outputMode = event.target.value as ImageToImageOutputMode;
          onPatchRow(row.original.id, { outputMode, prompt: buildImageToImagePrompt(row.original.style, outputMode) });
        }} className="h-8 w-full rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500">
          {OUTPUT_MODE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      ),
    }),
    col.display({
      id: 'input-floor-plan',
      header: 'Input',
      meta: { headerEn: 'input floor plan', headerZh: 'input floor plan' },
      cell: ({ row }) => (
        <ImageToImageFloorPlanInputCell row={row.original} onUploadFile={onUploadFile} />
      ),
    }),
    col.display({
      id: 'test-prompt',
      header: 'Test prompt',
      meta: { headerEn: 'Test prompt', headerZh: 'Test prompt' },
      cell: ({ row }) => (
        <textarea value={row.original.prompt} onMouseDown={stopTablePointerEvent} onPointerDown={stopTablePointerEvent} onClick={stopTablePointerEvent} onChange={(event) => onPatchRow(row.original.id, { prompt: event.target.value })} className="h-24 w-full min-w-[360px] resize-none rounded-md border border-border-default bg-bg-secondary p-2 font-mono text-[11px] leading-4 text-text-primary outline-none focus:border-emerald-500" />
      ),
    }),
    col.display({
      id: 'run-controls',
      header: 'Run',
      meta: { headerEn: 'Run controls', headerZh: '執行控制' },
      cell: ({ row }) => {
        const r = row.original;
        const running = r.runStatus === 'running';
        return (
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" title="開始評估" disabled={running} onClick={(event) => { event.stopPropagation(); event.preventDefault(); onRunRow(r); }} className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-emerald-600 hover:bg-bg-tertiary disabled:opacity-40">
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button type="button" title="複製成新列" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onDuplicateRow(r); }} className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-text-secondary hover:bg-bg-tertiary">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="檢視詳情" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(r); }} className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-text-secondary hover:bg-bg-tertiary">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <ImageGenerationElapsedLabel runStatus={r.runStatus} runStartedAtMs={r.runStartedAtMs} />
          </div>
        );
      },
    }),
    col.display({
      id: 'requested-effective',
      header: 'Req / Eff',
      meta: { headerEn: 'Requested / Effective model', headerZh: '指定型號／實際型號' },
      cell: ({ row }) => (
        <ImageToImageRequestedEffectiveCell row={row.original} modelOptions={modelOptions} />
      ),
    }),
    col.display({
      id: 'raw-output',
      header: 'Raw',
      meta: { headerEn: 'Real-time raw output', headerZh: 'Raw 輸出（即時）' },
      cell: ({ row }) => (
        <ImageToImageRawOutputCell row={row.original} onOpenDetail={onOpenDetail} />
      ),
    }),
    col.display({
      id: 'rendered-output-2d',
      header: '2D Rendered',
      meta: { headerEn: '2D rendered output', headerZh: '2D Rendered 輸出' },
      cell: ({ row }) => (
        <ImageToImageRenderedImageCell
          row={row.original}
          url={row.original.resultImage2dUrl || row.original.resultImageUrl}
          label="2D"
          emptyText={row.original.outputMode === '3d' ? '未要求 2D 圖。' : row.original.resultText || '尚無 2D 圖。'}
          onOpenDetail={onOpenDetail}
        />
      ),
    }),
    col.display({
      id: 'rendered-output-3d',
      header: '3D Rendered',
      meta: { headerEn: '3D rendered output', headerZh: '3D Rendered 輸出' },
      cell: ({ row }) => (
        <ImageToImageRenderedImageCell
          row={row.original}
          url={row.original.resultImage3dUrl}
          label="3D"
          emptyText={row.original.outputMode === '2d' ? '未要求 3D 圖。' : row.original.resultText || '尚無 3D 圖。'}
          onOpenDetail={onOpenDetail}
        />
      ),
    }),
    col.display({
      id: 'llm-evaluation',
      header: 'LLM',
      meta: { headerEn: 'LLM', headerZh: '測試評價' },
      cell: ({ row }) => {
        const r = row.original;
        const className = r.runStatus === 'done'
          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
          : r.runStatus === 'failed'
            ? 'border-rose-300 bg-rose-100 text-rose-800'
            : r.runStatus === 'running'
              ? 'border-sky-300 bg-sky-50 text-sky-900'
              : 'border-slate-300 bg-slate-100 text-slate-700';
        return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{statusLabel(r.runStatus)}</span>;
      },
    }),
    col.display({
      id: 'ttft',
      header: 'TTFT (ms)',
      meta: { headerEn: 'TTFT (ms)', headerZh: 'TTFT (ms) 首 token 延遲' },
      cell: () => <span className="font-mono text-xs tabular-nums text-text-muted">—</span>,
    }),
    col.display({
      id: 'e2e',
      header: 'E2E (ms)',
      meta: { headerEn: 'E2E (ms)', headerZh: 'E2E (ms) 完成時間' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {row.original.e2eMs == null ? '—' : Math.round(row.original.e2eMs)}
        </span>
      ),
    }),
    col.display({
      id: 'throughput',
      header: 'tok/s',
      meta: { headerEn: 'Throughput (tokens/s)', headerZh: '吞吐（tokens/s）' },
      cell: () => <span className="font-mono text-xs tabular-nums text-text-muted">—</span>,
    }),
    col.display({
      id: 'http-status',
      header: 'HTTP',
      meta: { headerEn: 'HTTP status', headerZh: 'HTTP 狀態碼' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {row.original.httpStatus ?? '—'}
        </span>
      ),
    }),
    col.display({
      id: 'test-history',
      header: 'History',
      meta: { headerEn: 'Test history', headerZh: 'Test history' },
      cell: ({ row }) => (
        <button type="button" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(row.original); }} className="text-left text-[11px] text-text-secondary hover:text-text-primary">
          {row.original.lastRunAt ? new Date(row.original.lastRunAt).toLocaleString() : '尚無紀錄'}
        </button>
      ),
    }),
  ];
}
