'use client';

import React, { useEffect, useState } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Copy, Dice5, Eye, Loader2, Play, Trash2 } from 'lucide-react';
import {
  defaultInvocationPathForTool,
  findToolConfig,
  findInvocationPathConfig,
  getInvocationPathAvailability,
  INVOCATION_PATH_OPTIONS,
  OLLAMA_CLOUD_MODELS,
  TOOL_CONFIGS,
  type CodingTool,
  type InvocationPath,
} from './cli-eval-tool-config';
import {
  isCliCapabilityConfigLocked,
  type CliCapabilityRow,
  type CliCapabilityRunStatus,
} from './cli-capability-row-state';

export const CLI_CAPABILITY_TABLE_ID = 'ai-settings-cli-capability-evaluation-v2';
export const CLI_CAPABILITY_INITIAL_WIDTHS = [
  3, 4, 5, 5, 5, 7, 7, 14, 5, 9, 13, 5, 4, 4, 4, 4, 7,
] as const;
export const CLI_CAPABILITY_MIN_WIDTH_PX = 4400;

type CreateColumnsDeps = {
  onPatchRow: (rowId: string, patch: Partial<CliCapabilityRow>) => void;
  onRunRow: (row: CliCapabilityRow) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (row: CliCapabilityRow) => void;
  onOpenDetail: (row: CliCapabilityRow) => void;
  onRandomModel: (rowId: string) => void;
};

const col = createColumnHelper<CliCapabilityRow>();

function statusLabel(status: CliCapabilityRunStatus): string {
  if (status === 'done') return '完成';
  if (status === 'failed') return '失敗';
  if (status === 'running') return 'CLI 執行中';
  return '尚未測試';
}

function executionPlaneLabel(invocationPath: InvocationPath): string {
  if (invocationPath === 'ollama_launch') return '本機 CLI → ollama daemon';
  if (invocationPath === 'openai_compatible') return '本機 CLI → OpenAI-compatible endpoint';
  if (invocationPath === 'direct_tool_config') return '本機 CLI → tool config';
  return '本機 CLI → vendor account';
}

function stopTablePointerEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function ElapsedLabel({
  runStatus,
  runStartedAtMs,
}: {
  runStatus: CliCapabilityRunStatus;
  runStartedAtMs: number | null;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (runStatus !== 'running' || runStartedAtMs == null) return;
    const tick = () => setElapsedSec((Date.now() - runStartedAtMs) / 1000);
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [runStatus, runStartedAtMs]);

  if (runStatus !== 'running' || runStartedAtMs == null) return null;
  return (
    <span className="ml-1 inline-flex items-center text-[11px] text-emerald-800 tabular-nums font-mono font-semibold" aria-live="polite">
      {elapsedSec.toFixed(1)}s
    </span>
  );
}

export function getCliCapabilitySearchValue(row: CliCapabilityRow): string {
  const tool = findToolConfig(row.codingTool);
  const invocationPath = findInvocationPathConfig(row.invocationPath);
  return [
    tool?.label ?? row.codingTool,
    invocationPath?.label ?? row.invocationPath,
    row.ollamaModel,
    row.prompt,
    row.resultText,
    row.message,
  ].filter(Boolean).join('\n');
}

export function getCliCapabilityCategoryValue(row: CliCapabilityRow): string {
  const tool = findToolConfig(row.codingTool);
  return tool?.label ?? row.codingTool;
}

