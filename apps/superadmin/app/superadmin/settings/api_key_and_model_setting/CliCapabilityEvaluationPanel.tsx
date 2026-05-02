'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dice5, Play, X } from 'lucide-react';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import {
  CLI_CAPABILITY_INITIAL_WIDTHS,
  CLI_CAPABILITY_MIN_WIDTH_PX,
  CLI_CAPABILITY_TABLE_ID,
  createCliCapabilityColumns,
  getCliCapabilityCategoryValue,
  getCliCapabilitySearchValue,
} from './cli-capability-evaluation-columns';
import {
  createCustomCliCapabilityRow,
  duplicateCliCapabilityRow,
  fromStoredRows,
  normalizeCliCapabilityRows,
  rowToStored,
  type CliCapabilityRow,
  type StoredCliCapabilityRow,
} from './cli-capability-row-state';
import {
  findToolConfig,
  OLLAMA_CLOUD_MODELS,
  pickRandomOllamaModel,
} from './cli-eval-tool-config';

const LS_CLI_CAPABILITY_ROWS = 'ai-settings:cli-capability:rows-v2';

type CliEvalRunResponse = {
  success: boolean;
  status?: 'done' | 'failed';
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  e2eMs?: number;
  ttftMs?: number | null;
  errorType?: string;
  message?: string;
  envInjected?: Record<string, string>;
  codingTool?: string;
  ollamaModel?: string;
};

async function runCliEval(row: CliCapabilityRow): Promise<CliEvalRunResponse> {
  const response = await fetch('/api/ai-settings/cli-eval-runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      codingTool: row.codingTool,
      ollamaModel: row.ollamaModel,
      prompt: row.prompt,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { success: false, message: `啟動失敗（HTTP ${response.status}）${text ? `: ${text}` : ''}`, status: 'failed' };
  }
  return response.json() as Promise<CliEvalRunResponse>;
}

/** Pull a self-introduction snippet (e.g. "MiniMax-M2.7") out of stdout for the Eff column. */
function detectSelfReportedModel(stdout: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) return '';
  const candidates = [
    /minimax[- ]?m?\d+(?:[.\-]\d+)?/i,
    /kimi[- ]?k?\d+(?:[.\-]\d+)?/i,
    /gpt[- ]?\d+(?:[.\-]\d+)?(?:o|o-mini|turbo|codex)?/i,
    /claude[- ]?\d+(?:[.\-]\d+)?(?:[- ]?(opus|sonnet|haiku))?/i,
    /qwen[- ]?\d+(?:[.\-]\d+)?(?:[- ]?(coder|plus|max))?/i,
    /deepseek[- ]?v?\d+(?:[.\-]\d+)?/i,
    /gpt[- ]?oss/i,
    /gemini[- ]?\d+(?:[.\-]\d+)?/i,
    /llama[- ]?\d+/i,
    /grok[- ]?\d+/i,
  ];
  for (const re of candidates) {
    const m = trimmed.match(re);
    if (m) return m[0];
  }
  return '';
}

