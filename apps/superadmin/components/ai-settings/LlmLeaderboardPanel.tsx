'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { Button } from '@/components/ui/Button';
import {
  ARTIFICIAL_ANALYSIS_SITE_ORIGIN,
  type ArtificialAnalysisLlmLeaderboardRow,
} from '@/lib/artificial-analysis/llm-leaderboard';

/** Poll upstream HTML mirror once per day (client tab open). */
const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000;

const TABLE_ID = 'artificial_analysis_llm_leaderboard';

const INITIAL_WIDTHS = [20, 7, 11, 9, 9, 8, 9, 9, 18];

type ApiOk = {
  fetchedAt: string;
  sourceUrl: string;
  rowCount: number;
  rows: ArtificialAnalysisLlmLeaderboardRow[];
};

type ApiErr = { error: string; sourceUrl?: string };
type SizeFilter = 'all' | 'small' | 'mid' | 'large';
type PriceFilter = 'all' | 'known' | 'cheap' | 'mid' | 'expensive' | 'missing';
type ReasoningFilter = 'all' | 'reasoning' | 'non-reasoning';
type StatusFilter = 'current' | 'all';

function formatContextWindow(n: number | null): string {
  if (n == null) return '--';
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1).replace(/\.?0+$/, '')}k`;
  }
  return String(n);
}

function formatPrice(n: number | null): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function formatMetric(n: number | null, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return (
    m.includes('reasoning') ||
    m.includes('(high)') ||
    m.includes('(xhigh)') ||
    m.includes('(medium)') ||
    m.includes('(low)')
  );
}

export function LlmLeaderboardPanel() {
  const [rows, setRows] = useState<ArtificialAnalysisLlmLeaderboardRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('current');

  const load = useCallback(async (isManual: boolean) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/artificial-analysis/llm-leaderboard', { cache: 'no-store' });
      const data = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || 'error' in data) {
        const msg = 'error' in data ? data.error : '載入失敗';
        setError(msg);
        if (!isManual) setRows([]);
        return;
      }
      setRows(data.rows);
      setFetchedAt(data.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(false);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const columns = useMemo<ColumnDef<ArtificialAnalysisLlmLeaderboardRow, unknown>[]>(
    () => [
      {
        accessorKey: 'model',
        header: 'Model',
        meta: { headerZh: '模型' },
        cell: ({ row }) => (
          <span className="font-medium text-text-primary text-left">{row.original.model}</span>
        ),
      },
      {
        // Numbers like 128000, 1000000 — sorted natively by TanStack.
        // Unit "(tokens)" lives in the header, cell shows thousand-separated.
        accessorKey: 'contextWindowTokens',
        header: 'Context (tokens)',
        meta: { headerZh: 'Context Window' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatContextWindow(row.original.contextWindowTokens)}
          </span>
        ),
      },
      {
        accessorKey: 'creator',
        header: 'Creator',
        meta: { headerZh: '開發商' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block">{row.original.creator}</span>
        ),
      },
      {
        accessorKey: 'intelligenceIndex',
        header: 'AA Intelligence',
        meta: { headerZh: 'Intelligence Index' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatMetric(row.original.intelligenceIndex, 0)}
          </span>
        ),
      },
      {
        accessorKey: 'blendedUsdPer1m',
        header: 'Price (USD/1M)',
        meta: { headerZh: '價格 (USD/1M)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatPrice(row.original.blendedUsdPer1m)}
          </span>
        ),
      },
      {
        accessorKey: 'medianTokensPerSecond',
        header: 'Output (tok/s)',
        meta: { headerZh: '輸出速度 (tok/s)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatMetric(row.original.medianTokensPerSecond, 0)}
          </span>
        ),
      },
      {
        accessorKey: 'latencyFirstChunkSeconds',
        header: 'Latency (s)',
        meta: { headerZh: '首包延遲 (秒)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatMetric(row.original.latencyFirstChunkSeconds, 2)}
          </span>
        ),
      },
      {
        accessorKey: 'totalResponseSeconds',
        header: 'Total resp. (s)',
        meta: { headerZh: '總回應 (秒)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {formatMetric(row.original.totalResponseSeconds, 2)}
          </span>
        ),
      },
      {
        id: 'links',
        header: 'Further analysis',
        meta: { headerZh: '延伸' },
        cell: ({ row }) => {
          const { modelPath, providersPath } = row.original;
          const m = modelPath ? `${ARTIFICIAL_ANALYSIS_SITE_ORIGIN}${modelPath}` : null;
          const p = providersPath ? `${ARTIFICIAL_ANALYSIS_SITE_ORIGIN}${providersPath}` : null;
          return (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {m && (
                <a
                  href={m}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                >
                  Model <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
              {p && (
                <a
                  href={p}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                >
                  Providers <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('zh-TW', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return iso;
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === 'current') {
        // Upstream "current" slice is what this endpoint fetches today.
        // Keep this branch to mirror AA's filter bar behavior.
      }

      if (sizeFilter !== 'all') {
        const ctx = row.contextWindowTokens;
        if (ctx == null) return false;
        if (sizeFilter === 'small' && ctx > 128_000) return false;
        if (sizeFilter === 'mid' && (ctx <= 128_000 || ctx > 1_000_000)) return false;
        if (sizeFilter === 'large' && ctx <= 1_000_000) return false;
      }

      if (priceFilter !== 'all') {
        const p = row.blendedUsdPer1m;
        if (priceFilter === 'missing') return p == null;
        if (p == null) return false;
        if (priceFilter === 'known') return true;
        if (priceFilter === 'cheap' && p > 1) return false;
        if (priceFilter === 'mid' && (p <= 1 || p > 5)) return false;
        if (priceFilter === 'expensive' && p <= 5) return false;
      }

      if (reasoningFilter !== 'all') {
        const reasoning = isReasoningModel(row.model);
        if (reasoningFilter === 'reasoning' && !reasoning) return false;
        if (reasoningFilter === 'non-reasoning' && reasoning) return false;
      }

      return true;
    });
  }, [rows, priceFilter, reasoningFilter, sizeFilter, statusFilter]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="text-sm">正在自 Artificial Analysis 同步排行榜…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="shrink-0 rounded-base border border-border-default bg-bg-primary/60 px-4 py-3 space-y-2">
        <p className="text-xs text-text-secondary leading-relaxed min-w-0">
          資料來源為{' '}
          <a
            href="https://artificialanalysis.ai/leaderboards/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Artificial Analysis — LLM Leaderboard
          </a>
          。欄位定義與排序以該站為準；本頁僅供內部參考，定價與指標請以官方為準。
        </p>
        <p className="text-[11px] text-text-muted min-w-0 leading-relaxed">
          上次更新：{formatTime(fetchedAt)} · 每日自動重新抓取 · 篩選後 {filteredRows.length} / 全部 {rows.length} 筆{' '}
          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="ms-1.5 align-middle"
            isLoading={refreshing}
            onClick={() => void load(true)}
          >
            <RefreshCw className="w-3 h-3" />
            立即更新排行榜
          </Button>
        </p>
      </div>

      {error && (
        <div className="shrink-0 rounded-base border border-border-default bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
          <p className="text-text-primary font-medium mb-1">無法取得最新資料</p>
          <p>{error}</p>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EnhancedTable<ArtificialAnalysisLlmLeaderboardRow>
        tableId={TABLE_ID}
        columns={columns}
        data={filteredRows}
        initialWidths={INITIAL_WIDTHS}
        pageSizes={[25, 50, 100, 200]}
        minWidth={1200}
        fillAvailableHeight
        searchPlaceholder="Filter, e.g. GPT, Meta"
        getSearchValue={(row) =>
          [
            row.model,
            row.creator,
            row.contextWindowTokens ?? '',
            row.intelligenceIndex ?? '',
            row.blendedUsdPer1m ?? '',
            row.medianTokensPerSecond ?? '',
            isReasoningModel(row.model) ? 'reasoning' : 'non-reasoning',
          ].join(' ')
        }
        extraToolbar={
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] text-text-muted">Weights:</label>
            <span className="rounded-full border border-border-default px-2 py-1 text-[11px] text-text-secondary">
              All
            </span>
            <label className="text-[11px] text-text-muted">Size:</label>
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
              className="h-7 rounded-md border border-border-default bg-bg-secondary px-2 text-[11px] text-text-secondary"
            >
              <option value="all">All</option>
              <option value="small">&le; 128k</option>
              <option value="mid">128k - 1M</option>
              <option value="large">&gt; 1M</option>
            </select>
            <label className="text-[11px] text-text-muted">Price:</label>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              className="h-7 rounded-md border border-border-default bg-bg-secondary px-2 text-[11px] text-text-secondary"
            >
              <option value="all">All</option>
              <option value="known">Known</option>
              <option value="cheap">&le; $1</option>
              <option value="mid">$1 - $5</option>
              <option value="expensive">&gt; $5</option>
              <option value="missing">Missing</option>
            </select>
            <label className="text-[11px] text-text-muted">Reasoning:</label>
            <select
              value={reasoningFilter}
              onChange={(e) => setReasoningFilter(e.target.value as ReasoningFilter)}
              className="h-7 rounded-md border border-border-default bg-bg-secondary px-2 text-[11px] text-text-secondary"
            >
              <option value="all">All</option>
              <option value="reasoning">Reasoning</option>
              <option value="non-reasoning">Non-reasoning</option>
            </select>
            <label className="text-[11px] text-text-muted">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-7 rounded-md border border-border-default bg-bg-secondary px-2 text-[11px] text-text-secondary"
            >
              <option value="current">Current</option>
              <option value="all">All</option>
            </select>
          </div>
        }
        />
      </div>
    </div>
  );
}
