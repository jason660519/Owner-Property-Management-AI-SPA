'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

import EnhancedTable from '@/components/ui/EnhancedTable';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';

import {
  createEvaluationsGlobalColumns,
  EVALUATIONS_GLOBAL_TABLE_ID,
  EVALUATIONS_GLOBAL_TABLE_INITIAL_WIDTHS,
  EVALUATIONS_GLOBAL_TABLE_MIN_WIDTH_PX,
  getEvaluationsGlobalCategoryValue,
  getEvaluationsGlobalSearchValue,
  evaluationsGlobalTopologySummary,
  type EvaluationsGlobalTableRow,
} from './evaluations-global-columns';

type AdapterEvaluationRunRecord = {
  id: string;
  created_at: string;
  result_summary: string;
  evaluation_level: string;
  http_status: number | null;
  ttft_ms: number | null;
  e2e_ms: number | null;
  requested_model: string;
  effective_model: string;
};

/** Same as the Adapter tabs bulk-run state: show elapsed seconds (1 decimal) */
function BulkRunElapsed({ startMs }: { startMs: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [startMs]);
  return (
    <span className="tabular-nums font-mono text-xs font-semibold" aria-live="polite">
      {((Date.now() - startMs) / 1000).toFixed(1)}s
    </span>
  );
}

export interface EvaluationsGlobalPanelProps {
  /** Imported from the CLI Adapter and HTTP Adapter tabs; pass + in-progress rows (SSOT) */
  importedRows: EvaluationsGlobalTableRow[];
  /** Bulk-run: run all CLI adapters first, then all HTTP adapters (same as the Adapter tabs) */
  onBulkRunAllAdapters?: () => void;
  bulkRunAllBusy?: boolean;
  bulkRunAllStartedAtMs?: number | null;
  /** Single-row "Run"; parent should dispatch to the channel-specific startAdapterRun */
  onRunRow?: (row: EvaluationsGlobalTableRow) => void | Promise<void>;
  /** Single-row "Pause/Resume/Stop"; parent should dispatch to the channel-specific controlAdapterRun */
  onControlRow?: (
    row: EvaluationsGlobalTableRow,
    action: 'pause' | 'resume' | 'stop',
  ) => void | Promise<void>;
  /** After overwriting a width preset successfully: navigate back to this page's "Evaluations Global" tab */
  onWidthPresetOverwriteSaved?: () => void;
}

/**
 * "Evaluations Global" main content: the EnhancedTable layout（觸發路徑 + 運算面分欄）.
 * Full output is viewed in the right-side Sheet; test history uses `historyLogUrl` as SSOT, and .md is export-only.
 */
