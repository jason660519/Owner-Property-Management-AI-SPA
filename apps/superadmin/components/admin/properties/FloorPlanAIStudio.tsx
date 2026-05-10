'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageIcon, Layers, Loader2, Play, Upload, Wand2 } from 'lucide-react';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { saveGeneratedFloorPlanReferenceDocument } from '@/lib/actions/properties';
import type { PropertyDocumentItem } from '@/lib/types/properties';
import {
  buildImageModelOptions,
  buildImageToImagePrompt,
  STYLE_OPTIONS,
  type ImageModelOption,
  type ImageToImageStyle,
} from '@/app/superadmin/settings/api_key_and_model_setting/image-to-image-evaluation-columns';
import { FloorPlanAIResultTable } from './FloorPlanAIResultTable';

type FloorPlanAIStudioProps = {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  documents: PropertyDocumentItem[];
  onDocumentsChanged: () => Promise<void>;
};

export type OutputMode = '2d' | '3d';
export type RunStatus = 'idle' | 'running' | 'done' | 'failed';

export type GeneratedTile = {
  id: string;
  flow: 'basic' | 'style_reference';
  styleId: ImageToImageStyle | 'custom';
  styleLabel: string;
  mode: OutputMode;
  status: RunStatus;
  imageUrl: string;
  message: string;
  modelLabel: string;
  fallbackTrail: string[];
};
type GeneratedFlow = GeneratedTile['flow'];
type RunningFlows = Record<GeneratedFlow, boolean>;

const PRESET_STYLES: ImageToImageStyle[] = ['modern', 'nordic', 'minimal'];
const OUTPUT_MODES: OutputMode[] = ['2d', '3d'];
const MAX_MODEL_ATTEMPTS = 3;
const BASIC_PROMPT_SEED = '依照來源格局圖生成適合房地產展示使用的清楚參考圖。請保留格局判讀性，家具與色彩配置要自然、有生活感。';
const STYLE_REFERENCE_PROMPT_SEED = '請套用風格參考圖的配色、材質、家具氛圍與整體視覺質感，生成新的房地產展示參考圖。';

function isImageDocument(doc: PropertyDocumentItem): boolean {
  return /\.(png|jpe?g|webp)$/i.test(doc.filePath);
}

function isAiGeneratedDocument(doc: PropertyDocumentItem): boolean {
  return doc.tags?.includes('ai_generated') === true;
}

function styleLabel(styleId: ImageToImageStyle): string {
  return STYLE_OPTIONS.find((style) => style.id === styleId)?.label ?? styleId;
}

function selectedModel(modelOptions: ImageModelOption[], key: string): ImageModelOption | null {
  return modelOptions.find((option) => option.key === key) ?? modelOptions[0] ?? null;
}

function modelLabel(model: ImageModelOption): string {
  return `${model.providerName} / ${model.modelName}`;
}

function fallbackModelChain(modelOptions: ImageModelOption[], primaryKey: string): ImageModelOption[] {
  const primary = selectedModel(modelOptions, primaryKey);
  if (!primary) return [];
  const fallbackOptions = modelOptions.filter((option) => option.key !== primary.key);
  return [primary, ...fallbackOptions].slice(0, MAX_MODEL_ATTEMPTS);
}

const MAX_STYLE_REF_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'data:';
  } catch {
    return false;
  }
}

async function documentToFile(doc: PropertyDocumentItem): Promise<File> {
  const url = new URL(doc.url, window.location.origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('不合法的文件 URL。');
  }
  const response = await fetch(doc.url, { cache: 'no-store' });
  if (!response.ok) throw new Error('格局圖讀取失敗，請重新開啟或重新上傳來源圖。');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('目前 AI 生成只支援 JPG / PNG / WebP 格局圖來源。');
  const ext = blob.type.split('/')[1] || 'png';
  return new File([blob], `${doc.documentName}.${ext}`, { type: blob.type });
}

function buildPrompt(styleId: ImageToImageStyle | 'custom', mode: OutputMode, editablePrompt: string, hasStyleReference: boolean): string {
  const userPrompt = editablePrompt.trim();
  const base = styleId === 'custom'
    ? userPrompt || STYLE_REFERENCE_PROMPT_SEED
    : [
      buildImageToImagePrompt(styleId, mode),
      userPrompt ? `使用者補充要求：${userPrompt}` : '',
    ].filter(Boolean).join('\n\n');
  return [
    base,
    '來源格局圖是唯一的空間結構依據，必須鎖定牆線、門窗、房間數、入口、濕區位置與主要比例。',
    hasStyleReference
      ? '第二張參考圖只作為配色、材質、家具氛圍與視覺風格參考，不可改變格局結構。'
      : '',
    '產出圖片需標示為房地產展示參考圖，不得當作施工圖、測量圖或法律文件。',
  ].filter(Boolean).join('\n\n');
}

