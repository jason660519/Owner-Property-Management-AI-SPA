'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pause, Play, Square } from 'lucide-react';
import { ROADMAP_DATA } from '@/app/data/roadmap';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';
import type { CustomProjectProgressRowPayload } from '../../types';
import {
  DEV_TAB_DEFAULTS,
  DEV_TAB_PAGE_KEY,
  DEV_TAB_STORAGE_KEY,
  buildPromptContext,
  getRowKey,
  normalizeRowIdInput,
  type DevTabSettings,
  type IDEOption,
  type ProgressRow,
  type RowSource,
  type TaskDispatchConfig,
} from '../../components/development-table/types';
import { WORK_CATEGORY_OPTIONS, getDefaultPrompt } from '../../components/development-table/task-dispatch/prompt-templates';

function buildProgressRowFromCustom(r: CustomProjectProgressRowPayload): ProgressRow | null {
  const id = normalizeRowIdInput(r.rowId ?? '');
  if (!id) return null;
  const name = (r.name ?? '').trim();
  const category = (r.category ?? '').trim();
  if (!name || !category) return null;
  return {
    name,
    category,
    locatedPage: (r.locatedPage ?? '').trim() || undefined,
    percentage: typeof r.percentage === 'number' ? r.percentage : 0,
    featureSpecDocPath: (r.featureSpecDocPath ?? '').trim() || undefined,
    tddSpecDocPath: (r.tddSpecDocPath ?? '').trim() || undefined,
    docPath: (r.docPath ?? '').trim() || undefined,
    testCoverage: typeof r.testCoverage === 'number' ? r.testCoverage : undefined,
    e2eTestCoverage: typeof r.e2eTestCoverage === 'number' ? r.e2eTestCoverage : undefined,
    __rowId: id,
    __source: 'custom' as const,
  };
}

function buildDefaultDispatchConfig(row: ProgressRow): TaskDispatchConfig {
  const ctx = buildPromptContext(row, row.__rowId, '');
  return {
    ide: '',
    workCategory: '',
    adapterType: '',
    model: '',
    promptText: getDefaultPrompt(ctx),
  };
}

function mergeDispatchConfig(base: TaskDispatchConfig, patch: Partial<TaskDispatchConfig>): TaskDispatchConfig {
  return { ...base, ...patch };
}

type AdapterOption = {
  value: string;
  label: string;
  adapterType: string;
  model: string;
};

const ADAPTER_OPTIONS: AdapterOption[] = [
  { value: 'claude-sonnet-4-6', label: 'Claude + Sonet4.6', adapterType: 'claude', model: 'sonnet-4.6' },
  { value: 'claude-opus-4-6', label: 'Claude + Opus4.6', adapterType: 'claude', model: 'opus-4.6' },
  { value: 'claude-haiku-4-5', label: 'Claude + Hilku4.5', adapterType: 'claude', model: 'haiku-4.5' },
  { value: 'gemini-3-1-pro-preview', label: 'Gemini + Gimini3.1 Pro Preview', adapterType: 'gemini', model: 'gemini-3.1-pro-preview' },
  { value: 'codex-gpt-5-4-xhigh', label: 'Codex + GPT-5.4 (xhigh)', adapterType: 'codex', model: 'gpt-5.4-xhigh' },
  { value: 'codex-gpt-5-3-xhigh', label: 'Codex + GPT-5.3 Codex-xhigh', adapterType: 'codex', model: 'gpt-5.3-codex-xhigh' },
  { value: 'kilo-minimax-m2-6', label: 'Kilo + Minimax-m2.6', adapterType: 'kilo', model: 'minimax-m2.6' },
  { value: 'kilo-dola-seed-2-0-pro', label: 'Kilo + Dola Seed2.0 Pro', adapterType: 'kilo', model: 'dola-seed-2.0-pro' },
  { value: 'kilo-qwen-3-6-plus', label: 'Kilo + Qwen 3.6 Plus', adapterType: 'kilo', model: 'qwen-3.6-plus' },
];

type ExecutionStatus = 'idle' | 'running' | 'paused' | 'stopped';

