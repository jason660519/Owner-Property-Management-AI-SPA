'use client';

// Model Research Report sheet — runs a user-selected evaluator LLM (each must
// support native web search) over each validated AI model and caches the
// structured pricing / capability report in the DB. Strict cache-first: opening
// the tab shows last-known reports; users hit the per-row ⟳ button or the
// batch action to (re)generate.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  Globe,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';

import EnhancedTable from '@/components/ui/EnhancedTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MarkdownViewer } from '@/components/docs/MarkdownViewer';
import {
  getAvailableModelsList,
  type KeyWithId,
} from '@/lib/utils/total-available-models';
import { getModelDisplayName } from '@/components/ai-settings/model-evaluator/utils';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResearchStatus = 'pending' | 'researching' | 'done' | 'failed';

export interface ResearchReport {
  id: string;
  user_id: string;
  provider: string;
  model_id: string;
  model_name: string;
  company_name: string | null;
  version_label: string | null;
  input_price_per_1m: number | null;
  output_price_per_1m: number | null;
  context_window: number | null;
  knowledge_cutoff: string | null;
  capabilities: string[];
  source_urls: string[];
  report_markdown: string;
  generator_model: string;
  generator_provider: string;
  generation_status: ResearchStatus;
  generation_error: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchRow {
  key: string; // `${provider}:${modelId}`
  provider: string;
  providerName: string;
  modelId: string;
  modelName: string;
  report: ResearchReport | null;
}

interface ModelResearchReportProps {
  savedKeys: SavedKey[];
  validateAllResultsByKeyId: Record<string, KeyValidationResult>;
  currentKeys: KeyWithId[];
  userId: string;
}

// ---------------------------------------------------------------------------
// Evaluator catalog — providers/models that can act as the research evaluator.
// Each provider here must have native web search in its API. DeepSeek is
// intentionally excluded (no API-level web_search tool).
// ---------------------------------------------------------------------------

export interface EvaluatorModelOption {
  id: string;
  label: string;
}

export interface EvaluatorProviderOption {
  id: string;
  name: string;
  models: EvaluatorModelOption[];
}

export const EVALUATOR_CATALOG: EvaluatorProviderOption[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-4o', label: 'GPT-4o' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    models: [
      { id: 'grok-4', label: 'Grok 4 (Live Search)' },
      { id: 'grok-3', label: 'Grok 3 (Live Search)' },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    models: [
      { id: 'sonar-pro', label: 'Sonar Pro' },
      { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
      { id: 'sonar-deep-research', label: 'Sonar Deep Research' },
      { id: 'sonar', label: 'Sonar' },
    ],
  },
];

export interface EvaluatorSelection {
  provider: string;
  model: string;
}

const DEFAULT_EVALUATOR: EvaluatorSelection = {
  provider: 'anthropic',
  model: 'claude-opus-4-6',
};
const LS_EVALUATOR_SELECTION = 'ai-settings:model-research:evaluator';
const INITIAL_WIDTHS = [16, 18, 11, 11, 11, 10, 11, 7, 5];

function rowKey(provider: string, modelId: string): string {
  return `${provider}:${modelId}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toFixed(2)}`;
}

function formatContextWindow(value: number | null | undefined): string {
  if (!value) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelResearchReport({
  savedKeys,
  validateAllResultsByKeyId,
  currentKeys,
  userId,
}: ModelResearchReportProps) {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingKeys, setGeneratingKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Set of provider ids that the user has a validated key for.
  const validatedProviderIds = useMemo(() => {
    const s = new Set<string>();
    for (const k of savedKeys) {
      if (k.is_valid === true) s.add(k.provider);
    }
    return s;
  }, [savedKeys]);

  // Filter EVALUATOR_CATALOG down to providers whose keys the user actually has.
  const availableEvaluators = useMemo(
    () => EVALUATOR_CATALOG.filter((p) => validatedProviderIds.has(p.id)),
    [validatedProviderIds]
  );

  // Evaluator selection (persisted in localStorage). When the selected provider
  // disappears (e.g. user deleted the key), fall back to the first available.
  const [evaluator, setEvaluator] = useState<EvaluatorSelection>(() =>
    readLocalStorage<EvaluatorSelection>(LS_EVALUATOR_SELECTION, DEFAULT_EVALUATOR)
  );

  useEffect(() => {
    if (availableEvaluators.length === 0) return;
    const providerStillOk = availableEvaluators.some((p) => p.id === evaluator.provider);
    if (!providerStillOk) {
      const firstProvider = availableEvaluators[0];
      const firstModel = firstProvider.models[0];
      const next = { provider: firstProvider.id, model: firstModel.id };
      setEvaluator(next);
      writeLocalStorage(LS_EVALUATOR_SELECTION, next);
      return;
    }
    // Verify the selected model still exists on that provider
    const providerInfo = availableEvaluators.find((p) => p.id === evaluator.provider);
    const modelOk = providerInfo?.models.some((m) => m.id === evaluator.model);
    if (!modelOk && providerInfo) {
      const next = { provider: evaluator.provider, model: providerInfo.models[0].id };
      setEvaluator(next);
      writeLocalStorage(LS_EVALUATOR_SELECTION, next);
    }
  }, [availableEvaluators, evaluator.provider, evaluator.model]);

  const setEvaluatorProvider = useCallback(
    (providerId: string) => {
      const providerInfo = availableEvaluators.find((p) => p.id === providerId);
      if (!providerInfo) return;
      const next = { provider: providerId, model: providerInfo.models[0].id };
      setEvaluator(next);
      writeLocalStorage(LS_EVALUATOR_SELECTION, next);
    },
    [availableEvaluators]
  );

  const setEvaluatorModel = useCallback(
    (modelId: string) => {
      setEvaluator((prev) => {
        const next = { ...prev, model: modelId };
        writeLocalStorage(LS_EVALUATOR_SELECTION, next);
        return next;
      });
    },
    []
  );

  const hasEvaluatorKey = availableEvaluators.length > 0;
  const currentEvaluatorProvider = availableEvaluators.find((p) => p.id === evaluator.provider);
  const evaluatorProviderName = currentEvaluatorProvider?.name ?? evaluator.provider;
  const evaluatorModelLabel =
    currentEvaluatorProvider?.models.find((m) => m.id === evaluator.model)?.label ?? evaluator.model;

  // ----- Data fetch ---------------------------------------------------------

  const fetchReports = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/ai-settings/model-research', {
        headers: { 'x-user-id': userId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reports?: ResearchReport[]; error?: string };
      if (data.error) throw new Error(data.error);
      setReports(data.reports ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ----- Build rows: validated models LEFT JOIN reports ---------------------

  const rows = useMemo<ResearchRow[]>(() => {
    const validated = getAvailableModelsList(validateAllResultsByKeyId, currentKeys);
    const reportByKey = new Map<string, ResearchReport>();
    for (const r of reports) {
      reportByKey.set(rowKey(r.provider, r.model_id), r);
    }
    return validated
      .map(({ providerId, modelId }) => {
        const providerInfo = AI_PROVIDERS.find((p) => p.id === providerId);
        return {
          key: rowKey(providerId, modelId),
          provider: providerId,
          providerName: providerInfo?.name ?? providerId,
          modelId,
          modelName: getModelDisplayName(providerId, modelId),
          report: reportByKey.get(rowKey(providerId, modelId)) ?? null,
        };
      })
      .sort((a, b) => a.providerName.localeCompare(b.providerName) || a.modelName.localeCompare(b.modelName));
  }, [reports, validateAllResultsByKeyId, currentKeys]);

  // ----- Generation ---------------------------------------------------------

  const runGenerate = useCallback(
    async (targets: ResearchRow[]) => {
      if (!hasEvaluatorKey) {
        setError('請先在「API 金鑰管理」設定並驗證至少一個支援網路搜尋的評審金鑰');
        return;
      }
      if (targets.length === 0) return;

      const newGenerating = new Set(generatingKeys);
      targets.forEach((t) => newGenerating.add(t.key));
      setGeneratingKeys(newGenerating);
      setError(null);

      try {
        const res = await fetch('/api/ai-settings/model-research/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            evaluatorProvider: evaluator.provider,
            evaluatorModel: evaluator.model,
            targets: targets.map((t) => ({
              provider: t.provider,
              modelId: t.modelId,
              modelName: t.modelName,
            })),
          }),
        });
        const data = (await res.json()) as { reports?: ResearchReport[]; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        // Replace fetched reports
        await fetchReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成失敗');
      } finally {
        setGeneratingKeys((prev) => {
          const next = new Set(prev);
          targets.forEach((t) => next.delete(t.key));
          return next;
        });
      }
    },
    [hasEvaluatorKey, generatingKeys, userId, fetchReports, evaluator.provider, evaluator.model]
  );

  const handleDelete = useCallback(
    async (row: ResearchRow) => {
      if (!row.report) return;
      try {
        const url = `/api/ai-settings/model-research?provider=${encodeURIComponent(row.provider)}&model_id=${encodeURIComponent(row.modelId)}`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchReports();
      } catch (err) {
        setError(err instanceof Error ? err.message : '刪除失敗');
      }
    },
    [userId, fetchReports]
  );

  // ----- Toggle expand row --------------------------------------------------

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ----- Columns ------------------------------------------------------------

  const columns = useMemo<ColumnDef<ResearchRow, unknown>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const open = expandedKeys.has(r.key);
          if (!r.report || r.report.generation_status !== 'done') {
            return <span className="text-text-muted/40">—</span>;
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(r.key);
              }}
              className="p-1 text-text-muted hover:text-accent transition-colors"
              aria-label={open ? '收合報告' : '展開報告'}
            >
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          );
        },
      },
      {
        accessorKey: 'providerName',
        header: '公司',
        cell: ({ row }) => (
          <span className="font-medium text-text-primary">
            {row.original.report?.company_name || row.original.providerName}
          </span>
        ),
      },
      {
        accessorKey: 'modelName',
        header: '模型',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-text-primary">{row.original.modelName}</span>
            <span className="text-[10px] text-text-muted font-mono">{row.original.modelId}</span>
          </div>
        ),
      },
      {
        id: 'version',
        header: '版本',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-text-secondary">
            {row.original.report?.version_label ?? '—'}
          </span>
        ),
      },
      {
        id: 'input_price',
        header: 'Input $/1M',
        cell: ({ row }) => (
          <span className="text-xs font-mono text-text-secondary">
            {formatPrice(row.original.report?.input_price_per_1m)}
          </span>
        ),
      },
      {
        id: 'output_price',
        header: 'Output $/1M',
        cell: ({ row }) => (
          <span className="text-xs font-mono text-text-secondary">
            {formatPrice(row.original.report?.output_price_per_1m)}
          </span>
        ),
      },
      {
        id: 'context_window',
        header: 'Context',
        cell: ({ row }) => (
          <span className="text-xs font-mono text-text-secondary">
            {formatContextWindow(row.original.report?.context_window)}
          </span>
        ),
      },
      {
        id: 'capabilities',
        header: '能力',
        enableSorting: false,
        cell: ({ row }) => {
          const caps = row.original.report?.capabilities ?? [];
          if (caps.length === 0) return <span className="text-text-muted/40 text-xs">—</span>;
          const shown = caps.slice(0, 3);
          const rest = caps.length - 3;
          return (
            <div className="flex flex-wrap gap-1">
              {shown.map((c) => (
                <Badge key={c} variant="info" size="sm">
                  {c}
                </Badge>
              ))}
              {rest > 0 && (
                <Badge variant="default" size="sm">
                  +{rest}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: 'sources',
        header: '來源',
        enableSorting: false,
        cell: ({ row }) => {
          const urls = row.original.report?.source_urls ?? [];
          if (urls.length === 0) return <span className="text-text-muted/40 text-xs">—</span>;
          return (
            <span
              className="text-xs text-accent cursor-help"
              title={urls.join('\n')}
            >
              {urls.length} 個來源
            </span>
          );
        },
      },
      {
        id: 'generated_at',
        header: '最後生成',
        cell: ({ row }) => {
          const r = row.original.report;
          if (!r) return <span className="text-text-muted/40 text-xs">尚未生成</span>;
          if (r.generation_status === 'researching') {
            return (
              <span className="text-xs text-accent inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                生成中…
              </span>
            );
          }
          if (r.generation_status === 'failed') {
            return (
              <Badge variant="error" size="sm" title={r.generation_error ?? ''}>
                失敗
              </Badge>
            );
          }
          return (
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatDate(r.generated_at)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '操作',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const generating = generatingKeys.has(r.key);
          return (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={generating || !hasEvaluatorKey}
                onClick={(e) => {
                  e.stopPropagation();
                  runGenerate([r]);
                }}
                className="p-1.5 text-text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={r.report ? '重新生成' : '生成報告'}
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
              {r.report && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r);
                  }}
                  className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                  title="刪除報告"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [expandedKeys, generatingKeys, hasEvaluatorKey, runGenerate, handleDelete, toggleExpand]
  );

  // ----- Search / category accessors ----------------------------------------

  const getSearchValue = useCallback(
    (row: ResearchRow) =>
      [
        row.providerName,
        row.modelName,
        row.modelId,
        row.report?.company_name ?? '',
        row.report?.version_label ?? '',
        (row.report?.capabilities ?? []).join(' '),
      ].join(' '),
    []
  );

  const getCategoryValue = useCallback((row: ResearchRow) => row.providerName, []);

  // ----- Batch action -------------------------------------------------------

  const renderBatchActions = useCallback(
    (selected: ResearchRow[], clearSelection: () => void) => {
      const generating = selected.some((r) => generatingKeys.has(r.key));
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">已選取 {selected.length} 筆</span>
          <Button
            variant="primary"
            size="xs"
            disabled={!hasEvaluatorKey || generating || selected.length === 0}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => runGenerate(selected)}
          >
            批次生成
          </Button>
          <Button variant="ghost" size="xs" onClick={clearSelection}>
            取消選取
          </Button>
        </div>
      );
    },
    [hasEvaluatorKey, generatingKeys, runGenerate]
  );

  // ----- Render -------------------------------------------------------------

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        載入中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer banner */}
      <div
        role="alert"
        className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong>免責聲明：</strong>
          報告內容由 LLM 自動產生並透過網路搜尋彙整，
          <strong>定價與規格僅供參考，請以各家官方頁面為準。</strong>
          每份報告生成時間請見「最後生成」欄位；資料可能已過期。
        </div>
      </div>

      {/* Toolbar — evaluator picker (provider + model) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>評審：</span>
          <select
            aria-label="評審廠商"
            value={evaluator.provider}
            onChange={(e) => setEvaluatorProvider(e.target.value)}
            disabled={!hasEvaluatorKey}
            className="text-xs px-2 py-1 rounded border border-border-default bg-bg-secondary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {availableEvaluators.length === 0 ? (
              <option value="">（無可用評審）</option>
            ) : (
              availableEvaluators.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
          <select
            aria-label="評審模型"
            value={evaluator.model}
            onChange={(e) => setEvaluatorModel(e.target.value)}
            disabled={!hasEvaluatorKey || !currentEvaluatorProvider}
            className="text-xs px-2 py-1 rounded border border-border-default bg-bg-secondary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {currentEvaluatorProvider ? (
              currentEvaluatorProvider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))
            ) : (
              <option value="">—</option>
            )}
          </select>
          <Badge variant="info" size="sm" title={`${evaluatorProviderName} · ${evaluatorModelLabel}`}>
            web search
          </Badge>
          <span className="text-text-muted">{rows.length} 個已驗證模型</span>
        </div>
        {!hasEvaluatorKey && (
          <div className="text-xs text-amber-300 inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            請先在「API 金鑰管理」設定並驗證至少一個支援網路搜尋的評審金鑰
            <span className="text-text-muted ml-1">
              (Anthropic / OpenAI / Gemini / Grok / Perplexity)
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 px-3 py-2 rounded bg-red-500/10 border border-red-500/30">
          {error}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Globe className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">尚無已驗證模型</p>
          <p className="text-xs mt-1">請先到「API 金鑰管理」分頁驗證金鑰</p>
        </div>
      ) : (
        <>
          <EnhancedTable<ResearchRow>
            tableId="model_research_reports"
            columns={columns}
            data={rows}
            initialWidths={INITIAL_WIDTHS}
            enableRowSelection
            getSearchValue={getSearchValue}
            getCategoryValue={getCategoryValue}
            renderBatchActions={renderBatchActions}
            pageSizes={[20, 50, 100]}
            minWidth={1200}
          />

          {/* Inline expanded report panels */}
          {Array.from(expandedKeys).map((key) => {
            const row = rows.find((r) => r.key === key);
            if (!row?.report || row.report.generation_status !== 'done') return null;
            return (
              <div
                key={key}
                className="border border-border-default rounded-lg p-4 bg-bg-secondary"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-default">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      {row.providerName} · {row.modelName}
                    </h4>
                    <span className="text-[11px] text-text-muted">
                      由 {row.report.generator_model} 於 {formatDate(row.report.generated_at)} 生成
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    收合
                  </button>
                </div>
                <MarkdownViewer content={row.report.report_markdown} />
                {row.report.source_urls.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border-default">
                    <div className="text-[11px] text-text-muted mb-2">來源連結：</div>
                    <ul className="space-y-1">
                      {row.report.source_urls.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

    </div>
  );
}
