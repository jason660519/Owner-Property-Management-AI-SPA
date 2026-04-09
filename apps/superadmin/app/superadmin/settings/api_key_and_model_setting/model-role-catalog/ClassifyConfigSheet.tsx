'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Globe, Server, Loader2, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import { runBatchClassify, type BatchJobResult } from '@/lib/utils/batch-classify-runner';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';
import type { ClassifyModelsResult } from '@/lib/types/model-role-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClassifyMode = 'online' | 'offline';

interface SelectedClassifier {
  provider: string;
  providerName: string;
  modelId: string;
  modelName: string;
}

interface JobResult {
  classifier: SelectedClassifier;
  result: ClassifyModelsResult;
}

export interface ClassifyConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ClassifyMode;
  savedKeys: SavedKey[];
  validationCache: Record<string, KeyValidationResult>;
  /** Single-model classify function from hook (with skipRefresh + signal support) */
  onClassify: (
    mode: ClassifyMode,
    provider: string,
    modelId: string,
    options?: { skipRefresh?: boolean; signal?: AbortSignal },
  ) => Promise<ClassifyModelsResult>;
  /** Refresh assignments once after batch completes */
  onRefreshAssignments: () => Promise<void>;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Mode config
// ---------------------------------------------------------------------------

const MODE_CONFIG: Record<ClassifyMode, {
  icon: typeof Globe;
  title: string;
  description: string;
  color: string;
  btnColor: string;
}> = {
  online: {
    icon: Globe,
    title: '網路查詢分類',
    description: '由各分類器模型根據訓練知識，查詢各模型的公開能力資訊來推薦分類標籤。',
    color: 'text-blue-400',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  offline: {
    icon: Server,
    title: 'API Response 分類',
    description: '根據各分頁（OCR、合約…）實際測試模型後的 API 回應結果，由分類器模型推薦分類標籤。',
    color: 'text-emerald-400',
    btnColor: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassifyConfigSheet({
  open,
  onOpenChange,
  mode,
  savedKeys,
  validationCache,
  onClassify,
  onRefreshAssignments,
  onComplete,
}: ClassifyConfigSheetProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  // -- Selected classifiers --
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [concurrency, setConcurrency] = useState(3);

  // -- Execution state --
  const [running, setRunning] = useState(false);
  const [jobResults, setJobResults] = useState<JobResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // -- Build static model name lookup --
  const staticModelNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of AI_PROVIDERS) {
      for (const model of p.models) {
        m.set(`${p.id}::${model.id}`, model.name);
      }
    }
    return m;
  }, []);

  const providerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of AI_PROVIDERS) m.set(p.id, p.name);
    return m;
  }, []);

  // -- Available models: validation cache + static fallback (same logic as hook) --
  const availableClassifiers = useMemo(() => {
    const seen = new Set<string>();
    const result: SelectedClassifier[] = [];

    const addModel = (providerId: string, modelId: string) => {
      const key = `${providerId}::${modelId}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        provider: providerId,
        providerName: providerNameMap.get(providerId) ?? providerId,
        modelId,
        modelName: staticModelNameMap.get(key) ?? modelId,
      });
    };

    // 1. Models from validation cache (real available models from API)
    for (const k of savedKeys) {
      if (!k.is_active) continue;
      const cached = validationCache[k.id];
      if (!cached?.availableModels?.length) continue;
      for (const modelId of cached.availableModels) {
        addModel(k.provider, modelId);
      }
    }

    // 2. Static fallback for providers without validation cache
    const providersWithCache = new Set(
      savedKeys
        .filter((k) => k.is_active && validationCache[k.id]?.availableModels?.length)
        .map((k) => k.provider),
    );
    for (const p of AI_PROVIDERS) {
      if (providersWithCache.has(p.id)) continue;
      // Only include if user has an active key for this provider
      if (!savedKeys.some((k) => k.provider === p.id && k.is_active)) continue;
      for (const m of p.models) {
        addModel(p.id, m.id);
      }
    }

    // Sort by provider name, then model name
    result.sort((a, b) =>
      a.providerName.localeCompare(b.providerName) || a.modelName.localeCompare(b.modelName),
    );

    return result;
  }, [savedKeys, validationCache, providerNameMap, staticModelNameMap]);

  // Group by provider for display
  const groupedByProvider = useMemo(() => {
    const m = new Map<string, SelectedClassifier[]>();
    for (const c of availableClassifiers) {
      const arr = m.get(c.provider) ?? [];
      arr.push(c);
      m.set(c.provider, arr);
    }
    return m;
  }, [availableClassifiers]);

  const classifierKey = (c: SelectedClassifier) => `${c.provider}::${c.modelId}`;

  const toggleClassifier = (c: SelectedClassifier) => {
    const key = classifierKey(c);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleProvider = (providerId: string) => {
    const models = groupedByProvider.get(providerId) ?? [];
    const keys = models.map(classifierKey);
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === availableClassifiers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableClassifiers.map(classifierKey)));
    }
  };

  // -- Run classification with batch runner --
  const handleRun = useCallback(async () => {
    const classifiers = availableClassifiers.filter((c) => selected.has(classifierKey(c)));
    if (classifiers.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunning(true);
    setJobResults([]);
    setCurrentIdx(0);
    setTotalJobs(classifiers.length);

    await runBatchClassify({
      items: classifiers,
      concurrency,
      signal: controller.signal,
      execute: async (classifier, signal) => {
        const result = await onClassify(
          mode,
          classifier.provider,
          classifier.modelId,
          { skipRefresh: true, signal },
        );
        return { classifier, result };
      },
      onProgress: (completed, _total, batchResult) => {
        setCurrentIdx(completed);

        if (batchResult.ok && batchResult.data) {
          const { classifier, result } = batchResult.data as {
            classifier: SelectedClassifier;
            result: ClassifyModelsResult;
          };
          setJobResults((prev) => [...prev, { classifier, result }]);
        } else {
          // Build a fallback entry from the batch result
          setJobResults((prev) => [
            ...prev,
            {
              classifier: classifiers[batchResult.itemIndex],
              result: { ok: false, count: 0, error: batchResult.error ?? 'Unknown error' },
            },
          ]);
        }
      },
    });

    abortControllerRef.current = null;
    setRunning(false);

    // Refresh assignments ONCE after all jobs complete
    await onRefreshAssignments();
    onComplete();
  }, [availableClassifiers, selected, concurrency, mode, onClassify, onRefreshAssignments, onComplete]);

  const handleAbort = () => {
    abortControllerRef.current?.abort();
  };

  // -- Stats --
  const successCount = jobResults.filter((r) => r.result.ok).length;
  const failCount = jobResults.filter((r) => !r.result.ok).length;
  const totalTags = jobResults.reduce((sum, r) => sum + (r.result.count ?? 0), 0);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!running) onOpenChange(v); }}>
      <SheetContent className="sm:max-w-lg">
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary border-b border-border-default px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={16} className={config.color} />
              <h3 className="text-sm font-semibold text-text-primary">{config.title}</h3>
            </div>
            {!running && (
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">{config.description}</p>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Concurrency setting */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">
              同時發送 API 數量（並行數）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={running}
                className="flex-1 accent-accent"
              />
              <span className="w-8 text-center text-sm font-mono text-text-primary">{concurrency}</span>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              數值越高越快，但可能觸發 API rate limit
            </p>
          </div>

          {/* Model selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-muted">
                選擇分類器模型（已選 {selected.size} / {availableClassifiers.length}）
              </label>
              <button
                type="button"
                onClick={selectAll}
                disabled={running}
                className="text-[10px] text-accent hover:underline disabled:opacity-50"
              >
                {selected.size === availableClassifiers.length ? '全部取消' : '全選'}
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-border-default rounded-lg divide-y divide-border-default">
              {Array.from(groupedByProvider.entries()).map(([providerId, models]) => {
                const providerKeys = models.map(classifierKey);
                const allChecked = providerKeys.every((k) => selected.has(k));
                const someChecked = providerKeys.some((k) => selected.has(k));
                const providerName = models[0]?.providerName ?? providerId;

                return (
                  <div key={providerId}>
                    {/* Provider header */}
                    <label className="flex items-center gap-2 px-3 py-2 bg-bg-secondary cursor-pointer hover:bg-bg-tertiary">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleProvider(providerId)}
                        disabled={running}
                        className="rounded border-border-default"
                      />
                      <span className="text-xs font-semibold text-text-primary">{providerName}</span>
                      <span className="text-[10px] text-text-muted ml-auto">{models.length} 個模型</span>
                    </label>
                    {/* Model checkboxes */}
                    {models.map((c) => (
                      <label
                        key={classifierKey(c)}
                        className="flex items-center gap-2 px-3 py-1.5 pl-8 cursor-pointer hover:bg-bg-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(classifierKey(c))}
                          onChange={() => toggleClassifier(c)}
                          disabled={running}
                          className="rounded border-border-default"
                        />
                        <span className="text-xs text-text-primary truncate">{c.modelName}</span>
                        <span className="text-[10px] text-text-muted font-mono ml-auto truncate max-w-[120px]">
                          {c.modelId}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress & Results */}
          {(running || jobResults.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>
                  {running ? '分類進行中…' : '分類完成'}
                  {' '}({currentIdx} / {totalJobs})
                </span>
                {running && (
                  <button
                    onClick={handleAbort}
                    className="text-red-400 hover:text-red-300 text-[10px]"
                  >
                    中止
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${totalJobs > 0 ? (currentIdx / totalJobs) * 100 : 0}%` }}
                />
              </div>

              {/* Summary stats */}
              {!running && jobResults.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400">✓ 成功 {successCount}</span>
                  {failCount > 0 && <span className="text-red-400">✗ 失敗 {failCount}</span>}
                  <span className="text-text-muted">共寫入 {totalTags} 筆標籤</span>
                </div>
              )}

              {/* Per-job results */}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {jobResults.map((jr, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-bg-secondary">
                    {jr.result.ok ? (
                      <CheckCircle2 size={12} className="shrink-0 text-green-400" />
                    ) : (
                      <XCircle size={12} className="shrink-0 text-red-400" />
                    )}
                    <span className="text-text-muted truncate">
                      {jr.classifier.providerName}/{jr.classifier.modelName}
                    </span>
                    {jr.result.ok ? (
                      <Badge variant="success" size="sm" className="ml-auto shrink-0">
                        {jr.result.count} 筆
                      </Badge>
                    ) : (
                      <span className="ml-auto text-red-400 truncate max-w-[180px]" title={jr.result.error}>
                        {jr.result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-primary border-t border-border-default px-4 py-3 flex justify-end gap-2">
          {!running ? (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-1.5 text-xs rounded border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-secondary"
              >
                {jobResults.length > 0 ? '關閉' : '取消'}
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={selected.size === 0}
                className={`px-4 py-1.5 text-xs font-medium rounded text-white disabled:opacity-50 disabled:cursor-not-allowed ${config.btnColor}`}
              >
                開始分類（{selected.size} 個模型）
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin" />
              分類中，請勿關閉…
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