export default function TaskPromptSettingsPage() {
  const router = useRouter();
  const params = useParams<{ rowId?: string | string[] }>();
  const rawRowId = Array.isArray(params.rowId) ? params.rowId[0] : params.rowId;
  const { settings: tablePrefs, patch: patchTablePrefs } = useTablePreferences<DevTabSettings>({
    pageKey: DEV_TAB_PAGE_KEY,
    storageKey: DEV_TAB_STORAGE_KEY,
    defaults: DEV_TAB_DEFAULTS,
  });

  const normalizedRowId = useMemo(() => normalizeRowIdInput(rawRowId ?? ''), [rawRowId]);

  const rowInfo = useMemo(() => {
    const features = ROADMAP_DATA.features;
    const numeric = /^\d+$/.test(normalizedRowId) ? parseInt(normalizedRowId, 10) : NaN;
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= features.length) {
      const idx = numeric - 1;
      const f = features[idx];
      if (!f) return null;
      return {
        row: { ...f, __rowId: normalizedRowId, __source: 'roadmap' as const } satisfies ProgressRow,
        source: 'roadmap' as RowSource,
      };
    }

    const custom = tablePrefs.customRows
      .map(buildProgressRowFromCustom)
      .find((r) => r?.__rowId === normalizedRowId);

    if (custom) {
      return { row: custom, source: 'custom' as RowSource };
    }

    return null;
  }, [normalizedRowId, tablePrefs.customRows]);

  const rowKey = useMemo(() => {
    if (!rowInfo) return '';
    return getRowKey(rowInfo.source, rowInfo.row.__rowId);
  }, [rowInfo]);

  const storedConfig = useMemo(() => {
    if (!rowKey) return null;
    return tablePrefs.taskDispatchConfigs[rowKey] ?? null;
  }, [rowKey, tablePrefs.taskDispatchConfigs]);

  const initialConfig = useMemo(() => {
    if (!rowInfo) return null;
    return storedConfig ?? buildDefaultDispatchConfig(rowInfo.row);
  }, [rowInfo, storedConfig]);

  const [ide, setIde] = useState<IDEOption>('');
  const [adapterType, setAdapterType] = useState('');
  const [model, setModel] = useState('');
  const [workCategory, setWorkCategory] = useState('');
  const [promptText, setPromptText] = useState('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');

  const persistConfig = useCallback((next: TaskDispatchConfig) => {
    if (!rowKey) return;
    patchTablePrefs({
      taskDispatchConfigs: {
        ...tablePrefs.taskDispatchConfigs,
        [rowKey]: next,
      },
    });
  }, [patchTablePrefs, rowKey, tablePrefs.taskDispatchConfigs]);

  useEffect(() => {
    if (!initialConfig) return;
    setIde(initialConfig.ide);
    setAdapterType(initialConfig.adapterType);
    setModel(initialConfig.model);
    setWorkCategory(initialConfig.workCategory);
    setPromptText(initialConfig.promptText);
  }, [initialConfig]);

  const handlePromptChange = useCallback((text: string) => {
    if (!rowInfo) return;
    setPromptText(text);
    persistConfig(mergeDispatchConfig(buildDefaultDispatchConfig(rowInfo.row), {
      ide,
      adapterType,
      model,
      workCategory,
      promptText: text,
    }));
  }, [rowInfo, ide, adapterType, model, workCategory, persistConfig]);

  const selectedAdapterValue = useMemo(() => {
    if (!adapterType || !model) return '';
    const found = ADAPTER_OPTIONS.find((option) => option.adapterType === adapterType && option.model === model);
    return found?.value ?? '';
  }, [adapterType, model]);

  const handleAdapterChange = useCallback((value: string) => {
    if (!rowInfo) return;
    const option = ADAPTER_OPTIONS.find((item) => item.value === value);
    if (!option) return;

    setAdapterType(option.adapterType);
    setModel(option.model);
    persistConfig(mergeDispatchConfig(buildDefaultDispatchConfig(rowInfo.row), {
      ide,
      adapterType: option.adapterType,
      model: option.model,
      workCategory,
      promptText,
    }));
  }, [rowInfo, ide, workCategory, promptText, persistConfig]);

  if (!rowInfo || !initialConfig) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push('/superadmin/dashboard/project-progress#development')} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary/60 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" />回到 Project Progress</button>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary p-4">
          <p className="text-sm font-medium text-text-primary">找不到 Row ID「{rawRowId ?? ''}」</p>
          <p className="mt-1 text-xs text-text-muted">請確認該 Row ID 是否存在於 Development Tab 的 roadmap 或自訂 rows。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push('/superadmin/dashboard/project-progress#development')} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary/60 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" />回到 Project Progress</button>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">Row {rowInfo.row.__rowId}</p>
            <p className="text-sm font-semibold text-text-primary truncate">{rowInfo.row.name}</p>
          </div>
        </div>
        <div className="text-xs text-text-muted">URL: <span className="font-mono">{`/superadmin/dashboard/project-progress/task/${rowInfo.row.__rowId}`}</span></div>
      </div>

      <div className="rounded-lg border border-border-default bg-bg-primary shadow-sm">
        <div className="border-b border-border-light px-4 py-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Prompt / IDE 設定</p>
          <p className="mt-0.5 text-xs text-text-muted truncate">{rowInfo.row.category}{rowInfo.row.locatedPage ? ` · ${rowInfo.row.locatedPage}` : ''}</p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-text-secondary">Row ID</p>
              <p className="rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs font-mono text-text-primary">{rowInfo.row.__rowId}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="adapter-option">Adapter</label>
              <select
                id="adapter-option"
                className="h-8 w-full rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={selectedAdapterValue}
                onChange={(e) => handleAdapterChange(e.target.value)}
              >
                <option value="">請選擇 Adapter</option>
                {ADAPTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-text-secondary">執行控制</p>
              <div className="flex h-8 items-center gap-1 rounded-md border border-border-default bg-bg-secondary px-1">
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                    executionStatus === 'running' ? 'bg-emerald-100 text-emerald-700' : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                  onClick={() => setExecutionStatus('running')}
                  aria-label="開始執行"
                  title="開始執行"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                    executionStatus === 'paused' ? 'bg-amber-100 text-amber-700' : 'text-amber-600 hover:bg-amber-50'
                  }`}
                  onClick={() => setExecutionStatus('paused')}
                  aria-label="暫緩執行"
                  title="暫緩執行"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
                    executionStatus === 'stopped' ? 'bg-rose-100 text-rose-700' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                  onClick={() => setExecutionStatus('stopped')}
                  aria-label="停止執行"
                  title="停止執行"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
                <span className="ml-1 text-[11px] text-text-muted">
                  {executionStatus === 'running' ? '執行中' : executionStatus === 'paused' ? '已暫緩' : executionStatus === 'stopped' ? '已停止' : '尚未開始'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-prompt">Prompt</label>
            <textarea
              id="dispatch-prompt"
              className="min-h-[220px] w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs text-text-primary placeholder-text-muted focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              value={promptText}
              onChange={e => handlePromptChange(e.target.value)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
