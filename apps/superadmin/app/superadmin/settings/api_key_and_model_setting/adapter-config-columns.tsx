'use client';

import React, { useEffect, useState } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Loader2, Play, Pause, Square, Upload } from 'lucide-react';
import type { AdapterConfigItem } from '@/lib/adapter-config';
import { evaluateAdapterRun } from './adapter-evaluation';

/** Row model for Adapter Config EnhancedTable */
export type AdapterConfigTableRow = {
  serialNo: number;
  provider: string;
  item: AdapterConfigItem;
  draft: AdapterConfigDraftCell;
  commandPreview: string;
};

export type AdapterConfigDraftCell = {
  promptText: string;
  selectedPromptId: string;
  testFileName: string;
  testFile: File | null;
  /** Start time (ms) of the current run; used to display elapsed seconds */
  runStartedAtMs: number | null;
  runStatus: 'idle' | 'running' | 'paused' | 'stopped';
  outputLines: string[];
  runCount: number;
  logCursor: number;
  pid: number | null;
  commandPreview: string;
  renderedOutput: string;
  requestedModel: string;
  effectiveModel: string;
  modelSource: string;
  ttftMs?: number | null;
  e2eLatencyMs?: number | null;
  tokensPerSec?: number | null;
  httpStatus?: number | null;
  retryCount?: number;
  errorType?: string;
  successRateRecent?: number | null;
};

export type AdapterPromptOptionCell = { id: string; label: string; content: string };

/** 3-digit 001–999; for > 999, show the full integer to avoid collisions */
export function formatAdapterSerial(n: number): string {
  if (!Number.isFinite(n) || n < 1) return '001';
  if (n <= 999) return String(n).padStart(3, '0');
  return String(n);
}

export interface CreateAdapterConfigColumnsDeps {
  providerLabel: Record<string, string>;
  promptOptions: AdapterPromptOptionCell[];
  adapterFileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  setAdapterConfigDrafts: React.Dispatch<
    React.SetStateAction<Record<string, AdapterConfigDraftCell>>
  >;
  startAdapterRun: (item: AdapterConfigItem, draft: AdapterConfigDraftCell) => void | Promise<void>;
  controlAdapterRun: (
    adapterId: string,
    action: 'pause' | 'resume' | 'stop',
  ) => void | Promise<void>;
  showHttpMetrics?: boolean;
}

const col = createColumnHelper<AdapterConfigTableRow>();

/** While running, show a spinner + elapsed time (1 decimal); freeze while paused */
export function AdapterRunElapsedLabel({
  runStatus,
  runStartedAtMs,
  showLeadingSpinner = true,
}: {
  runStatus: AdapterConfigDraftCell['runStatus'];
  runStartedAtMs: number | null;
  /** If the parent already shows a busy icon (e.g. a Loader inside a button), set false to only show the timer */
  showLeadingSpinner?: boolean;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (runStatus !== 'running' || runStartedAtMs == null) {
      return;
    }
    const tick = () => setElapsedSec((Date.now() - runStartedAtMs) / 1000);
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [runStatus, runStartedAtMs]);

  if (runStartedAtMs == null) return null;
  if (runStatus === 'idle' || runStatus === 'stopped') return null;

  const isPaused = runStatus === 'paused';

  return (
    <div
      className={`mt-1 flex min-h-[18px] items-center gap-1 text-[11px] ${isPaused ? 'text-amber-800' : 'text-emerald-800'}`}
      aria-live={isPaused ? 'off' : 'polite'}
    >
      {showLeadingSpinner && !isPaused && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" aria-hidden />
      )}
      {isPaused && <span className="shrink-0 font-medium">已暫停</span>}
      <span className="tabular-nums font-mono font-semibold">{elapsedSec.toFixed(1)}</span>
      <span className="text-text-muted">秒</span>
    </div>
  );
}

function meta(en: string, zh: string) {
  return { headerEn: en, headerZh: zh };
}