export function createCliCapabilityColumns(deps: CreateColumnsDeps): ColumnDef<CliCapabilityRow, unknown>[] {
  const { onPatchRow, onRunRow, onDeleteRow, onDuplicateRow, onOpenDetail, onRandomModel } = deps;
  return [
    col.display({
      id: 'no',
      header: 'No',
      meta: { headerEn: 'No.', headerZh: '編號' },
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums text-text-secondary">{row.original.no}</span>,
    }),
    col.display({
      id: 'should-test',
      header: 'Test?',
      meta: { headerEn: 'Whether to test', headerZh: '是否測試' },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.shouldTest}
          onChange={(event) => onPatchRow(row.original.id, { shouldTest: event.target.checked })}
          onMouseDown={stopTablePointerEvent}
          onClick={stopTablePointerEvent}
          className="h-4 w-4 cursor-pointer rounded border-border-default text-emerald-600 focus:ring-emerald-500"
        />
      ),
    }),
    col.display({
      id: 'row-actions',
      header: 'Actions',
      meta: { headerEn: 'Actions', headerZh: '操作' },
      cell: ({ row }) => (
        <button
          type="button"
          title={isCliCapabilityConfigLocked(row.original) ? '已落地測試列不可刪除，請複製成新列調整' : '刪除此列'}
          disabled={isCliCapabilityConfigLocked(row.original)}
          onClick={(event) => { event.stopPropagation(); onDeleteRow(row.original.id); }}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-rose-500 hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    }),
    col.display({
      id: 'invocation-path',
      header: 'Invoke',
      meta: { headerEn: 'Invocation path', headerZh: '觸發路徑' },
      cell: ({ row }) => {
        const r = row.original;
        const locked = isCliCapabilityConfigLocked(r);
        const path = findInvocationPathConfig(r.invocationPath);
        const availability = getInvocationPathAvailability(r.codingTool, r.invocationPath);
        const isTodo = availability.status === 'todo';
        const isUnverified = availability.status === 'unverified';
        const className = isTodo
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : isUnverified
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200';
        const suffix = isTodo ? '（TODO）' : isUnverified ? ' ⚠' : ' ✓';
        const label = `${path?.shortLabel ?? r.invocationPath}${suffix}`;
        if (!locked) {
          return (
            <select
              value={r.invocationPath}
              onMouseDown={stopTablePointerEvent}
              onPointerDown={stopTablePointerEvent}
              onClick={stopTablePointerEvent}
              onChange={(event) => onPatchRow(r.id, { invocationPath: event.target.value as InvocationPath })}
              className="h-8 w-full min-w-[190px] rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500"
              title={path?.description}
            >
              {INVOCATION_PATH_OPTIONS.map((option) => {
                const optionAvailability = getInvocationPathAvailability(r.codingTool, option.id);
                return (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {optionAvailability.status === 'todo'
                      ? '（尚未支援）'
                      : optionAvailability.status === 'unverified'
                        ? '（需驗證）'
                        : ''}
                  </option>
                );
              })}
            </select>
          );
        }
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] border ${className}`}
            title={availability.notes ?? path?.description}
          >
            {label}
          </span>
        );
      },
    }),
    col.display({
      id: 'execution-plane',
      header: 'Compute',
      meta: { headerEn: 'Execution plane', headerZh: '運算面' },
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-primary">
          {executionPlaneLabel(row.original.invocationPath)}
        </span>
      ),
    }),
    col.display({
      id: 'coding-tool',
      header: 'Coding Tool',
      meta: { headerEn: 'Coding tool wrapper', headerZh: 'Coding Tool（CLI 殼）' },
      cell: ({ row }) => {
        const r = row.original;
        const locked = isCliCapabilityConfigLocked(r);
        const tool = findToolConfig(r.codingTool);
        if (locked) {
          return (
            <span
              className="inline-flex rounded-md bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-primary"
              title="已落地測試列不可直接修改，請複製成新列調整"
            >
              {tool?.label ?? r.codingTool}
            </span>
          );
        }
        return (
          <select
            value={r.codingTool}
            onMouseDown={stopTablePointerEvent}
            onPointerDown={stopTablePointerEvent}
            onClick={stopTablePointerEvent}
            onChange={(event) => {
              const codingTool = event.target.value as CodingTool;
              onPatchRow(r.id, {
                codingTool,
                invocationPath: defaultInvocationPathForTool(codingTool),
              });
            }}
            className="h-8 w-full min-w-[160px] rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500"
          >
            {TOOL_CONFIGS.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.label}
                {tool.status === 'todo' ? '（TODO）' : tool.status === 'unverified' ? '（⚠ 需先設定）' : ''}
              </option>
            ))}
          </select>
        );
      },
    }),
    col.display({
      id: 'ollama-model',
      header: 'Ollama Model',
      meta: { headerEn: 'Clodu Model/Local Model', headerZh: '模型選擇' },
      cell: ({ row }) => {
        const r = row.original;
        const locked = isCliCapabilityConfigLocked(r);
        return (
          <div className="flex items-center gap-1">
            <select
              value={r.ollamaModel}
              disabled={locked}
              onMouseDown={stopTablePointerEvent}
              onPointerDown={stopTablePointerEvent}
              onClick={stopTablePointerEvent}
              onChange={(event) => onPatchRow(r.id, { ollamaModel: event.target.value })}
              className="h-8 flex-1 min-w-[200px] rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              title={locked ? '已落地測試列不可直接修改，請複製成新列調整' : undefined}
            >
              {OLLAMA_CLOUD_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
              {!OLLAMA_CLOUD_MODELS.includes(r.ollamaModel) && r.ollamaModel && (
                <option value={r.ollamaModel}>{r.ollamaModel}（自訂）</option>
              )}
            </select>
            <button
              type="button"
              title={locked ? '已落地測試列不可直接修改，請複製成新列調整' : '🎲 隨機抽一個 ollama cloud 模型'}
              disabled={locked}
              onClick={(event) => { event.stopPropagation(); event.preventDefault(); onRandomModel(r.id); }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border-subtle bg-bg-primary text-text-secondary hover:bg-bg-tertiary hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Dice5 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    }),
    col.display({
      id: 'test-prompt',
      header: 'Test prompt',
      meta: { headerEn: 'Test prompt', headerZh: '測試 Prompt' },
      cell: ({ row }) => {
        const locked = isCliCapabilityConfigLocked(row.original);
        return (
          <textarea
            value={row.original.prompt}
            disabled={locked}
            onMouseDown={stopTablePointerEvent}
            onPointerDown={stopTablePointerEvent}
            onClick={stopTablePointerEvent}
            onChange={(event) => onPatchRow(row.original.id, { prompt: event.target.value })}
            className="h-24 w-full min-w-[360px] resize-none rounded-md border border-border-default bg-bg-secondary p-2 font-mono text-[11px] leading-4 text-text-primary outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            title={locked ? '已落地測試列不可直接修改，請複製成新列調整' : undefined}
          />
        );
      },
    }),
    col.display({
      id: 'run-controls',
      header: 'Run',
      meta: { headerEn: 'Run controls', headerZh: '執行控制' },
      cell: ({ row }) => {
        const r = row.original;
        const running = r.runStatus === 'running';
        const tool = findToolConfig(r.codingTool);
        const availability = getInvocationPathAvailability(r.codingTool, r.invocationPath);
        const disabled = running || r.runStatus === 'done' || tool?.status === 'todo' || availability.status === 'todo';
        return (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              title={r.runStatus === 'done'
                ? '已完成的測試結果不可覆寫，請複製成新列再測'
                : tool?.status === 'todo' || availability.status === 'todo'
                  ? availability.notes ?? '此 CLI 尚未支援此觸發路徑'
                  : '開始 CLI 評測'}
              disabled={disabled}
              onClick={(event) => { event.stopPropagation(); event.preventDefault(); onRunRow(r); }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-emerald-600 hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              title="複製成新列"
              onClick={(event) => { event.stopPropagation(); event.preventDefault(); onDuplicateRow(r); }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="檢視詳情 / Raw 輸出"
              onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(r); }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <ElapsedLabel runStatus={r.runStatus} runStartedAtMs={r.runStartedAtMs} />
          </div>
        );
      },
    }),
    col.display({
      id: 'requested-effective',
      header: 'Req / Eff',
      meta: { headerEn: 'Requested / Effective model', headerZh: '指定型號／實際自介' },
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-0.5 text-[11px] text-text-secondary">
            <p>
              指定：<span className="font-mono text-text-primary">{r.ollamaModel || '—'}</span>
            </p>
            <p>
              自介：
              <span className="font-mono text-amber-600">{r.effectiveModel || '—'}</span>
            </p>
            {r.modelSource && (
              <p className="text-[10px] text-text-muted">來源：{r.modelSource}</p>
            )}
          </div>
        );
      },
    }),
    col.display({
      id: 'raw-output',
      header: 'Raw',
      meta: { headerEn: 'Real-time raw output', headerZh: 'Raw 輸出（即時）' },
      cell: ({ row }) => {
        const r = row.original;
        const lastLines = r.rawLogs.slice(-3).join('\n');
        const preview = lastLines || r.resultText || r.message || '';
        return (
          <button
            type="button"
            title="點擊查看完整 Raw 輸出"
            onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(r); }}
            className="block w-full max-w-[420px] truncate text-left font-mono text-[11px] leading-4 text-text-secondary hover:text-text-primary"
          >
            <span className="block truncate">{preview || '尚未執行'}</span>
          </button>
        );
      },
    }),
    col.display({
      id: 'llm-evaluation',
      header: 'Result',
      meta: { headerEn: 'Result', headerZh: '測試結果' },
      cell: ({ row }) => {
        const r = row.original;
        const className = r.runStatus === 'done'
          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
          : r.runStatus === 'failed'
            ? 'border-rose-300 bg-rose-100 text-rose-800'
            : r.runStatus === 'running'
              ? 'border-sky-300 bg-sky-50 text-sky-900'
              : 'border-slate-300 bg-slate-100 text-slate-700';
        return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{statusLabel(r.runStatus)}</span>;
      },
    }),
    col.display({
      id: 'ttft',
      header: 'TTFT (ms)',
      meta: { headerEn: 'TTFT (ms)', headerZh: 'TTFT (ms) 首 token 延遲' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {row.original.ttftMs == null ? '—' : Math.round(row.original.ttftMs)}
        </span>
      ),
    }),
    col.display({
      id: 'e2e',
      header: 'E2E (ms)',
      meta: { headerEn: 'E2E (ms)', headerZh: 'E2E (ms) 完成時間' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {row.original.e2eMs == null ? '—' : Math.round(row.original.e2eMs)}
        </span>
      ),
    }),
    col.display({
      id: 'throughput',
      header: 'tok/s',
      meta: { headerEn: 'Throughput (tokens/s)', headerZh: '吞吐（tokens/s）' },
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {row.original.tokensPerSec == null ? '—' : row.original.tokensPerSec.toFixed(1)}
        </span>
      ),
    }),
    col.display({
      id: 'exit-status',
      header: 'Exit',
      meta: { headerEn: 'CLI exit code', headerZh: 'CLI 退出碼 / 錯誤類別' },
      cell: ({ row }) => {
        const r = row.original;
        if (r.errorType) {
          return <span className="text-[11px] text-rose-600">{r.errorType}</span>;
        }
        return (
          <span className="font-mono text-xs tabular-nums text-text-muted">
            {r.exitStatus ?? '—'}
          </span>
        );
      },
    }),
    col.display({
      id: 'test-history',
      header: 'History',
      meta: { headerEn: 'Test history', headerZh: '上次執行' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(row.original); }}
          className="text-left text-[11px] text-text-secondary hover:text-text-primary"
        >
          {row.original.lastRunAt ? new Date(row.original.lastRunAt).toLocaleString() : '尚無紀錄'}
        </button>
      ),
    }),
  ];
}
