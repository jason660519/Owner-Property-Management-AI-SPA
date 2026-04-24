'use client';

import React from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Download, ExternalLink, Loader2, Pause, Play, Square } from 'lucide-react';

import { AdapterRunElapsedLabel } from './adapter-config-columns';
import type { AdapterEvaluationLevel } from './adapter-evaluation';

/**
 * 控制面：評測是怎麼被觸發／送出的（與模型實際算在哪無關）。
 * 目前由 Adapter `cli` / `http` 對應；保留 enum 供未來擴充。
 */
export type EvaluationsGlobalInvocationPath =
  | 'cli'
  | 'http'
  | 'sdk_inprocess'
  | 'queued_worker'
  | 'unknown';

/**
 * 運算面：completion 主要在哪類基礎設施上產生（與觸發方式正交）。
 */
export type EvaluationsGlobalExecutionPlane =
  | 'vendor_saas'
  | 'self_hosted_remote'
  | 'on_prem'
  | 'edge_device'
  | 'hybrid'
  | 'unknown';

export type EvaluationsGlobalHistoryEntry = {
  at: string;
  resultSummary: string;
  httpStatus: number | null;
  /** 來自 `adapter_evaluation_runs.evaluation_level`（可選） */
  evaluationLevel?: string;
};

/** 新版「AI 模型全域評測」工作表列模型（後續再接 API／執行緒） */
export type EvaluationsGlobalTableRow = {
  id: string;
  no: number;
  companyName: string;
  invocationPath: EvaluationsGlobalInvocationPath;
  executionPlane: EvaluationsGlobalExecutionPlane;
  adapterModel: string;
  testPrompt: string;
  testFileNames: string[];
  /** 與 Adapter Config 同步的執行狀態；此表以 Adapter Config drafts 為 SSOT */
  runStatus: 'idle' | 'running' | 'paused' | 'stopped';
  /** Adapter run engine 的通道（cli 或 http），供重新執行時 dispatch 到正確 API */
  adapterChannel?: 'cli' | 'http';
  /** 對應 `adapter-config.ts` 中的 item id，使 panel 能反查 item 與 draft */
  adapterItemId?: string;
  /** 本輪測試開始時間（ms）；用於顯示經過秒數，對齊 Adapter 分頁 */
  runStartedAtMs?: number | null;
  requestedModel: string;
  effectiveModel: string;
  /** 逐行原始輸出（Raw 欄以 h-24 可捲動框一行一行印，對齊 Adapter 分頁） */
  outputLines: string[];
  /** 完整原始輸出字串（join 後；保留給搜尋與側欄） */
  rawOutput: string;
  /** 完整渲染輸出（Rendered 欄以 h-24 可捲動框整段顯示） */
  renderedOutput: string;
  evaluation: string;
  /** 評測等級；用於色碼顯示，對齊 LLM CLI／HTTP Adapter 分頁 */
  evaluationLevel?: AdapterEvaluationLevel;
  /** 首 token 延遲 (ms) */
  ttftMs: number | null;
  /** 端到端完成時間 (ms) */
  e2eMs: number | null;
  /** 吞吐 (tokens/s) */
  throughputTokensPerSec: number | null;
  httpStatus: number | null;
  /** 最後一輪測試摘要（以 DB／後端為 SSOT 寫入） */
  historyLastSummary: string;
  /** 最後一輪測試時間 ISO */
  historyLastAt: string | null;
  /**
   * 正式測試紀錄連結（object storage、signed URL、或內部 API）。
   * 欄位以連結為主；`.md` 僅作匯出格式。
   */
  historyLogUrl: string | null;
  /** 後端回傳的總輪次（可選，僅顯示） */
  historyTotalRuns: number | null;
  /**
   * 可選：用於離線匯出 .md 的快照列（非 SSOT）。
   * 接上儲存後通常可省略，改由 `historyLogUrl` 下載或後端產生匯出。
   */
  historyEntries: EvaluationsGlobalHistoryEntry[];
};

