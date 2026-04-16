'use client';

import React from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Play, Pause, Square, Upload } from 'lucide-react';
import type { AdapterConfigItem } from '@/lib/adapter-config';

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
  runStatus: 'idle' | 'running' | 'paused' | 'stopped';
  outputLines: string[];
  runCount: number;
  logCursor: number;
  pid: number | null;
  commandPreview: string;
  renderedOutput: string;
  resolvedModel: string;
  reviewStatus: 'planned' | 'ok';
};

export type AdapterPromptOptionCell = { id: string; label: string; content: string };

/** 001–999 三位數；超過 999 顯示實際整數避免重複編號 */
export function formatAdapterSerial(n: number): string {
  if (!Number.isFinite(n) || n < 1) return '001';
  if (n <= 999) return String(n).padStart(3, '0');
  return String(n);
}

export interface CreateAdapterConfigColumnsDeps {
  providerLabel: Record<string, string>;
  lifecycleLabel: Record<string, string>;
  runStatusLabel: Record<AdapterConfigDraftCell['runStatus'], string>;
  reviewLabel: Record<'planned' | 'ok', string>;
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
}

const col = createColumnHelper<AdapterConfigTableRow>();

function meta(en: string, zh: string) {
  return { headerEn: en, headerZh: zh };
}

export function createAdapterConfigColumns(
  deps: CreateAdapterConfigColumnsDeps,
): ColumnDef<AdapterConfigTableRow, unknown>[] {
  const {
    providerLabel,
    lifecycleLabel,
    runStatusLabel,
    reviewLabel,
    promptOptions,
    adapterFileInputRefs,
    setAdapterConfigDrafts,
    startAdapterRun,
    controlAdapterRun,
  } = deps;

  return [
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
        return (
          <>
            <p className="font-medium text-xs text-text-primary">{item.optionLabel}</p>
            <p className="mt-1 text-[11px] text-text-muted">
              狀態：{lifecycleLabel[item.status] ?? item.status}
            </p>
            <p className="mt-1 font-mono text-[11px] text-text-muted break-all">
              CLI：{item.cliCommandTemplate}
            </p>
            <p className="mt-1 text-[11px] text-text-muted break-all">文件：{item.docsPath}</p>
          </>
        );
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
              onChange={(e) => {
                const value = e.target.value;
                setAdapterConfigDrafts((prev) => ({
                  ...prev,
                  [item.id]: { ...draft, promptText: value },
                }));
              }}
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex items-center gap-2">
              <select
                value={draft.selectedPromptId}
                onChange={(e) => {
                  const value = e.target.value;
                  setAdapterConfigDrafts((prev) => ({
                    ...prev,
                    [item.id]: { ...draft, selectedPromptId: value },
                  }));
                }}
                className="h-8 flex-1 rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                onClick={() => {
                  const selected = promptOptions.find((p) => p.id === draft.selectedPromptId);
                  if (!selected) return;
                  setAdapterConfigDrafts((prev) => ({
                    ...prev,
                    [item.id]: {
                      ...draft,
                      promptText: selected.content,
                    },
                  }));
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
              <span className="ml-1 text-[11px] text-text-muted">{runStatusLabel[draft.runStatus]}</span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">已執行輪次：{draft.runCount}</p>
            {draft.pid != null && <p className="text-[11px] text-text-muted">PID：{draft.pid}</p>}
          </>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,

    col.display({
      id: 'col-resolved',
      meta: meta('Resolved model', 'Resolved Model'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        return (
          <p className="break-all font-mono text-xs text-text-primary">{draft.resolvedModel || item.model}</p>
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
      meta: meta('Review', '測試ＯＫ'),
      enableSorting: false,
      cell: ({ row }) => {
        const { item, draft } = row.original;
        return (
          <button
            type="button"
            onClick={() => {
              setAdapterConfigDrafts((prev) => ({
                ...prev,
                [item.id]: {
                  ...draft,
                  reviewStatus: draft.reviewStatus === 'ok' ? 'planned' : 'ok',
                },
              }));
            }}
            className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold transition ${
              draft.reviewStatus === 'ok'
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
            title="切換測試審核狀態"
          >
            {reviewLabel[draft.reviewStatus]}
          </button>
        );
      },
    }) as ColumnDef<AdapterConfigTableRow, unknown>,
  ];
}