export function createAdapterConfigColumns(
  deps: CreateAdapterConfigColumnsDeps,
): ColumnDef<AdapterConfigTableRow, unknown>[] {
  const {
    providerLabel,
    promptOptions,
    adapterFileInputRefs,
    setAdapterConfigDrafts,
    startAdapterRun,
    controlAdapterRun,
    showHttpMetrics = false,
  } = deps;

  const columns: ColumnDef<AdapterConfigTableRow, unknown>[] = [
    col.accessor('serialNo', {
      id: 'col-serial',
      meta: meta('No.', '編號'),
      cell: ({ getValue }) => (
        <span className="tabular-nums font-mono text-xs font-semibold text-text-secondary">
          {formatAdapterSerial(getValue())}
        </span>
      ),
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.accessor((row) => providerLabel[row.provider] ?? row.provider, {
      id: 'col-company',
      meta: meta('Company', '公司名稱'),
      cell: ({ getValue }) => (
        <p className="text-xs font-medium text-text-primary">{getValue()}</p>
      ),
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-adapter-name',
      meta: meta('Adapter', '適配器名稱'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item } = row.original;
        return <p className="font-medium text-xs text-text-primary">{item.optionLabel}</p>;
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-prompt',
      meta: meta('Test prompt', '測試 Prompt'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        return (
          <div className="space-y-2">
            <textarea
              value={draft.promptText}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const value = e.target.value;
                setAdapterConfigDrafts((prev) => {
                  const cur = prev[item.id] ?? draft;
                  return { ...prev, [item.id]: { ...cur, promptText: value } };
                });
              }}
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex items-center gap-2">
              <select
                value={draft.selectedPromptId}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const value = e.target.value;
                  setAdapterConfigDrafts((prev) => {
                    const cur = prev[item.id] ?? draft;
                    return { ...prev, [item.id]: { ...cur, selectedPromptId: value } };
                  });
                }}
                className="relative z-10 h-8 min-h-8 flex-1 rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">從 Prompt Management 選擇</option>
                {promptOptions.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setAdapterConfigDrafts((prev) => {
                    const cur = prev[item.id] ?? draft;
                    const selected = promptOptions.find((p) => p.id === cur.selectedPromptId);
                    if (!selected) return prev;
                    return { ...prev, [item.id]: { ...cur, promptText: selected.content } };
                  });
                }}
                className="h-8 rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-secondary transition hover:bg-bg-tertiary hover:text-text-primary"
              >
                載入
              </button>
            </div>
          </div>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-upload',
      meta: meta('Upload', '上傳測試檔案'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        return (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => adapterFileInputRefs.current[item.id]?.click()}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-secondary transition hover:bg-bg-tertiary hover:text-text-primary"
            >
              <Upload size={13} />
              上傳文件
            </button>
            <input
              ref={(node) => {
                adapterFileInputRefs.current[item.id] = node;
              }}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setAdapterConfigDrafts((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...draft,
                    testFileName: file?.name ?? '',
                    testFile: file ?? null,
                  },
                }));
              }}
            />
            <p className="text-[11px] text-text-muted">{draft.testFileName || '尚未上傳測試檔'}</p>
          </div>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-controls',
      meta: meta('Run', '執行控制'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        return (
          <>
            <div className="flex h-8 items-center gap-1 rounded-md border border-border-default bg-bg-secondary px-1">
              <button
                type="button"
                onClick={() => {
                  if (draft.runStatus === 'running') return;
                  void startAdapterRun(item, draft);
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                  draft.runStatus === 'running'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                title="開始執行"
                aria-busy={draft.runStatus === 'running'}
              >
                <Play size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (draft.runStatus === 'running') {
                    void controlAdapterRun(item.id, 'pause');
                    return;
                  }
                  if (draft.runStatus === 'paused') {
                    void controlAdapterRun(item.id, 'resume');
                  }
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                  draft.runStatus === 'paused'
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-amber-600 hover:bg-amber-50'
                }`}
                title={draft.runStatus === 'paused' ? '恢復執行' : '暫停執行'}
              >
                {draft.runStatus === 'paused' ? <Play size={13} /> : <Pause size={13} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (draft.runStatus === 'idle' || draft.runStatus === 'stopped') return;
                  void controlAdapterRun(item.id, 'stop');
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                  draft.runStatus === 'stopped'
                    ? 'bg-rose-100 text-rose-700'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
                title="停止執行"
              >
                <Square size={12} />
              </button>
            </div>
            <AdapterRunElapsedLabel runStatus={draft.runStatus} runStartedAtMs={draft.runStartedAtMs} />
            <p className="mt-1 text-[11px] text-text-muted">已執行輪次：{draft.runCount}</p>
            {draft.pid != null && <p className="text-[11px] text-text-muted">PID：{draft.pid}</p>}
          </>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-resolved',
      meta: meta('Requested / Effective', '指定 / 實際型號'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        const requested = (draft.requestedModel?.trim() || item.model).trim();
        const effective = (draft.effectiveModel?.trim() || '').trim();
        const source = (draft.modelSource?.trim() || '').trim();
        return (
          <div className="space-y-1">
            <p className="break-all font-mono text-[11px] text-text-secondary" title="你指定要執行的模型">
              requested: {requested}
            </p>
            <p className="break-all font-mono text-[11px] text-text-primary" title="實際執行模型（可能因 fallback 不同）">
              effective: {effective || '尚未產生'}
            </p>
            <p className="break-all font-mono text-[11px] text-text-muted" title="模型來源">
              source: {source || 'requested'}
            </p>
          </div>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-fallback-chain',
      meta: meta('Fallback chain', '降級鏈'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item } = row.original;
        const chain = item.fallbackModels ?? [];
        if (chain.length === 0) {
          return <span className="text-[11px] text-text-muted">—</span>;
        }
        return (
          <ol
            className="list-decimal space-y-0.5 pl-4 font-mono text-[11px] text-text-secondary"
            title="primary 失敗時依序降級；CLI/HTTP 各自只走同一路徑"
          >
            {chain.map((m) => (
              <li key={m} className="break-all">
                {m}
              </li>
            ))}
          </ol>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-raw-output',
      meta: meta('Raw output', '輸出 output'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft, commandPreview } = row.original;
        return (
          <>
            <div className="h-24 w-full min-w-[260px] overflow-y-auto rounded-md border border-border-default bg-bg-secondary px-2 py-1.5">
              {draft.outputLines.length === 0 ? (
                <p className="text-[11px] text-text-muted">尚無輸出，點擊開始執行後會即時顯示。</p>
              ) : (
                <div className="space-y-1">
                  {draft.outputLines.map((line, idx) => (
                    <p
                      key={`${item.id}-output-${idx}`}
                      className="font-mono text-[11px] leading-4 text-text-secondary"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
              command: {draft.commandPreview || commandPreview}
            </p>
          </>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-render',
      meta: meta('Rendered', '輸出結果（render）'),
      enableSorting: false,
      cell: ({ row }) => {
        const { draft } = row.original;
        return (
          <div className="h-24 w-full min-w-[220px] overflow-y-auto rounded-md border border-emerald-200 bg-emerald-50/40 px-2 py-1.5">
            {draft.renderedOutput ? (
              <p className="whitespace-pre-wrap text-xs leading-5 text-emerald-900">{draft.renderedOutput}</p>
            ) : (
              <p className="text-[11px] text-text-muted">尚無可讀結果（目前顯示 raw logs）。</p>
            )}
          </div>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-review',
      meta: meta('Evaluation', '測試評價'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        /** While running/paused, polling may still reuse the previous render; don't show stale pass/fail to avoid misleading users */
        if (draft.runStatus === 'running') {
          return (
            <div
              className="inline-flex min-h-8 items-center rounded-md border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900"
              title="測試執行中，程序結束後會依輸出更新評價"
            >
              模型測試中
            </div>
          );
        }
        if (draft.runStatus === 'paused') {
          return (
            <div
              className="inline-flex min-h-8 items-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
              title="已暫停；恢復並完成後才會更新最終評價"
            >
              測試已暫停
            </div>
          );
        }
        const requested = (draft.requestedModel?.trim() || item.model).trim();
        const effective = (draft.effectiveModel?.trim() || '').trim();
        const evaluation = evaluateAdapterRun({
          requestedModel: requested,
          effectiveModel: effective,
          renderedOutput: draft.renderedOutput,
          outputLines: draft.outputLines,
          errorType: draft.errorType,
          httpStatus: draft.httpStatus,
        });
        const badgeClass = {
          pass: 'border-emerald-300 bg-emerald-100 text-emerald-800',
          warning: 'border-amber-300 bg-amber-100 text-amber-800',
          fail: 'border-rose-300 bg-rose-100 text-rose-800',
          pending: 'border-slate-300 bg-slate-100 text-slate-700',
        }[evaluation.level];

        return (
          <div
            className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1 text-xs font-semibold ${badgeClass}`}
            title={evaluation.message}
          >
            {evaluation.message}
          </div>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,
  ];

  if (showHttpMetrics) {
    columns.push(
      col.display({
        id: 'col-ttft',
        meta: meta('TTFT (ms)', '首 token 延遲(ms)'),
        enableSorting: false,
        cell: ({ row }) => {
          const ttft = row.original.draft.ttftMs;
          return <span className="font-mono text-xs text-text-secondary">{ttft != null ? Math.round(ttft) : '—'}</span>;
        },
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-e2e',
        meta: meta('E2E (ms)', '完成時間(ms)'),
        enableSorting: false,
        cell: ({ row }) => {
          const e2e = row.original.draft.e2eLatencyMs;
          return <span className="font-mono text-xs text-text-secondary">{e2e != null ? Math.round(e2e) : '—'}</span>;
        },
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-tps',
        meta: meta('Throughput', '吞吐(tokens/s)'),
        enableSorting: false,
        cell: ({ row }) => {
          const tps = row.original.draft.tokensPerSec;
          return <span className="font-mono text-xs text-text-secondary">{tps != null ? tps.toFixed(2) : '—'}</span>;
        },
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-http-status',
        meta: meta('HTTP', 'HTTP 狀態碼'),
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.draft.httpStatus;
          return <span className="font-mono text-xs text-text-secondary">{status ?? '—'}</span>;
        },
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-retry',
        meta: meta('Retry', '重試次數'),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-text-secondary">{row.original.draft.retryCount ?? 0}</span>
        ),
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-error-type',
        meta: meta('Error Type', '錯誤類型'),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-text-secondary">{row.original.draft.errorType || '—'}</span>
        ),
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
      col.display({
        id: 'col-success-rate',
        meta: meta('Success(N)', '成功率(最近N次)'),
        enableSorting: false,
        cell: ({ row }) => {
          const rate = row.original.draft.successRateRecent;
          return <span className="font-mono text-xs text-text-secondary">{rate != null ? `${Math.round(rate * 100)}%` : '—'}</span>;
        },
      }) as ColumnDef<AdapterConfigTableRow, unknown>,
    );
  }

  return columns;
}