export const EVALUATIONS_GLOBAL_TABLE_ID = 'ai-settings-evaluations-global-v2';

/** 欄寬百分比，加總為 100（見 EnhancedTable 技能說明） */
export const EVALUATIONS_GLOBAL_TABLE_INITIAL_WIDTHS = [
  3, 6, 3, 3, 8, 9, 7, 6, 7, 8, 8, 5, 4, 4, 4, 3, 12,
] as const;

export const EVALUATIONS_GLOBAL_TABLE_MIN_WIDTH_PX = 3180;

const INVOCATION_PATH_LABEL: Record<EvaluationsGlobalInvocationPath, string> = {
  cli: 'CLI 程序',
  http: 'HTTP 直連',
  sdk_inprocess: 'SDK 進程內',
  queued_worker: '佇列／Worker',
  unknown: '未知',
};

const EXECUTION_PLANE_LABEL: Record<EvaluationsGlobalExecutionPlane, string> = {
  vendor_saas: '公有雲 API',
  self_hosted_remote: '自架遠端',
  on_prem: '地端／內網',
  edge_device: '邊緣裝置',
  hybrid: '混合',
  unknown: '未知',
};

export function invocationPathLabel(p: EvaluationsGlobalInvocationPath): string {
  return INVOCATION_PATH_LABEL[p] ?? p;
}

export function executionPlaneLabel(p: EvaluationsGlobalExecutionPlane): string {
  return EXECUTION_PLANE_LABEL[p] ?? p;
}

/** 由 Adapter channel 推斷控制面（目前僅 cli / http） */
export function invocationPathFromAdapterChannel(channel: 'cli' | 'http'): EvaluationsGlobalInvocationPath {
  return channel === 'cli' ? 'cli' : 'http';
}

/** 由 provider id 粗分運算面；無法判定時為 unknown */
export function inferExecutionPlaneFromAdapterProvider(provider: string): EvaluationsGlobalExecutionPlane {
  if (!provider.trim()) return 'unknown';
  if (provider === 'ollama_local') return 'on_prem';
  return 'vendor_saas';
}

export function evaluationsGlobalTopologySummary(row: EvaluationsGlobalTableRow): string {
  return `${invocationPathLabel(row.invocationPath)} · ${executionPlaneLabel(row.executionPlane)}`;
}

function formatNum(n: number | null | undefined, decimals?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (decimals != null) return n.toFixed(decimals);
  return String(Math.round(n));
}