export function EvaluationsGlobalPanel({
  importedRows,
  onBulkRunAllAdapters,
  bulkRunAllBusy = false,
  bulkRunAllStartedAtMs = null,
  onRunRow,
  onControlRow,
  onWidthPresetOverwriteSaved,
}: EvaluationsGlobalPanelProps) {
  const [outputDetailRow, setOutputDetailRow] = useState<EvaluationsGlobalTableRow | null>(null);
  const sheetOpen = outputDetailRow != null;

  const [historyRow, setHistoryRow] = useState<EvaluationsGlobalTableRow | null>(null);
  const historySheetOpen = historyRow != null;
  const [historyRuns, setHistoryRuns] = useState<AdapterEvaluationRunRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const onOpenOutputDetail = useCallback((r: EvaluationsGlobalTableRow) => {
    setOutputDetailRow(r);
  }, []);

  const onOpenFullHistory = useCallback(async (r: EvaluationsGlobalTableRow) => {
    const adapterId = r.adapterItemId;
    const channel = r.adapterChannel;
    if (!adapterId || !channel) return;
    setHistoryRow(r);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRuns([]);
    try {
      const qs = new URLSearchParams({
        adapterId,
        channel,
        limit: '200',
        offset: '0',
      });
      const res = await fetch(`/api/ai-settings/adapter-evaluation-runs?${qs.toString()}`);
      const data = (await res.json()) as {
        runs?: AdapterEvaluationRunRecord[];
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        setHistoryError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setHistoryRuns(data.runs ?? []);
      setHistoryTotal(typeof data.total === 'number' ? data.total : (data.runs ?? []).length);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const columns = useMemo(
    () =>
      createEvaluationsGlobalColumns({
        onOpenOutputDetail,
        onRunRow,
        onControlRow,
        onOpenFullHistory,
      }),
    [onOpenOutputDetail, onRunRow, onControlRow, onOpenFullHistory],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EnhancedTable<EvaluationsGlobalTableRow>
          tableId={EVALUATIONS_GLOBAL_TABLE_ID}
          columns={columns}
          data={importedRows}
          initialWidths={[...EVALUATIONS_GLOBAL_TABLE_INITIAL_WIDTHS]}
          minWidth={EVALUATIONS_GLOBAL_TABLE_MIN_WIDTH_PX}
          stretchToContainer={false}
          fillAvailableHeight
          persistentHorizontalScrollbar
          getSearchValue={getEvaluationsGlobalSearchValue}
          getCategoryValue={getEvaluationsGlobalCategoryValue}
          onAfterWidthPresetOverwrite={onWidthPresetOverwriteSaved}
          extraToolbar={
            onBulkRunAllAdapters ? (
              <button
                type="button"
                onClick={() => {
                  onBulkRunAllAdapters();
                }}
                disabled={bulkRunAllBusy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  bulkRunAllBusy
                    ? '一鍵依序啟動全部 CLI 與 HTTP Adapter 測試（進行中）'
                    : '一鍵依序啟動全部 CLI Adapter 測試，完成後再啟動全部 HTTP Adapter 測試'
                }
                aria-busy={bulkRunAllBusy}
              >
                {bulkRunAllBusy && bulkRunAllStartedAtMs != null ? (
                  <>
                    <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
                    <BulkRunElapsed startMs={bulkRunAllStartedAtMs} />
                    <span>全測中</span>
                  </>
                ) : bulkRunAllBusy ? (
                  <>
                    <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
                    <span>全測中</span>
                  </>
                ) : (
                  <>
                    <Play size={14} aria-hidden />
                    全測
                  </>
                )}
              </button>
            ) : null
          }
        />
      </div>

      <Sheet
        open={historySheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryRow(null);
            setHistoryRuns([]);
            setHistoryError(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[min(96vw,40rem)] lg:max-w-[min(96vw,48rem)]">
          {historyRow && (
            <>
              <SheetHeader>
                <SheetTitle>伺服器測試歷史</SheetTitle>
                <SheetDescription>
                  {historyRow.companyName} · {evaluationsGlobalTopologySummary(historyRow)} ·{' '}
                  <span className="font-mono">{historyRow.adapterModel}</span>
                  {historyLoading ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      載入中…
                    </span>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3 px-6 pb-8">
                {historyError && (
                  <p className="rounded-md border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-900">
                    {historyError}
                  </p>
                )}
                {!historyLoading && !historyError && (
                  <p className="text-[11px] text-text-muted">
                    共 <span className="tabular-nums font-semibold">{historyTotal}</span> 筆（依建立時間新→舊；此清單最多 200 筆）
                  </p>
                )}
                <div className="max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-border-subtle">
                  {historyRuns.length === 0 && !historyLoading && !historyError ? (
                    <p className="px-3 py-6 text-center text-[11px] text-text-muted">尚無紀錄</p>
                  ) : (
                    <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                      <thead className="sticky top-0 bg-bg-secondary">
                        <tr className="border-b border-border-subtle">
                          <th className="px-2 py-2 font-semibold text-text-secondary">時間</th>
                          <th className="px-2 py-2 font-semibold text-text-secondary">等級</th>
                          <th className="px-2 py-2 font-semibold text-text-secondary">HTTP</th>
                          <th className="px-2 py-2 font-semibold text-text-secondary">TTFT</th>
                          <th className="px-2 py-2 font-semibold text-text-secondary">E2E</th>
                          <th className="px-2 py-2 font-semibold text-text-secondary">摘要</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRuns.map((run) => (
                          <tr key={run.id} className="border-b border-border-subtle/80 align-top">
                            <td className="whitespace-nowrap px-2 py-1.5 text-text-muted">
                              {new Date(run.created_at).toLocaleString()}
                            </td>
                            <td className="px-2 py-1.5 font-mono">{run.evaluation_level}</td>
                            <td className="px-2 py-1.5 font-mono tabular-nums">{run.http_status ?? '—'}</td>
                            <td className="px-2 py-1.5 font-mono tabular-nums">{run.ttft_ms ?? '—'}</td>
                            <td className="px-2 py-1.5 font-mono tabular-nums">{run.e2e_ms ?? '—'}</td>
                            <td className="max-w-[280px] px-2 py-1.5 break-words text-text-primary">
                              {run.result_summary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setOutputDetailRow(null)}>
        <SheetContent className="w-full sm:max-w-[min(96vw,48rem)] lg:max-w-[min(96vw,56rem)]">
          {outputDetailRow && (
            <>
              <SheetHeader>
                <SheetTitle>輸出詳情</SheetTitle>
                <SheetDescription>
                  {outputDetailRow.companyName} · {evaluationsGlobalTopologySummary(outputDetailRow)} ·{' '}
                  <span className="font-mono">{outputDetailRow.adapterModel}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-6 pb-8">
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Real time raw output
                  </h3>
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-bg-secondary p-3 font-mono text-[11px] leading-relaxed text-text-primary">
                    {outputDetailRow.rawOutput.trim() ? outputDetailRow.rawOutput : '—'}
                  </pre>
                </section>
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Rendered output
                  </h3>
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-bg-primary p-3 text-[11px] leading-relaxed text-text-primary">
                    {outputDetailRow.renderedOutput.trim() ? outputDetailRow.renderedOutput : '—'}
                  </pre>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