export function CliCapabilityEvaluationPanel() {
  const [rows, setRows] = useState<CliCapabilityRow[]>(() => {
    const stored = readLocalStorage<StoredCliCapabilityRow[]>(LS_CLI_CAPABILITY_ROWS, []);
    return fromStoredRows(stored);
  });
  const [detailRow, setDetailRow] = useState<CliCapabilityRow | null>(null);
  const cancelledIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    writeLocalStorage(LS_CLI_CAPABILITY_ROWS, rows.map(rowToStored));
  }, [rows]);

  const patchRow = useCallback((rowId: string, patch: Partial<CliCapabilityRow>) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => normalizeCliCapabilityRows([
      ...prev,
      createCustomCliCapabilityRow(prev.length + 1),
    ]));
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    cancelledIdsRef.current.add(rowId);
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (next.length > 0) return normalizeCliCapabilityRows(next);
      return [createCustomCliCapabilityRow(1)];
    });
  }, []);

  const duplicateRow = useCallback((row: CliCapabilityRow) => {
    setRows((prev) => normalizeCliCapabilityRows([
      ...prev,
      duplicateCliCapabilityRow(row, prev.length + 1),
    ]));
  }, []);

  const openDetailRow = useCallback((row: CliCapabilityRow) => {
    setDetailRow(row);
  }, []);

  const randomModel = useCallback((rowId: string) => {
    setRows((prev) => prev.map((row) => row.id === rowId
      ? { ...row, ollamaModel: pickRandomOllamaModel(row.ollamaModel) }
      : row));
  }, []);

  const randomAllModels = useCallback(() => {
    setRows((prev) => prev.map((row) => ({
      ...row,
      ollamaModel: pickRandomOllamaModel(row.ollamaModel),
    })));
  }, []);

  const runRow = useCallback(async (row: CliCapabilityRow) => {
    if (row.runStatus === 'running') return;
    const tool = findToolConfig(row.codingTool);
    if (tool?.status === 'todo') {
      patchRow(row.id, {
        runStatus: 'failed',
        errorType: 'todo',
        message: tool.notes ?? '此 CLI 尚未支援 headless 模式。',
        runStartedAtMs: null,
        lastRunAt: new Date().toISOString(),
      });
      return;
    }
    cancelledIdsRef.current.delete(row.id);

    const startedAtMs = Date.now();
    patchRow(row.id, {
      runStatus: 'running',
      runStartedAtMs: startedAtMs,
      message: `啟動 ${tool?.label ?? row.codingTool}（model: ${row.ollamaModel}）…`,
      resultText: '',
      rawLogs: [],
      command: '',
      effectiveModel: '',
      modelSource: '',
      ttftMs: null,
      e2eMs: null,
      tokensPerSec: null,
      exitStatus: null,
      errorType: '',
    });

    const response = await runCliEval(row);
    if (cancelledIdsRef.current.has(row.id)) return;

    const stdout = response.stdout ?? '';
    const stderr = response.stderr ?? '';
    const rawLogs = [
      response.command ? `$ ${response.command}` : '',
      stdout && `--- stdout ---\n${stdout}`,
      stderr && `--- stderr ---\n${stderr}`,
    ].filter(Boolean).join('\n\n').split('\n');

    const isDone = response.success && response.status === 'done';
    patchRow(row.id, {
      runStatus: isDone ? 'done' : 'failed',
      runStartedAtMs: null,
      command: response.command ?? '',
      resultText: stdout,
      rawLogs,
      effectiveModel: detectSelfReportedModel(stdout),
      modelSource: 'stdout-self-report',
      ttftMs: response.ttftMs ?? null,
      e2eMs: response.e2eMs ?? Date.now() - startedAtMs,
      exitStatus: response.exitCode ?? null,
      errorType: response.errorType ?? '',
      message: response.message ?? (isDone ? 'CLI 完成。' : 'CLI 失敗。'),
      lastRunAt: new Date().toISOString(),
    });
  }, [patchRow]);

  const columns = useMemo(
    () => createCliCapabilityColumns({
      onPatchRow: patchRow,
      onRunRow: (row) => void runRow(row),
      onDeleteRow: deleteRow,
      onDuplicateRow: duplicateRow,
      onOpenDetail: openDetailRow,
      onRandomModel: randomModel,
    }),
    [deleteRow, duplicateRow, openDetailRow, patchRow, randomModel, runRow],
  );

  const runAll = useCallback(async () => {
    const runnable = rows.filter((row) => row.shouldTest && row.runStatus !== 'running');
    if (runnable.length === 0) return;
    // CLI calls hit local subprocesses + ollama daemon — limit concurrency so
    // we don't oversubscribe both. 2 is a conservative starting point.
    const concurrency = 2;
    for (let i = 0; i < runnable.length; i += concurrency) {
      const batch = runnable.slice(i, i + concurrency);
      await Promise.allSettled(batch.map((row) => runRow(row)));
    }
  }, [rows, runRow]);

  const detail = detailRow ? rows.find((row) => row.id === detailRow.id) ?? detailRow : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="shrink-0 rounded-base border border-dashed border-border-default bg-bg-secondary px-3 py-2 text-[11px] text-text-secondary">
        <p>
          <span className="font-semibold text-text-primary">執行模式：</span>
          每列實際 spawn{' '}
          <code className="font-mono">ollama launch &lt;tool&gt; --model &lt;m&gt; --yes -- &lt;headless flags&gt;</code>
          （由 ollama 0.21+ 自家 wrapper 注入 backend env / proxy）。
          ✓claude / ✓codex（OSS 路徑）/ ✓copilot 已驗證可拿到 stdout；
          opencode 在 headless 下尚未通，需先在 terminal 跑{' '}
          <code className="font-mono">ollama launch opencode --config</code> 完成 ollama provider 設定。
        </p>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EnhancedTable<CliCapabilityRow>
          tableId={CLI_CAPABILITY_TABLE_ID}
          columns={columns}
          data={rows}
          initialWidths={[...CLI_CAPABILITY_INITIAL_WIDTHS]}
          minWidth={CLI_CAPABILITY_MIN_WIDTH_PX}
          stretchToContainer={false}
          fillAvailableHeight
          persistentHorizontalScrollbar
          onAddRow={addRow}
          getSearchValue={getCliCapabilitySearchValue}
          getCategoryValue={getCliCapabilityCategoryValue}
          extraToolbar={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => randomAllModels()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
                title="🎲 一鍵為所有列重抽 ollama cloud 模型"
              >
                <Dice5 size={14} aria-hidden />
                全表隨機抽模型
              </button>
              <button
                type="button"
                onClick={() => void runAll()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                title="依勾選列依序啟動 CLI 評測"
              >
                <Play size={14} aria-hidden />
                全測（CLI）
              </button>
            </div>
          }
        />
      </div>

      {detail && (
        <CliCapabilityDetailSheet
          detail={detail}
          onClose={() => setDetailRow(null)}
        />
      )}
    </div>
  );
}