function formatShortAt(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** 產生 .md 匯出（匯出用；SSOT 仍為 `historyLogUrl` 指向之儲存） */
export function buildEvaluationsGlobalHistoryMarkdown(row: EvaluationsGlobalTableRow): string {
  const lines = [
    `# 測試紀錄（匯出）`,
    ``,
    `- 公司：${row.companyName}`,
    `- 觸發路徑：${invocationPathLabel(row.invocationPath)}`,
    `- 運算面：${executionPlaneLabel(row.executionPlane)}`,
    `- Adapter：${row.adapterModel}`,
    `- 產出時間：${new Date().toISOString()}`,
    `- 正式紀錄連結（SSOT）：${row.historyLogUrl ?? '（尚未設定）'}`,
    ``,
    `## 最後一輪`,
    `- 時間：${row.historyLastAt ?? '—'}`,
    `- 摘要：${row.historyLastSummary || '—'}`,
    ``,
  ];

  if (row.historyEntries.length > 0) {
    lines.push(
      `## 資料庫紀錄（最近匯入；完整列表請用「完整歷史」）`,
      ``,
      `| 時間 (ISO) | 結果摘要 | HTTP | 等級 |`,
      `| --- | --- | --- | --- |`,
    );
    for (const e of row.historyEntries) {
      const sum = e.resultSummary.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
      lines.push(`| ${e.at} | ${sum} | ${e.httpStatus ?? '—'} | ${e.evaluationLevel ?? '—'} |`);
    }
  }

  return lines.join('\n');
}

export function getEvaluationsGlobalSearchValue(row: EvaluationsGlobalTableRow): string {
  return [
    row.companyName,
    row.adapterModel,
    row.testPrompt,
    row.requestedModel,
    row.effectiveModel,
    row.evaluation,
    row.testFileNames.join(' '),
    invocationPathLabel(row.invocationPath),
    executionPlaneLabel(row.executionPlane),
    row.historyLastSummary,
    row.historyLogUrl ?? '',
    row.rawOutput,
    row.renderedOutput,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getEvaluationsGlobalCategoryValue(row: EvaluationsGlobalTableRow): string {
  return evaluationsGlobalTopologySummary(row);
}

export interface CreateEvaluationsGlobalColumnsDeps {
  /** 點擊 Raw／Rendered 欄位開啟側欄放大檢視；未提供時點擊無反應但仍可在欄內捲動 */
  onOpenOutputDetail?: (row: EvaluationsGlobalTableRow) => void;
  /** 執行（idle → running）。由 parent dispatch 到底層 Adapter run engine */
  onRunRow?: (row: EvaluationsGlobalTableRow) => void | Promise<void>;
  /** 暫停／恢復／停止。pause/resume 會依當下 runStatus 自動判斷 */
  onControlRow?: (
    row: EvaluationsGlobalTableRow,
    action: 'pause' | 'resume' | 'stop',
  ) => void | Promise<void>;
  /** 開啟伺服器端完整歷史（分頁 API） */
  onOpenFullHistory?: (row: EvaluationsGlobalTableRow) => void | Promise<void>;
}

const col = createColumnHelper<EvaluationsGlobalTableRow>();

/**
 * Raw output 欄位：對齊 Adapter 分頁（見 adapter-config-columns.tsx 的 `col-raw-output`）。
 * `h-24` 可捲動框，逐行以 mono 印出完整內容；點整塊可開啟側欄放大檢視。
 */
function RawOutputCell({
  rowId,
  outputLines,
  onExpand,
}: {
  rowId: string;
  outputLines: string[];
  onExpand?: () => void;
}) {
  const hasLines = outputLines.length > 0;
  const clickable = Boolean(onExpand);
  return (
    <div
      className={`h-24 w-full min-w-[220px] overflow-y-auto rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 ${
        clickable ? 'cursor-zoom-in hover:border-accent/50' : ''
      }`}
      onClick={clickable ? onExpand : undefined}
      role={clickable ? 'button' : undefined}
      title={clickable ? '點擊開啟側欄放大檢視' : undefined}
    >
      {hasLines ? (
        <div className="space-y-0.5">
          {outputLines.map((line, idx) => (
            <p
              key={`${rowId}-raw-${idx}`}
              className="font-mono text-[11px] leading-4 text-text-secondary whitespace-pre-wrap break-words"
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-text-muted">尚無輸出，點擊開始執行後會即時顯示。</p>
      )}
    </div>
  );
}

/**
 * Rendered output 欄位：對齊 Adapter 分頁（見 adapter-config-columns.tsx 的 `col-render`）。
 * emerald 底 `h-24` 可捲動框，`whitespace-pre-wrap` 完整顯示 render 結果；點整塊開啟側欄。
 */
function RenderedOutputCell({
  renderedOutput,
  onExpand,
}: {
  renderedOutput: string;
  onExpand?: () => void;
}) {
  const hasBody = renderedOutput.trim().length > 0;
  const clickable = Boolean(onExpand);
  return (
    <div
      className={`h-24 w-full min-w-[200px] overflow-y-auto rounded-md border border-emerald-200 bg-emerald-50/40 px-2 py-1.5 ${
        clickable ? 'cursor-zoom-in hover:border-accent/50' : ''
      }`}
      onClick={clickable ? onExpand : undefined}
      role={clickable ? 'button' : undefined}
      title={clickable ? '點擊開啟側欄放大檢視' : undefined}
    >
      {hasBody ? (
        <p className="whitespace-pre-wrap break-words text-xs leading-5 text-emerald-900">{renderedOutput}</p>
      ) : (
        <p className="text-[11px] text-text-muted">尚無可讀結果（目前顯示 raw logs）。</p>
      )}
    </div>
  );
}

export function createEvaluationsGlobalColumns(
  deps: CreateEvaluationsGlobalColumnsDeps,
): ColumnDef<EvaluationsGlobalTableRow, unknown>[] {
  const { onOpenOutputDetail, onRunRow, onControlRow, onOpenFullHistory } = deps;

  return [
    col.display({
      id: 'col-no',
      header: 'No',
      meta: { headerEn: 'No.', headerZh: '編號' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-secondary">{row.original.no}</span>
      ),
    }),
    col.accessor('companyName', {
      id: 'col-company',
      header: 'Company',
      meta: { headerEn: 'Company', headerZh: '公司名稱' },
      cell: ({ getValue }) => (
        <span className="block max-w-[220px] truncate text-xs text-text-primary" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    col.accessor('invocationPath', {
      id: 'col-invocation',
      header: 'Invoke',
      meta: { headerEn: 'Invocation path', headerZh: '觸發路徑' },
      cell: ({ getValue }) => (
        <span className="inline-flex max-w-[160px] rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-primary">
          <span className="truncate">{invocationPathLabel(getValue())}</span>
        </span>
      ),
    }),
    col.accessor('executionPlane', {
      id: 'col-execution',
      header: 'Compute',
      meta: { headerEn: 'Execution plane', headerZh: '運算面' },
      cell: ({ getValue }) => (
        <span className="inline-flex max-w-[160px] rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-primary">
          <span className="truncate">{executionPlaneLabel(getValue())}</span>
        </span>
      ),
    }),
    col.accessor('adapterModel', {
      id: 'col-adapter',
      header: 'Adapter',
      meta: { headerEn: 'Adapter model', headerZh: 'ADAPTER 模型' },
      cell: ({ getValue }) => (
        <span className="block max-w-[200px] truncate font-mono text-[11px] text-text-primary" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    col.accessor('testPrompt', {
      id: 'col-prompt',
      header: 'Test prompt',
      meta: { headerEn: 'Test prompt', headerZh: 'Test Prompt' },
      cell: ({ getValue }) => {
        const v = getValue();
        const short = v.length > 120 ? `${v.slice(0, 120)}…` : v;
        return (
          <span className="block max-h-24 overflow-auto whitespace-pre-wrap break-words text-[11px] text-text-secondary" title={v}>
            {short || '—'}
          </span>
        );
      },
    }),
    col.accessor('testFileNames', {
      id: 'col-files',
      header: 'Test files',
      meta: { headerEn: 'Test files', headerZh: 'Test Files' },
      cell: ({ getValue }) => {
        const names = getValue();
        if (!names.length) {
          return <span className="text-text-muted italic text-xs">—</span>;
        }
        return (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {names.map((n) => (
              <span
                key={n}
                className="inline-block max-w-full truncate rounded border border-border-subtle bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-secondary"
                title={n}
              >
                {n}
              </span>
            ))}
          </div>
        );
      },
    }),
    col.display({
      id: 'col-run',
      header: 'Run',
      meta: { headerEn: 'Run controls', headerZh: '執行控制' },
      cell: ({ row }) => {
        const r = row.original;
        const st = r.runStatus;
        const canStart = Boolean(onRunRow);
        const canControl = Boolean(onControlRow);
        const isRunning = st === 'running';
        const isPaused = st === 'paused';
        const playDisabled = isPaused ? !canControl : !canStart || isRunning;
        return (
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                title={isPaused ? '恢復執行' : '開始執行'}
                disabled={playDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (isPaused) {
                    void onControlRow?.(r, 'resume');
                  } else {
                    void onRunRow?.(r);
                  }
                }}
                aria-busy={isRunning}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-emerald-600 hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                title="暫停"
                disabled={!canControl || !isRunning}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void onControlRow?.(r, 'pause');
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-amber-700 hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="停止"
                disabled={!canControl || (st !== 'running' && st !== 'paused')}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void onControlRow?.(r, 'stop');
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-red-600 hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Square className="h-3 w-3" />
              </button>
            </div>
            <AdapterRunElapsedLabel
              runStatus={r.runStatus}
              runStartedAtMs={r.runStartedAtMs ?? null}
              showLeadingSpinner={false}
            />
          </div>
        );
      },
    }),
    col.display({
      id: 'col-models',
      header: 'Req / Eff',
      meta: {
        headerEn: 'Requested / Effective model',
        headerZh: '指定型號／實際型號',
      },
      cell: ({ row }) => {
        const { requestedModel, effectiveModel } = row.original;
        return (
          <div className="min-w-0 space-y-0.5 text-[11px]">
            <p className="truncate text-text-muted" title={requestedModel}>
              指定：<span className="font-mono text-text-primary">{requestedModel || '—'}</span>
            </p>
            <p className="truncate text-text-muted" title={effectiveModel}>
              實際：<span className="font-mono text-text-primary">{effectiveModel || '—'}</span>
            </p>
          </div>
        );
      },
    }),
    col.display({
      id: 'col-raw',
      header: 'Raw',
      meta: { headerEn: 'Real-time raw output', headerZh: 'Raw 輸出（即時）' },
      cell: ({ row }) => (
        <RawOutputCell
          rowId={row.original.id}
          outputLines={row.original.outputLines}
          onExpand={onOpenOutputDetail ? () => onOpenOutputDetail(row.original) : undefined}
        />
      ),
    }),
    col.display({
      id: 'col-rendered',
      header: 'Rendered',
      meta: { headerEn: 'Rendered output', headerZh: 'Rendered 輸出' },
      cell: ({ row }) => (
        <RenderedOutputCell
          renderedOutput={row.original.renderedOutput}
          onExpand={onOpenOutputDetail ? () => onOpenOutputDetail(row.original) : undefined}
        />
      ),
    }),
    col.display({
      id: 'col-eval',
      header: 'Evaluation',
      meta: { headerEn: 'Evaluation', headerZh: '測試評價' },
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        /** 執行中／暫停時沿用上一輪的 render，不能顯示舊的及格／不及格以免誤導；對齊 Adapter 分頁 */
        if (r.runStatus === 'running') {
          return (
            <div
              className="inline-flex min-h-8 items-center rounded-md border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900"
              title="測試執行中，程序結束後會依輸出更新評價"
            >
              模型測試中
            </div>
          );
        }
        if (r.runStatus === 'paused') {
          return (
            <div
              className="inline-flex min-h-8 items-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
              title="已暫停；恢復並完成後才會更新最終評價"
            >
              測試已暫停
            </div>
          );
        }
        const level: AdapterEvaluationLevel = r.evaluationLevel ?? (r.evaluation ? 'pass' : 'pending');
        const badgeClass = {
          pass: 'border-emerald-300 bg-emerald-100 text-emerald-800',
          warning: 'border-amber-300 bg-amber-100 text-amber-800',
          fail: 'border-rose-300 bg-rose-100 text-rose-800',
          pending: 'border-slate-300 bg-slate-100 text-slate-700',
        }[level];
        const message = r.evaluation || (level === 'pending' ? '尚未測試' : '—');
        return (
          <div
            className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1 text-xs font-semibold ${badgeClass}`}
            title={message}
          >
            {message}
          </div>
        );
      },
    }),
    col.accessor('ttftMs', {
      id: 'col-ttft',
      header: 'TTFT (ms)',
      meta: { headerEn: 'TTFT (ms)', headerZh: 'TTFT (ms) 首 token 延遲' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs tabular-nums text-text-secondary">{formatNum(getValue())}</span>
      ),
    }),
    col.accessor('e2eMs', {
      id: 'col-e2e',
      header: 'E2E (ms)',
      meta: { headerEn: 'E2E (ms)', headerZh: 'E2E (ms) 完成時間' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs tabular-nums text-text-secondary">{formatNum(getValue())}</span>
      ),
    }),
    col.accessor('throughputTokensPerSec', {
      id: 'col-tps',
      header: 'tok/s',
      meta: { headerEn: 'Throughput (tokens/s)', headerZh: '吞吐（tokens/s）' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs tabular-nums text-text-secondary">{formatNum(getValue(), 2)}</span>
      ),
    }),
    col.accessor('httpStatus', {
      id: 'col-http',
      header: 'HTTP',
      meta: { headerEn: 'HTTP status', headerZh: 'HTTP 狀態碼' },
      cell: ({ getValue }) => {
        const v = getValue();
        if (v == null) return <span className="text-text-muted italic text-xs">—</span>;
        const ok = v >= 200 && v < 300;
        return (
          <span
            className={`font-mono text-xs tabular-nums ${ok ? 'text-emerald-600' : 'text-amber-700'}`}
          >
            {v}
          </span>
        );
      },
    }),
    col.display({
      id: 'col-history',
      header: 'History',
      meta: { headerEn: 'Test history', headerZh: 'Test History' },
      cell: ({ row }) => {
        const r = row.original;
        const hasLog = Boolean(r.historyLogUrl?.trim());
        const runs =
          r.historyTotalRuns != null && Number.isFinite(r.historyTotalRuns)
            ? `${r.historyTotalRuns} 輪`
            : null;
        const canExportSnapshot = r.historyEntries.length > 0;
        const canExportMinimal = Boolean(r.historyLastSummary.trim()) || hasLog;
        const exportDisabled = !canExportSnapshot && !canExportMinimal;
        const canOpenServerHistory = Boolean(r.adapterItemId && r.adapterChannel && onOpenFullHistory);

        return (
          <div className="flex min-w-[130px] max-w-[220px] flex-col gap-1.5">
            <p className="line-clamp-2 text-[10px] leading-snug text-text-primary" title={r.historyLastSummary}>
              {r.historyLastSummary.trim() ? r.historyLastSummary : '—'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-text-muted">
              {r.historyLastAt && <span>{formatShortAt(r.historyLastAt)}</span>}
              {runs && <span className="tabular-nums">{runs}</span>}
            </div>
            {hasLog && (
              <a
                href={r.historyLogUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                正式紀錄
              </a>
            )}
            {canOpenServerHistory && (
              <button
                type="button"
                onClick={() => void onOpenFullHistory?.(r)}
                className="inline-flex w-fit items-center gap-1 rounded border border-border-subtle bg-bg-secondary px-2 py-1 text-[10px] font-medium text-accent hover:bg-bg-tertiary"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                完整歷史
              </button>
            )}
            <button
              type="button"
              disabled={exportDisabled}
              title={
                exportDisabled
                  ? '無可匯出內容'
                  : '匯出 .md（快照／摘要；正式紀錄以連結儲存為準）'
              }
              onClick={() => {
                const md = buildEvaluationsGlobalHistoryMarkdown(r);
                const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `eval-history-export-${r.id}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex w-fit items-center gap-1 rounded border border-border-subtle bg-bg-primary px-2 py-1 text-[10px] text-text-secondary hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3 w-3 shrink-0" />
              匯出 .md
            </button>
          </div>
        );
      },
    }),
  ] as ColumnDef<EvaluationsGlobalTableRow, unknown>[];
}
