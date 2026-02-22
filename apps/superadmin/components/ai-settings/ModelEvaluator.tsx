'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, type AIProvider, type AIModelInfo } from '@/lib/ai-providers';
import type { SavedKey, SavedModel, ModelEvaluation, KeyValidationResult } from '@/lib/hooks/useAISettings';
import { getAvailableModelsList } from '@/lib/utils/total-available-models';

export interface KeyWithId {
  id: string;
  provider: string;
}

export interface ModelEvaluatorProps {
  savedKeys: SavedKey[];
  savedModels?: SavedModel[];
  savedEvaluations: ModelEvaluation[];
  /** 與頁首「可選」同一來源：有值時表格顯示此清單（與 163/178 一致），否則 fallback 為 AI_PROVIDERS 精選 */
  validateAllResultsByKeyId?: Record<string, KeyValidationResult>;
  currentKeys?: KeyWithId[];
  onSave: (evaluations: ModelEvaluation[]) => Promise<void>;
  onTestModel: (
    provider: string,
    modelId: string,
    prompt?: string
  ) => Promise<{ success: boolean; message?: string; output?: string }>;
  /** 可選：在此分頁勾選/取消「已選」時寫回 ai_model_selections，與 API 金鑰管理同步 */
  onSaveModels?: (
    providerId: string,
    selections: { modelId: string; modelName: string; isPrimary: boolean }[]
  ) => Promise<void>;
}

function getModelDisplayName(providerId: string, modelId: string): string {
  const p = AI_PROVIDERS.find((x) => x.id === providerId);
  const m = p?.models.find((x) => x.id === modelId);
  return m?.name ?? modelId;
}