export function FloorPlanAIStudio({
  propertyId,
  propertyType,
  ownerId,
  documents,
  onDocumentsChanged,
}: FloorPlanAIStudioProps) {
  const {
    keys,
    validationCacheByKeyId,
    refreshSilent,
    testModel,
  } = useAISettings();
  const [sourceDocumentId, setSourceDocumentId] = useState('');
  const [modelKey, setModelKey] = useState('');
  const [basicPrompt, setBasicPrompt] = useState(BASIC_PROMPT_SEED);
  const [styleReferencePrompt, setStyleReferencePrompt] = useState(STYLE_REFERENCE_PROMPT_SEED);
  const [styleReferenceFile, setStyleReferenceFile] = useState<File | null>(null);
  const [tiles, setTiles] = useState<GeneratedTile[]>([]);
  const [runningFlows, setRunningFlows] = useState<RunningFlows>({ basic: false, style_reference: false });
  const [feedback, setFeedback] = useState<string | null>(null);
  const isBasicRunning = runningFlows.basic;
  const isStyleReferenceRunning = runningFlows.style_reference;
  const isAnyFlowRunning = isBasicRunning || isStyleReferenceRunning;

  useEffect(() => {
    void refreshSilent?.();
  }, [refreshSilent]);

  const sourceDocuments = useMemo(
    () => documents.filter((doc) => doc.documentType === 'floor_plan' && isImageDocument(doc) && !isAiGeneratedDocument(doc)),
    [documents],
  );

  const modelOptions = useMemo(
    () => buildImageModelOptions(keys, validationCacheByKeyId),
    [keys, validationCacheByKeyId],
  );

  useEffect(() => {
    if (!sourceDocumentId && sourceDocuments[0]) setSourceDocumentId(sourceDocuments[0].id);
  }, [sourceDocumentId, sourceDocuments]);

  useEffect(() => {
    if (!modelKey && modelOptions[0]) setModelKey(modelOptions[0].key);
  }, [modelKey, modelOptions]);

  const activeModel = selectedModel(modelOptions, modelKey);
  const modelChain = useMemo(
    () => fallbackModelChain(modelOptions, modelKey),
    [modelKey, modelOptions],
  );
  const sourceDocument = sourceDocuments.find((doc) => doc.id === sourceDocumentId) ?? sourceDocuments[0] ?? null;

  const patchTile = useCallback((id: string, patch: Partial<GeneratedTile>) => {
    setTiles((prev) => prev.map((tile) => tile.id === id ? { ...tile, ...patch } : tile));
  }, []);

  const runOne = useCallback(async (
    tile: GeneratedTile,
    sourceFile: File,
    styleRef: File | null,
    modelCandidates: ImageModelOption[],
    editablePrompt: string,
  ) => {
    const attemptFailures: string[] = [];
    const prompt = buildPrompt(tile.styleId, tile.mode, editablePrompt, Boolean(styleRef));

    for (const [index, model] of modelCandidates.entries()) {
      const currentModelLabel = modelLabel(model);
      patchTile(tile.id, {
        status: 'running',
        message: index === 0 ? `生成中：${currentModelLabel}` : `主模型失敗，改用備援 ${index}：${currentModelLabel}`,
        imageUrl: '',
        modelLabel: currentModelLabel,
        fallbackTrail: attemptFailures,
      });

      let result: Awaited<ReturnType<typeof testModel>>;
      try {
        result = await testModel(
          model.providerId,
          model.modelId,
          prompt,
          styleRef ? [sourceFile, styleRef] : sourceFile,
        );
      } catch (err) {
        attemptFailures.push(`${currentModelLabel}：${err instanceof Error ? err.message : '呼叫失敗'}`);
        continue;
      }

      if (!result.success || !result.output_image_url) {
        attemptFailures.push(`${currentModelLabel}：${result.message ?? '模型未回傳圖片'}`);
        continue;
      }

      if (!isValidImageUrl(result.output_image_url)) {
        attemptFailures.push(`${currentModelLabel}：模型回傳無效圖片 URL`);
        continue;
      }

      const saveResult = await saveGeneratedFloorPlanReferenceDocument({
        propertyId,
        propertyType,
        ownerId,
        imageUrl: result.output_image_url,
        outputMode: tile.mode,
        styleId: tile.styleId,
        styleLabel: tile.styleLabel,
        provider: model.providerId,
        modelId: model.modelId,
        prompt,
        sourceDocumentId: sourceDocument?.id,
        styleReferenceFileName: styleRef?.name,
        fallbackAttempts: attemptFailures,
      });

      patchTile(tile.id, {
        status: saveResult.success ? 'done' : 'failed',
        imageUrl: result.output_image_url,
        message: saveResult.success
          ? `由 ${currentModelLabel} 生成並儲存${index > 0 ? '（備援成功）' : ''}。`
          : saveResult.message ?? 'AI 圖片儲存失敗。',
        modelLabel: currentModelLabel,
        fallbackTrail: attemptFailures,
      });
      return;
    }

    patchTile(tile.id, {
      status: 'failed',
      message: attemptFailures.length > 0 ? `全部模型失敗：${attemptFailures.join('；')}` : '沒有可用的圖生圖模型。',
      modelLabel: '',
      fallbackTrail: attemptFailures,
    });
  }, [ownerId, patchTile, propertyId, propertyType, sourceDocument?.id, testModel]);

  const runTiles = useCallback(async (
    flow: GeneratedFlow,
    nextTiles: GeneratedTile[],
    styleRef: File | null,
    editablePrompt: string,
  ) => {
    if (!sourceDocument || modelChain.length === 0) {
      setFeedback('請先上傳 JPG / PNG / WebP 格局圖，並確認已有可用的圖生圖模型。');
      return;
    }
    setFeedback(null);
    setTiles((prev) => [
      ...prev.filter((tile) => tile.flow !== flow),
      ...nextTiles,
    ]);
    setRunningFlows((prev) => ({ ...prev, [flow]: true }));
    try {
      const sourceFile = await documentToFile(sourceDocument);
      await Promise.all(nextTiles.map((tile) => (
        runOne(tile, sourceFile, styleRef, modelChain, editablePrompt)
      )));
      await onDocumentsChanged();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'AI 格局圖生成失敗。');
      setTiles((prev) => prev.map((tile) => tile.status === 'running' || tile.status === 'idle'
        ? tile.flow === flow ? { ...tile, status: 'failed', message: '未完成生成。' } : tile
        : tile));
    } finally {
      setRunningFlows((prev) => ({ ...prev, [flow]: false }));
    }
  }, [modelChain, onDocumentsChanged, runOne, sourceDocument]);

  const runBasic = useCallback(() => {
    const nextTiles = PRESET_STYLES.flatMap((styleId) => OUTPUT_MODES.map((mode) => ({
      id: `basic-${styleId}-${mode}-${Date.now()}`,
      flow: 'basic' as const,
      styleId,
      styleLabel: styleLabel(styleId),
      mode,
      status: 'idle' as const,
      imageUrl: '',
      message: '',
      modelLabel: '',
      fallbackTrail: [],
    })));
    void runTiles('basic', nextTiles, null, basicPrompt);
  }, [basicPrompt, runTiles]);

  const runStyleReference = useCallback(() => {
    if (!styleReferenceFile) {
      setFeedback('請先上傳風格參考圖。');
      return;
    }
    const nextTiles = OUTPUT_MODES.map((mode) => ({
      id: `style-reference-${mode}-${Date.now()}`,
      flow: 'style_reference' as const,
      styleId: 'custom' as const,
      styleLabel: '風格參考圖',
      mode,
      status: 'idle' as const,
      imageUrl: '',
      message: '',
      modelLabel: '',
      fallbackTrail: [],
    }));
    void runTiles('style_reference', nextTiles, styleReferenceFile, styleReferencePrompt);
  }, [runTiles, styleReferenceFile, styleReferencePrompt]);

  const latestBasicTiles = useMemo(() => tiles.filter((tile) => tile.flow === 'basic'), [tiles]);
  const latestStyleReferenceTiles = useMemo(() => tiles.filter((tile) => tile.flow === 'style_reference'), [tiles]);

  return (
    <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Wand2 size={16} className="text-accent" />
            AI 格局圖工作台
          </div>
          <p className="mt-1 text-xs text-text-muted">先確認共用來源與模型，再依需求選擇一般生成或風格參考生成。</p>
        </div>
        {feedback && <span className="rounded-md border border-red-500/20 bg-red-500/8 px-2 py-1 text-xs text-red-500">{feedback}</span>}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-[11px] font-medium text-text-secondary">來源格局圖</span>
          <select
            value={sourceDocument?.id ?? ''}
            onChange={(event) => setSourceDocumentId(event.target.value)}
            disabled={isAnyFlowRunning || sourceDocuments.length === 0}
            className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
          >
            {sourceDocuments.length === 0 ? (
              <option value="">請先上傳圖片格式格局圖</option>
            ) : sourceDocuments.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.documentName}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[11px] font-medium text-text-secondary">圖生圖模型</span>
          <select
            value={activeModel?.key ?? ''}
            onChange={(event) => setModelKey(event.target.value)}
            disabled={isAnyFlowRunning || modelOptions.length === 0}
            className="w-full rounded-md border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
          >
            {modelOptions.length === 0 ? (
              <option value="">尚無已啟用圖生圖模型</option>
            ) : modelOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.providerName} / {option.modelName}</option>
            ))}
          </select>
          {modelChain.length > 0 && (
            <p className="text-[10px] leading-relaxed text-text-muted">
              Fallback 順序：{modelChain.map((model, index) => `${index === 0 ? '主' : `備${index}`} ${modelLabel(model)}`).join(' → ')}
            </p>
          )}
        </label>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <section className="space-y-3 rounded-md border border-border-default bg-bg-primary p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <Layers size={14} className="text-accent" />
                Prompt + 格局圖
              </div>
              <p className="mt-1 text-[11px] text-text-muted">產出 3 種預設風格，每種包含 2D 與 3D。</p>
            </div>
            <button
              type="button"
              onClick={runBasic}
              disabled={isBasicRunning || !sourceDocument || !activeModel}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {isBasicRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              生成 3 風格 2D+3D
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-text-secondary">Prompt</span>
            <textarea
              value={basicPrompt}
              onChange={(event) => setBasicPrompt(event.target.value)}
              disabled={isBasicRunning}
              rows={5}
              className="w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs leading-relaxed text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
            />
          </label>

          <FloorPlanAIResultTable
            tiles={latestBasicTiles}
            emptyText="這一區會顯示 prompt + 格局圖產出的 2D / 3D 結果。"
          />
        </section>

        <section className="space-y-3 rounded-md border border-border-default bg-bg-primary p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <ImageIcon size={14} className="text-accent" />
                Prompt + 格局圖 + 風格參考圖
              </div>
              <p className="mt-1 text-[11px] text-text-muted">風格圖只影響配色、材質、家具氛圍，不改格局結構。</p>
            </div>
            <button
              type="button"
              onClick={runStyleReference}
              disabled={isStyleReferenceRunning || !sourceDocument || !activeModel}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/12 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
            >
              {isStyleReferenceRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              生成風格參考 2D+3D
            </button>
          </div>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-medium text-text-secondary">風格參考圖</span>
            <span className="flex min-w-0 items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-2 py-1.5">
              <Upload size={13} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{styleReferenceFile?.name ?? '未選擇'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isStyleReferenceRunning}
                aria-label="上傳風格參考圖"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file) {
                    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                      setFeedback('風格參考圖只支援 JPG / PNG / WebP 格式。');
                      event.target.value = '';
                      return;
                    }
                    if (file.size > MAX_STYLE_REF_SIZE) {
                      setFeedback('風格參考圖不得超過 10 MB。');
                      event.target.value = '';
                      return;
                    }
                  }
                  setFeedback(null);
                  setStyleReferenceFile(file);
                }}
                className="max-w-[118px] text-[11px] text-text-muted file:mr-1 file:rounded file:border-0 file:bg-bg-tertiary file:px-1.5 file:py-0.5 file:text-[11px] file:text-text-secondary"
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-text-secondary">Prompt</span>
            <textarea
              value={styleReferencePrompt}
              onChange={(event) => setStyleReferencePrompt(event.target.value)}
              disabled={isStyleReferenceRunning}
              rows={5}
              className="w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs leading-relaxed text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
            />
          </label>

          <FloorPlanAIResultTable
            tiles={latestStyleReferenceTiles}
            emptyText="這一區會顯示 prompt + 格局圖 + 風格參考圖產出的 2D / 3D 結果。"
          />
        </section>
      </div>
    </section>
  );
}
