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

// Cells render plain numbers; units live in the column header (e.g.
// "Price (USD/1M)"). This lets TanStack's default numeric sort work out
// of the box without any custom sortingFn. Missing values render as "—".

const PLACEHOLDER = '—';

function fmtNumber(
  n: number | null,
  opts?: { decimals?: number; withCommas?: boolean },
): string {
  if (n == null) return PLACEHOLDER;
  const decimals = opts?.decimals;
  const withCommas = opts?.withCommas ?? false;
  if (withCommas) {
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    });
  }
  if (typeof decimals === 'number') return n.toFixed(decimals);
  return String(n);
}

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

export function LlmLeaderboardPanel() {
  const [rows, setRows] = useState<ArtificialAnalysisLlmLeaderboardRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
            {fmtNumber(row.original.contextWindowTokens, { withCommas: true })}
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
            {fmtNumber(row.original.intelligenceIndex)}
          </span>
        ),
      },
      {
        accessorKey: 'blendedUsdPer1m',
        header: 'Price (USD/1M)',
        meta: { headerZh: '價格 (USD/1M)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {fmtNumber(row.original.blendedUsdPer1m, { decimals: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'medianTokensPerSecond',
        header: 'Output (tok/s)',
        meta: { headerZh: '輸出速度 (tok/s)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {fmtNumber(row.original.medianTokensPerSecond, { decimals: 1 })}
          </span>
        ),
      },
      {
        accessorKey: 'latencyFirstChunkSeconds',
        header: 'Latency (s)',
        meta: { headerZh: '首包延遲 (秒)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {fmtNumber(row.original.latencyFirstChunkSeconds, { decimals: 2 })}
          </span>
        ),
      },
      {
        accessorKey: 'totalResponseSeconds',
        header: 'Total resp. (s)',
        meta: { headerZh: '總回應 (秒)' },
        cell: ({ row }) => (
          <span className="text-text-secondary text-center block font-mono">
            {fmtNumber(row.original.totalResponseSeconds, { decimals: 2 })}
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

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="text-sm">正在自 Artificial Analysis 同步排行榜…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="rounded-base border border-border-default bg-bg-primary/60 px-4 py-3 space-y-2">
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
          上次更新：{formatTime(fetchedAt)} · 每日自動重新抓取 · 共 {rows.length} 筆{' '}
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
        <div className="rounded-base border border-border-default bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
          <p className="text-text-primary font-medium mb-1">無法取得最新資料</p>
          <p>{error}</p>
        </div>
      )}

      <EnhancedTable<ArtificialAnalysisLlmLeaderboardRow>
        tableId={TABLE_ID}
        columns={columns}
        data={rows}
        initialWidths={INITIAL_WIDTHS}
        pageSizes={[25, 50, 100, 200]}
        minWidth={1200}
        getSearchValue={(row) =>
          [
            row.model,
            row.creator,
            row.contextWindowTokens ?? '',
            row.intelligenceIndex ?? '',
            row.blendedUsdPer1m ?? '',
            row.medianTokensPerSecond ?? '',
          ].join(' ')
        }
        extraToolbar={
          <span className="text-[11px] text-text-muted whitespace-nowrap">
            欄位對應：Model · Context · Creator · Intelligence · Price · Speed · Latency · Total · Links
          </span>
        }
      />
    </div>
  );
}