export function ModelEvaluator({
  savedKeys,
  savedModels = [],
  savedEvaluations,
  validateAllResultsByKeyId = {},
  currentKeys = [],
  onSave,
  onSaveModels,
  onTestModel,
}: ModelEvaluatorProps) {
  const [testPrompt, setTestPrompt] = useState('你是哪家公司AI？你的模型型號是？今天幾號？');
  const [outputByKey, setOutputByKey] = useState<Record<string, string>>({});
  /** 本頁測試結果（優先於 DB 的 savedEvaluations 顯示在「狀態」欄） */
  const [testResultByKey, setTestResultByKey] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState(false);
  /** 依公司篩選：空字串 = 全部，否則為 providerId */
  const [filterProviderId, setFilterProviderId] = useState<string>('');
  /** 依狀態篩選：'' = 全部，working / not_working / untested */
  const [filterStatus, setFilterStatus] = useState<string>('');
  const validProviders = useMemo(
    () => new Set(savedKeys.filter((k) => k.is_valid).map((k) => k.provider)),
    [savedKeys],
  );

  /** 可選模型列：與頁首「可選」同一來源（驗證結果）；無驗證時 fallback 為 AI_PROVIDERS */
  const allRows = useMemo(() => {
    const fromValidation = getAvailableModelsList(validateAllResultsByKeyId, currentKeys);
    if (fromValidation.length > 0) {
      const providerOrder = AI_PROVIDERS.map((p) => p.id);
      return fromValidation
        .map(({ providerId, modelId }) => ({
          providerId,
          providerName: AI_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId,
          modelId,
          modelName: getModelDisplayName(providerId, modelId),
        }))
        .sort((a, b) => {
          const orderA = providerOrder.indexOf(a.providerId);
          const orderB = providerOrder.indexOf(b.providerId);
          if (orderA !== orderB) return orderA - orderB;
          return (a.modelName || a.modelId).localeCompare(b.modelName || b.modelId);
        });
    }
    const fallback: { providerId: string; providerName: string; modelId: string; modelName: string }[] = [];
    for (const p of AI_PROVIDERS) {
      for (const m of p.models) {
        fallback.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name ?? m.id,
        });
      }
    }
    return fallback.sort((a, b) => {
      const orderA = AI_PROVIDERS.findIndex((x) => x.id === a.providerId);
      const orderB = AI_PROVIDERS.findIndex((x) => x.id === b.providerId);
      if (orderA !== orderB) return orderA - orderB;
      return a.modelName.localeCompare(b.modelName);
    });
  }, [validateAllResultsByKeyId, currentKeys]);

  /** 篩選後的列（依公司） */
  const filteredRows = useMemo(() => {
    if (!filterProviderId) return allRows;
    return allRows.filter((r) => r.providerId === filterProviderId);
  }, [allRows, filterProviderId]);

  /** 單列狀態：與「狀態」欄顯示邏輯一致 */
  const getRowStatus = useCallback(
    (key: string, ev: ModelEvaluation | undefined): 'working' | 'not_working' | 'untested' => {
      const sessionResult = testResultByKey[key];
      if (sessionResult === true) return 'working';
      if (sessionResult === false) return 'not_working';
      if (ev?.is_working) return 'working';
      if (ev && !ev.is_working) return 'not_working';
      return 'untested';
    },
    [testResultByKey]
  );

  const evaluationMap = useMemo(() => {
    const map = new Map<string, ModelEvaluation>();
    for (const e of savedEvaluations) {
      map.set(`${e.provider}::${e.model_id}`, e);
    }
    return map;
  }, [savedEvaluations]);

  /** 再依狀態篩選（可用/不可用/尚未測試） */
  const rowsAfterStatusFilter = useMemo(() => {
    if (!filterStatus) return filteredRows;
    return filteredRows.filter((r) => {
      const key = `${r.providerId}::${r.modelId}`;
      const ev = evaluationMap.get(key);
      return getRowStatus(key, ev) === filterStatus;
    });
  }, [filteredRows, filterStatus, evaluationMap, getRowStatus]);

  /** 表格內出現的公司清單（用於篩選下拉） */
  const providersInTable = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of allRows) {
      if (!seen.has(r.providerId)) seen.set(r.providerId, r.providerName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows]);

  const selectedSet = useMemo(
    () => new Set(savedModels.map((m) => `${m.provider}::${m.model_id}`)),
    [savedModels],
  );

  const handleToggleSelected = async (
    providerId: string,
    modelId: string,
    modelName: string,
    checked: boolean
  ) => {
    if (!onSaveModels) return;
    const current = savedModels.filter((m) => m.provider === providerId);
    let newSelections: { modelId: string; modelName: string; isPrimary: boolean }[];
    if (checked) {
      const existingIds = new Set(current.map((m) => m.model_id));
      if (existingIds.has(modelId)) return;
      newSelections = [
        ...current.map((m, i) => ({
          modelId: m.model_id,
          modelName: m.model_name ?? m.model_id,
          isPrimary: i === 0,
        })),
        { modelId, modelName: modelName || modelId, isPrimary: current.length === 0 },
      ];
    } else {
      newSelections = current
        .filter((m) => m.model_id !== modelId)
        .map((m, i) => ({
          modelId: m.model_id,
          modelName: m.model_name ?? m.model_id,
          isPrimary: i === 0,
        }));
    }
    await onSaveModels(providerId, newSelections);
  };

  /** 全選/取消全選：僅作用於目前篩選後的列 */
  const filteredSelectedCount = useMemo(
    () => rowsAfterStatusFilter.filter((r) => selectedSet.has(`${r.providerId}::${r.modelId}`)).length,
    [rowsAfterStatusFilter, selectedSet]
  );
  const allFilteredSelected = rowsAfterStatusFilter.length > 0 && filteredSelectedCount === rowsAfterStatusFilter.length;
  const someFilteredSelected = filteredSelectedCount > 0;

  const handleSelectAllFiltered = useCallback(
    async (checked: boolean) => {
      if (!onSaveModels) return;
      const byProvider = new Map<string, { modelId: string; modelName: string }[]>();
      for (const r of rowsAfterStatusFilter) {
        const list = byProvider.get(r.providerId) ?? [];
        list.push({ modelId: r.modelId, modelName: r.modelName });
        byProvider.set(r.providerId, list);
      }
      for (const [providerId, models] of byProvider) {
        const current = savedModels.filter((m) => m.provider === providerId);
        let newSelections: { modelId: string; modelName: string; isPrimary: boolean }[];
        if (checked) {
          const existingIds = new Set(current.map((m) => m.model_id));
          const toAdd = models.filter((m) => !existingIds.has(m.modelId));
          newSelections = [
            ...current.map((m, i) => ({
              modelId: m.model_id,
              modelName: m.model_name ?? m.model_id,
              isPrimary: i === 0,
            })),
            ...toAdd.map((m, i) => ({
              modelId: m.modelId,
              modelName: m.modelName,
              isPrimary: current.length === 0 && i === 0,
            })),
          ];
        } else {
          const toRemove = new Set(models.map((m) => m.modelId));
          newSelections = current
            .filter((m) => !toRemove.has(m.model_id))
            .map((m, i) => ({
              modelId: m.model_id,
              modelName: m.model_name ?? m.model_id,
              isPrimary: i === 0,
            }));
        }
        await onSaveModels(providerId, newSelections);
      }
    },
    [onSaveModels, rowsAfterStatusFilter, savedModels]
  );

  const runTest = useCallback(
    async (providerId: string, modelId: string, modelName: string) => {
      const key = `${providerId}::${modelId}`;
      setTestingKey(key);
      setOutputByKey((prev) => ({ ...prev, [key]: '' }));
      try {
        const result = await onTestModel(providerId, modelId, testPrompt.trim() || undefined);
        setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
        const output = result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
        setOutputByKey((prev) => ({ ...prev, [key]: output }));

        // Auto-save result to DB so next page load shows cached result without re-testing
        const existing = evaluationMap.get(key);
        try {
          await onSave([{
            ...(existing?.id ? { id: existing.id } : {}),
            provider: providerId,
            model_id: modelId,
            model_name: existing?.model_name ?? modelName,
            is_working: result.success,
            specialties: existing?.specialties ?? [],
            is_candidate: existing?.is_candidate ?? false,
            notes: output || existing?.notes || '',
            last_tested_at: new Date().toISOString(),
          }]);
        } catch (saveErr) {
          console.warn('[ModelEvaluator] 測試結果自動儲存失敗', saveErr);
        }
      } catch {
        setTestResultByKey((prev) => ({ ...prev, [key]: false }));
        setOutputByKey((prev) => ({ ...prev, [key]: '請求失敗' }));
      } finally {
        setTestingKey(null);
      }
    },
    [onTestModel, testPrompt, onSave, evaluationMap]
  );

  /** 全部測試：對目前篩選結果中「有金鑰」的模型逐一測試，完成後一次批量寫入 DB */
  const handleBatchTest = useCallback(async () => {
    const toTest = rowsAfterStatusFilter.filter((r) => validProviders.has(r.providerId));
    if (toTest.length === 0) return;
    setBatchTesting(true);
    const toSave: ModelEvaluation[] = [];
    for (const { providerId, modelId, modelName } of toTest) {
      const key = `${providerId}::${modelId}`;
      setTestingKey(key);
      setOutputByKey((prev) => ({ ...prev, [key]: '' }));
      try {
        const result = await onTestModel(providerId, modelId, testPrompt.trim() || undefined);
        setTestResultByKey((prev) => ({ ...prev, [key]: result.success }));
        const output = result.output ?? (result.message && !result.success ? `錯誤：${result.message}` : '');
        setOutputByKey((prev) => ({ ...prev, [key]: output }));

        const existing = evaluationMap.get(key);
        toSave.push({
          ...(existing?.id ? { id: existing.id } : {}),
          provider: providerId,
          model_id: modelId,
          model_name: existing?.model_name ?? modelName,
          is_working: result.success,
          specialties: existing?.specialties ?? [],
          is_candidate: existing?.is_candidate ?? false,
          notes: output || existing?.notes || '',
          last_tested_at: new Date().toISOString(),
        });
      } catch {
        setTestResultByKey((prev) => ({ ...prev, [key]: false }));
        setOutputByKey((prev) => ({ ...prev, [key]: '請求失敗' }));
      } finally {
        setTestingKey(null);
      }
    }
    // Batch save all results at once
    if (toSave.length > 0) {
      try {
        await onSave(toSave);
      } catch (saveErr) {
        console.warn('[ModelEvaluator] 批次測試結果儲存失敗', saveErr);
      }
    }
    setBatchTesting(false);
  }, [rowsAfterStatusFilter, validProviders, onTestModel, testPrompt, onSave, evaluationMap]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-bg-tertiary p-3">
        <label className="block text-xs font-semibold text-text-secondary mb-1.5">測試用 Prompt（輸入後點該列「測試」可取得該模型回覆）</label>
        <textarea
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          placeholder="你是哪家公司AI？你的模型型號是？今天幾號？"
          rows={2}
          className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[60px]"
        />
      </div>
      <div className="rounded-lg border border-border-subtle overflow-hidden bg-bg-primary">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-border-subtle bg-bg-tertiary">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                }}
                onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                disabled={!onSaveModels || rowsAfterStatusFilter.length === 0}
                className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
              />
              <span>全選</span>
            </label>
            <span className="text-text-muted text-xs">
              （目前可選模型 {rowsAfterStatusFilter.length} 筆，已選 {filteredSelectedCount} 筆）
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-text-muted shrink-0" />
            <select
              value={filterProviderId}
              onChange={(e) => setFilterProviderId(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-[140px]"
            >
              <option value="">全部公司</option>
              {providersInTable.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-[120px]"
            >
              <option value="">全部狀態</option>
              <option value="working">可用</option>
              <option value="not_working">不可用</option>
              <option value="untested">尚未測試</option>
            </select>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchTest}
              isLoading={batchTesting}
              disabled={batchTesting || rowsAfterStatusFilter.filter((r) => validProviders.has(r.providerId)).length === 0}
              title="對目前篩選結果中所有有金鑰的模型逐一測試"
            >
              {batchTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              <span className="ml-1.5">全部測試</span>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-tertiary">
                <th className="text-left py-3 px-3 font-semibold text-text-secondary w-12">已選</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary">公司名稱</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary">模型名稱與版本型號</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary w-20">狀態</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary min-w-[120px]">Prompt input</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary min-w-[200px]">Prompt output</th>
                <th className="text-left py-3 px-3 font-semibold text-text-secondary">測試日期</th>
                <th className="text-right py-3 px-3 font-semibold text-text-secondary w-20">測試</th>
              </tr>
            </thead>
            <tbody>
              {rowsAfterStatusFilter.map(({ providerId, providerName, modelId, modelName }) => {
                const key = `${providerId}::${modelId}`;
                const isSelected = selectedSet.has(key);
                const ev = evaluationMap.get(key);
                const hasKey = validProviders.has(providerId);
                const isTesting = testingKey === key;
                const output = outputByKey[key];
                return (
                  <tr
                    key={key}
                    className={`border-b border-border-subtle transition-colors ${
                      isSelected ? 'bg-accent/5' : 'bg-bg-primary hover:bg-bg-secondary'
                    }`}
                  >
                    <td className="py-2.5 px-3 align-middle">
                      <label className="flex items-center justify-center w-5 h-5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            onSaveModels
                              ? handleToggleSelected(
                                  providerId,
                                  modelId,
                                  modelName,
                                  e.target.checked
                                )
                              : undefined
                          }
                          disabled={!onSaveModels}
                          className="sr-only peer"
                        />
                        <div className="w-5 h-5 rounded border border-border-subtle bg-bg-primary peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center transition-colors">
                          {isSelected && (
                            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                              <path
                                d="M1 5L4 8L11 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </label>
                    </td>
                    <td className="py-2.5 px-3 text-text-primary">{providerName}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-text-primary">{modelName}</span>
                      <span className="ml-1 font-mono text-text-muted">{modelId}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {(() => {
                        const sessionResult = testResultByKey[key];
                        if (sessionResult === true) {
                          return (
                            <span className="inline-flex items-center gap-1 text-green-400">
                              <CheckCircle2 size={12} /> 可用
                            </span>
                          );
                        }
                        if (sessionResult === false) {
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <XCircle size={12} /> 不可用
                            </span>
                          );
                        }
                        if (ev?.is_working) {
                          return (
                            <span className="inline-flex items-center gap-1 text-green-400">
                              <CheckCircle2 size={12} /> 可用
                            </span>
                          );
                        }
                        if (ev && !ev.is_working) {
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <XCircle size={12} /> 不可用
                            </span>
                          );
                        }
                        return (
                          <span className="text-text-muted">
                            {hasKey ? '未測試' : '—'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 align-top text-text-muted max-w-[200px]">
                      <span className="line-clamp-2 break-words" title={testPrompt || undefined}>
                        {testPrompt || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1 text-text-muted">
                          <Loader2 size={12} className="animate-spin" /> 測試中…
                        </span>
                      ) : (
                        <span className="text-text-secondary whitespace-pre-wrap break-words">
                          {output || ev?.notes || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {ev?.last_tested_at
                        ? new Date(ev.last_tested_at).toLocaleDateString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runTest(providerId, modelId, modelName)}
                        disabled={!hasKey || isTesting}
                        title={hasKey ? '用上方 Prompt 測試此模型' : '需先設定 API 金鑰'}
                      >
                        {isTesting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FlaskConical size={14} />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
