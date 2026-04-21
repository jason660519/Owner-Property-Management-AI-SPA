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
  transportLabel,
  type EvaluationsGlobalTableRow,
} from './evaluations-global-columns';

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
 * "Evaluations Global" main content: the new 16-column EnhancedTable layout.
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

  const onOpenOutputDetail = useCallback((r: EvaluationsGlobalTableRow) => {
    setOutputDetailRow(r);
  }, []);

  const columns = useMemo(
    () => createEvaluationsGlobalColumns({ onOpenOutputDetail, onRunRow, onControlRow }),
    [onOpenOutputDetail, onRunRow, onControlRow],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <p className="text-xs text-text-muted">
        下列列來自「LLM CLI Adapter調適」與「LLM Http Adapter調適」：顯示最近一次測試<strong className="text-text-primary">及格（pass）</strong>
        或目前進行中的 Adapter。工具列「全測」會依序跑完整 CLI 與 HTTP 兩輪（與兩張 Adapter 表相同）。Raw／Rendered
        欄以捲動框完整呈現輸出內容（對齊 Adapter 分頁）；點擊欄內可開啟側欄放大檢視。正式測試紀錄仍以儲存模組／後端為準。
      </p>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EnhancedTable<EvaluationsGlobalTableRow>
          tableId={EVALUATIONS_GLOBAL_TABLE_ID}
          columns={columns}
          data={importedRows}
          initialWidths={[...EVALUATIONS_GLOBAL_TABLE_INITIAL_WIDTHS]}
          minWidth={EVALUATIONS_GLOBAL_TABLE_MIN_WIDTH_PX}
          stretchToContainer={false}
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

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setOutputDetailRow(null)}>
        <SheetContent className="w-full sm:max-w-[min(96vw,48rem)] lg:max-w-[min(96vw,56rem)]">
          {outputDetailRow && (
            <>
              <SheetHeader>
                <SheetTitle>輸出詳情</SheetTitle>
                <SheetDescription>
                  {outputDetailRow.companyName} · {transportLabel(outputDetailRow.transport)} ·{' '}
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