function CliCapabilityDetailSheet({
  detail,
  onClose,
}: {
  detail: CliCapabilityRow;
  onClose: () => void;
}) {
  const tool = findToolConfig(detail.codingTool);
  const rawText = detail.rawLogs.length > 0 ? detail.rawLogs.join('\n') : '（尚無 log）';
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40" role="dialog" aria-modal>
      <div className="flex h-full w-full max-w-[680px] flex-col bg-bg-primary shadow-2xl">
        <header className="flex items-start justify-between border-b border-border-default px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-text-muted">CLI 評測詳情</p>
            <h3 className="truncate text-sm font-semibold text-text-primary">
              {tool?.label ?? detail.codingTool} · <span className="font-mono">{detail.ollamaModel}</span>
            </h3>
            <p className="mt-1 text-[11px] text-text-secondary">
              指定 ollama model：<span className="font-mono">{detail.ollamaModel || '—'}</span>
              {' '}· 自介：<span className="font-mono">{detail.effectiveModel || '—'}</span>
            </p>
            {tool?.notes && (
              <p className="mt-1 text-[11px] text-amber-700">{tool.notes}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-border-subtle text-text-secondary hover:bg-bg-secondary"
            aria-label="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 border-b border-border-default px-4 py-3 text-[11px] text-text-secondary">
          <p>狀態：<span className="font-mono text-text-primary">{detail.runStatus}</span></p>
          <p>TTFT：<span className="font-mono">{detail.ttftMs == null ? '—' : `${Math.round(detail.ttftMs)} ms`}</span></p>
          <p>E2E：<span className="font-mono">{detail.e2eMs == null ? '—' : `${Math.round(detail.e2eMs)} ms`}</span></p>
          <p>tok/s：<span className="font-mono">{detail.tokensPerSec == null ? '—' : detail.tokensPerSec.toFixed(1)}</span></p>
          <p>Exit code：<span className="font-mono">{detail.exitStatus ?? '—'}</span></p>
          <p>錯誤：<span className="font-mono">{detail.errorType || '—'}</span></p>
        </div>

        <div className="border-b border-border-default px-4 py-3">
          <p className="text-[11px] font-semibold text-text-muted">啟動命令（headless）</p>
          <pre className="mt-1 max-h-[120px] overflow-auto rounded bg-bg-tertiary p-2 font-mono text-[11px] leading-4 text-text-primary">
            {detail.command || `${tool?.cliBinary ?? detail.codingTool} ...`}
          </pre>
        </div>

        <div className="border-b border-border-default px-4 py-3">
          <p className="text-[11px] font-semibold text-text-muted">模型輸出（stdout）</p>
          <pre className="mt-1 max-h-[200px] overflow-auto rounded bg-bg-tertiary p-2 font-mono text-[11px] leading-4 text-text-primary whitespace-pre-wrap">
            {detail.resultText || detail.message || '尚未取得結果。'}
          </pre>
        </div>

        <div className="flex-1 overflow-hidden px-4 py-3">
          <p className="text-[11px] font-semibold text-text-muted">完整 Raw Log（含 stderr）</p>
          <pre className="mt-1 h-[calc(100%-1.5rem)] overflow-auto rounded bg-bg-tertiary p-2 font-mono text-[11px] leading-4 text-text-primary whitespace-pre-wrap">
            {rawText}
          </pre>
          <p className="mt-2 text-[10px] text-text-muted">
            可用 ollama cloud 模型清單（{OLLAMA_CLOUD_MODELS.length}）：
            <span className="font-mono">{OLLAMA_CLOUD_MODELS.join(', ')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
