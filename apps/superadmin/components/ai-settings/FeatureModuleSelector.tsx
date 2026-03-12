// filepath: apps/superadmin/components/ai-settings/FeatureModuleSelector.tsx
// Table: 第一欄 = 已選 model（與 ModelEvaluator 一致），同一列 = 7 個功能模組

'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Cloud,
  MessageCircle,
  FileText,
  PenTool,
  Layout,
  Settings2,
  Plus,
  X,
  Cog,
  Filter,
  AlignLeft,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { FEATURE_MODULES, AI_PROVIDERS } from '@/lib/ai-providers';
import type { FeatureModule } from '@/lib/ai-providers';
import type {
  SavedModule, SavedKey, SavedModel, AssignedModel, ModelSettings,
} from '@/lib/hooks/useAISettings';
import { ModelSettingsModal, type ModuleConfig } from './ModelSettingsModal';

interface FeatureModuleSelectorProps {
  savedModules: SavedModule[];
  savedKeys: SavedKey[];
  savedModels: SavedModel[];
  onSave: (
    moduleKey: string,
    isEnabled: boolean,
    assignedModels: AssignedModel[],
    config?: Record<string, unknown>
  ) => Promise<void>;
  onTestModel?: (
    provider: string,
    modelId: string
  ) => Promise<{ success: boolean; message?: string; output?: string }>;
}

const iconMap: Record<string, React.ElementType> = {
  cloud: Cloud,
  'hard-drive': Settings2,
  'message-circle': MessageCircle,
  'file-text': FileText,
  'pen-tool': PenTool,
  layout: Layout,
};

const categoryColors: Record<string, { text: string; bg: string; border: string }> = {
  ocr:       { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  assistant: { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  generator: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const categoryLabels: Record<string, string> = {
  ocr: 'OCR',
  assistant: '助理',
  generator: '生成',
};

const providerChipColors: Record<string, string> = {
  openai:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  anthropic: 'bg-orange-500/15  text-orange-400  border-orange-500/20',
  gemini:    'bg-blue-500/15    text-blue-400    border-blue-500/20',
  deepseek:  'bg-cyan-500/15    text-cyan-400    border-cyan-500/20',
  grok:      'bg-rose-500/15    text-rose-400    border-rose-500/20',

};

const DEFAULT_FIRST_COL_WIDTH = 180;
const DEFAULT_MODULE_COL_WIDTH = 140;
const MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 480;

type TableHAlign = 'left' | 'center' | 'right';
type TableVAlign = 'top' | 'middle' | 'bottom';

const TABLE_H_ALIGN_CLASSES: Record<TableHAlign, string> = {
  left: '[&_th]:text-left [&_td]:text-left',
  center: '[&_th]:text-center [&_td]:text-center',
  right: '[&_th]:text-right [&_td]:text-right',
};

const TABLE_V_ALIGN_CLASSES: Record<TableVAlign, string> = {
  top: '[&_th]:align-top [&_td]:align-top',
  middle: '[&_th]:align-middle [&_td]:align-middle',
  bottom: '[&_th]:align-bottom [&_td]:align-bottom',
};

interface ModuleRowState {
  isEnabled: boolean;
  assignments: AssignedModel[];
}

export function FeatureModuleSelector({
  savedModules,
  savedKeys,
  savedModels,
  onSave,
  onTestModel,
}: FeatureModuleSelectorProps) {
  // Providers that have a saved key; models filtered to those the user has selected
  const availableProviders = useMemo(
    () =>
      AI_PROVIDERS.filter((p) => savedKeys.some((k) => k.provider === p.id)).map((p) => ({
        id: p.id,
        name: p.name,
        models: savedModels
          .filter((m) => m.provider === p.id)
          .map((m) => ({ id: m.model_id, name: m.model_name ?? m.model_id })),
      })),
    [savedKeys, savedModels],
  );

  const hasAnyModels = useMemo(
    () => availableProviders.some((p) => p.models.length > 0),
    [availableProviders],
  );

  // Per-module state (enabled + assignments)
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleRowState>>(() => {
    const init: Record<string, ModuleRowState> = {};
    for (const mod of FEATURE_MODULES) {
      const saved = savedModules.find((s) => s.module_key === mod.key);
      init[mod.key] = {
        isEnabled: saved?.is_enabled ?? false,
        assignments: Array.isArray(saved?.assigned_models) ? [...saved.assigned_models] : [],
      };
    }
    return init;
  });

  // Per-module LLM config (custom instructions + prompt)
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfig>>(() => {
    const init: Record<string, ModuleConfig> = {};
    for (const mod of FEATURE_MODULES) {
      const saved = savedModules.find((s) => s.module_key === mod.key);
      const c = (saved?.config ?? {}) as Partial<ModuleConfig>;
      init[mod.key] = {
        custom_instructions: typeof c.custom_instructions === 'string' ? c.custom_instructions : '',
        prompt: typeof c.prompt === 'string' ? c.prompt : '',
      };
    }
    return init;
  });

  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => ({
    selected: DEFAULT_FIRST_COL_WIDTH,
    ...Object.fromEntries(FEATURE_MODULES.map((m) => [m.key, DEFAULT_MODULE_COL_WIDTH])),
  }));
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [settingsModal, setSettingsModal] = useState<{
    moduleKey: string;
    moduleName: string;
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  } | null>(null);

  const [tableAlignH, setTableAlignH] = useState<TableHAlign>('left');
  const [tableAlignV, setTableAlignV] = useState<TableVAlign>('middle');
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [freezeHeader, setFreezeHeader] = useState(false);
  const alignDropdownRef = useRef<HTMLDivElement | null>(null);
  const viewDropdownRef = useRef<HTMLDivElement | null>(null);

  const markSaving = useCallback((key: string, on: boolean) => {
    setSavingSet((prev) => {
      const next = new Set(prev);
      on ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  const getNextPriority = (assignments: AssignedModel[]) => {
    if (assignments.length === 0) return 1;
    return Math.min(Math.max(...assignments.map((a) => a.priority ?? 0)) + 1, 100);
  };

  const handleToggleEnabled = useCallback(
    async (moduleKey: string) => {
      const cur = moduleStates[moduleKey];
      const next = !cur.isEnabled;
      setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], isEnabled: next } }));
      markSaving(moduleKey, true);
      try {
        await onSave(moduleKey, next, cur.assignments);
      } finally {
        markSaving(moduleKey, false);
      }
    },
    [moduleStates, onSave, markSaving],
  );

  const handleAssignModel = useCallback(
    async (moduleKey: string, providerId: string, modelId: string) => {
      const cur = moduleStates[moduleKey];
      const exists = cur.assignments.some(
        (a) => a.provider === providerId && a.model === modelId,
      );
      const next = exists
        ? cur.assignments.filter((a) => !(a.provider === providerId && a.model === modelId))
        : [
            ...cur.assignments,
            {
              provider: providerId,
              model: modelId,
              priority: getNextPriority(cur.assignments),
            },
          ];
      setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
      markSaving(moduleKey, true);
      try {
        await onSave(moduleKey, cur.isEnabled, next);
      } finally {
        markSaving(moduleKey, false);
      }
    },
    [moduleStates, onSave, markSaving],
  );

  const handlePriorityChange = useCallback(
    async (
      moduleKey: string,
      providerId: string,
      modelId: string,
      newPriority: number,
    ) => {
      const cur = moduleStates[moduleKey];
      const num = Math.max(1, Math.min(100, Math.round(newPriority)));
      const next = cur.assignments.map((a) =>
        a.provider === providerId && a.model === modelId ? { ...a, priority: num } : a,
      );
      setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
      markSaving(moduleKey, true);
      try {
        await onSave(moduleKey, cur.isEnabled, next);
      } finally {
        markSaving(moduleKey, false);
      }
    },
    [moduleStates, onSave, markSaving],
  );

  const handleModelSettingsSave = useCallback(
    async (
      moduleKey: string,
      providerId: string,
      modelId: string,
      newSettings: ModelSettings,
      moduleConfig?: ModuleConfig,
    ) => {
      const cur = moduleStates[moduleKey];
      const exists = cur.assignments.some(
        (a) => a.provider === providerId && a.model === modelId,
      );
      const next = exists
        ? cur.assignments.map((a) =>
            a.provider === providerId && a.model === modelId
              ? { ...a, settings: newSettings }
              : a,
          )
        : [
            ...cur.assignments,
            {
              provider: providerId,
              model: modelId,
              priority: getNextPriority(cur.assignments),
              settings: newSettings,
            },
          ];
      setModuleStates((p) => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
      if (moduleConfig) setModuleConfigs((p) => ({ ...p, [moduleKey]: moduleConfig }));
      markSaving(moduleKey, true);
      try {
        const cfg = moduleConfig ?? moduleConfigs[moduleKey];
        await onSave(
          moduleKey,
          cur.isEnabled,
          next,
          cfg
            ? { custom_instructions: cfg.custom_instructions, prompt: cfg.prompt }
            : undefined,
        );
      } finally {
        markSaving(moduleKey, false);
      }
    },
    [moduleStates, moduleConfigs, onSave, markSaving],
  );

  const startResize = useCallback((colKey: string, clientX: number) => {
    const w = columnWidths[colKey] ?? (colKey === 'selected' ? DEFAULT_FIRST_COL_WIDTH : DEFAULT_MODULE_COL_WIDTH);
    resizeRef.current = { startX: clientX, startWidth: w };
    setResizingCol(colKey);
  }, [columnWidths]);

  useEffect(() => {
    if (resizingCol == null) return;
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const next = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, r.startWidth + dx));
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: next }));
    };
    const onUp = () => {
      resizeRef.current = null;
      setResizingCol(null);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      onUp();
    };
  }, [resizingCol]);

  const filteredModules = useMemo(
    () =>
      !filterCategory
        ? FEATURE_MODULES
        : FEATURE_MODULES.filter((m) => m.category === filterCategory),
    [filterCategory],
  );

  const enabledModuleCount = useMemo(
    () => Object.values(moduleStates).filter((s) => s.isEnabled).length,
    [moduleStates],
  );
  const assignedModuleCount = useMemo(
    () => Object.values(moduleStates).filter((s) => s.assignments.length > 0).length,
    [moduleStates],
  );
  const totalAssignmentCount = useMemo(
    () => Object.values(moduleStates).reduce((sum, s) => sum + s.assignments.length, 0),
    [moduleStates],
  );

  return (
    <div className="space-y-4">
      {/* ── Stats + filter bar ── */}
      <div className="rounded-lg border border-border-subtle bg-bg-tertiary/60 flex flex-wrap items-center gap-3 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 text-[11px] text-text-secondary">
          <span>
            已啟用模組{' '}
            <span className="font-medium text-text-primary">
              {enabledModuleCount}/{FEATURE_MODULES.length}
            </span>
            {' '}・已配置模型{' '}
            <span className="font-medium text-text-primary">
              {assignedModuleCount}/{FEATURE_MODULES.length}
            </span>
          </span>
          <span className="text-text-muted">
            共綁定 {totalAssignmentCount} 組「模組 × 模型」；優先序 1 為主模型，其餘為備援。
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <Filter size={13} className="text-text-muted shrink-0" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent min-w-[130px]"
          >
            <option value="">全部類別</option>
            <option value="ocr">OCR</option>
            <option value="assistant">助理</option>
            <option value="generator">生成</option>
          </select>
        </div>
      </div>

      {/* Layout / View controls for modules table */}
      <div className="flex items-center justify-end gap-2">
        <div className="relative" ref={alignDropdownRef}>
          <button
            type="button"
            onClick={() => setAlignDropdownOpen((open) => !open)}
            aria-expanded={alignDropdownOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            title="表格文字排版"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            排版
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${alignDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {alignDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3">
              <p className="text-[10px] text-text-muted mb-2">套用至整個表格（所有 col）</p>
              <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
              <div className="flex gap-1 mb-3">
                {(['left', 'center', 'right'] as TableHAlign[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTableAlignH(h)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                      tableAlignH === h
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                    }`}
                  >
                    {h === 'left' ? '靠左' : h === 'center' ? '左右置中' : '靠右'}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
              <div className="flex gap-1">
                {(['top', 'middle', 'bottom'] as TableVAlign[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTableAlignV(v)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                      tableAlignV === v
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                    }`}
                  >
                    {v === 'top' ? '靠上' : v === 'middle' ? '上下置中' : '靠下'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={viewDropdownRef}>
          <button
            type="button"
            onClick={() => setViewDropdownOpen((open) => !open)}
            aria-expanded={viewDropdownOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            title="檢視選項"
          >
            <Eye className="w-3.5 h-3.5" />
            View
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {viewDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2">
              <button
                type="button"
                onClick={() => {
                  setFreezeHeader(false);
                  setViewDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  !freezeHeader
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                    : 'text-text-primary hover:bg-bg-secondary'
                }`}
              >
                不凍結標題列
              </button>
              <button
                type="button"
                onClick={() => {
                  setFreezeHeader(true);
                  setViewDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  freezeHeader
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                    : 'text-text-primary hover:bg-bg-secondary'
                }`}
              >
                凍結標題列
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Notice when no models are configured ── */}
      {!hasAnyModels && (
        <div className="rounded-base border border-amber-300/40 bg-amber-50/10 px-4 py-2.5 text-xs text-amber-400">
          尚未設定 API 金鑰或選擇模型。模組可先行啟用，但需在「API 金鑰管理」設定金鑰並於「統一測試設定」選擇模型後，才能綁定模型。
        </div>
      )}

      {/* ── Modules table: 第一欄 = 已選 model，同一列 = 7 個功能模組；欄寬可拖曳調整 ── */}
      <div
        className={`rounded-lg border border-border-default overflow-hidden bg-bg-primary ${TABLE_H_ALIGN_CLASSES[tableAlignH]} ${TABLE_V_ALIGN_CLASSES[tableAlignV]}`}
      >
        <div className="overflow-x-auto">
          <table
            className="text-xs border-collapse table-fixed"
            style={{
              width: Math.max(
                800,
                (columnWidths['selected'] ?? DEFAULT_FIRST_COL_WIDTH) +
                  filteredModules.reduce(
                    (sum, m) => sum + (columnWidths[m.key] ?? DEFAULT_MODULE_COL_WIDTH),
                    0
                  ),
              ),
            }}
          >
            <colgroup>
              <col style={{ width: columnWidths['selected'] ?? DEFAULT_FIRST_COL_WIDTH }} />
              {filteredModules.map((mod: FeatureModule) => (
                <col key={mod.key} style={{ width: columnWidths[mod.key] ?? DEFAULT_MODULE_COL_WIDTH }} />
              ))}
            </colgroup>
            <thead className={freezeHeader ? 'sticky top-0 z-10 bg-bg-tertiary' : undefined}>
              <tr className="border-b border-border-subtle bg-bg-tertiary">
                <th className="text-left py-3 px-3 font-semibold text-text-secondary border-r border-border-subtle relative align-top">
                  <span>已選</span>
                  <button
                    type="button"
                    aria-label="調整欄寬"
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none hover:bg-accent/30 active:bg-accent/50 transition-colors"
                    style={{ marginRight: '-3px' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startResize('selected', e.clientX);
                    }}
                  />
                </th>
                {filteredModules.map((mod: FeatureModule) => {
                  const Icon = iconMap[mod.icon] ?? Settings2;
                  const colors = categoryColors[mod.category];
                  const state = moduleStates[mod.key];
                  const saving = savingSet.has(mod.key);
                  return (
                    <th
                      key={mod.key}
                      className="text-left py-2 px-2 font-semibold text-text-secondary border-r border-border-subtle align-top relative"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 shrink-0 rounded flex items-center justify-center ${colors.bg}`}
                          >
                            <Icon size={12} className={colors.text} />
                          </div>
                          <span className="leading-tight">{mod.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(mod.key)}
                          disabled={saving}
                          title={state.isEnabled ? '點擊停用此模組' : '點擊啟用此模組'}
                          className={[
                            'self-start inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all',
                            state.isEnabled
                              ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25'
                              : 'bg-bg-tertiary text-text-muted border-border-subtle hover:text-text-secondary',
                            saving ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                          ].join(' ')}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              state.isEnabled ? 'bg-accent' : 'bg-text-muted'
                            }`}
                          />
                          {state.isEnabled ? '啟用' : '停用'}
                        </button>
                        {(mod.key === 'online_ocr_parse' || mod.key === 'online_ocr_judge') && (
                          <p className="text-[9px] leading-tight text-text-muted mt-0.5">
                            {mod.key === 'online_ocr_parse'
                              ? '建議配置 2~3 個 vision 模型以啟用共識模式'
                              : '可選配置，僅在有衝突時呼叫'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="調整欄寬"
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize touch-none hover:bg-accent/30 active:bg-accent/50 transition-colors"
                        style={{ marginRight: '-3px' }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startResize(mod.key, e.clientX);
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {savedModels.length === 0 && (
                <tr>
                  <td
                    colSpan={filteredModules.length + 1}
                    className="py-8 px-3 text-center text-text-muted text-[11px]"
                  >
                    尚無已選模型。請先至「統一測試設定」勾選要使用的模型。
                  </td>
                </tr>
              )}
              {savedModels.map((m) => {
                const modelKey = `${m.provider}::${m.model_id}`;
                const prov = availableProviders.find((p) => p.id === m.provider);
                const modelName = m.model_name ?? m.model_id;
                const chipColor =
                  providerChipColors[m.provider] ??
                  'bg-bg-tertiary text-text-secondary border-border-subtle';
                return (
                  <tr
                    key={modelKey}
                    className="border-b border-border-subtle/50 bg-bg-primary hover:bg-bg-secondary transition-colors"
                  >
                    <td className="py-2.5 px-3 align-middle border-r border-border-subtle min-w-0">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] border max-w-full ${chipColor}`}>
                        <span className="min-w-0 truncate font-medium" title={modelName}>
                          {modelName}
                        </span>
                      </div>
                    </td>
                    {filteredModules.map((mod: FeatureModule) => {
                      const state = moduleStates[mod.key];
                      const assign = state.assignments.find(
                        (a) => a.provider === m.provider && a.model === m.model_id
                      );
                      const saving = savingSet.has(mod.key);

                      return (
                        <td
                          key={mod.key}
                          className="py-2 px-2 align-middle border-r border-border-subtle"
                        >
                          {assign ? (
                            <div
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${chipColor}`}
                            >
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={assign.priority ?? 1}
                                onChange={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(n) && n >= 1 && n <= 100) {
                                    setModuleStates((p) => ({
                                      ...p,
                                      [mod.key]: {
                                        ...p[mod.key],
                                        assignments: p[mod.key].assignments.map((a) =>
                                          a.provider === m.provider && a.model === m.model_id
                                            ? { ...a, priority: n }
                                            : a
                                        ),
                                      },
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  const val = Number.isNaN(n)
                                    ? 1
                                    : Math.max(1, Math.min(100, n));
                                  handlePriorityChange(mod.key, m.provider, m.model_id, val);
                                }}
                                disabled={saving}
                                className="w-6 bg-transparent border-none text-center text-[10px] focus:outline-none p-0"
                                title="1=主模型，2~100=備選"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setSettingsModal({
                                    moduleKey: mod.key,
                                    moduleName: mod.name,
                                    providerId: m.provider,
                                    providerName: prov?.name ?? m.provider,
                                    modelId: m.model_id,
                                    modelName,
                                  })
                                }
                                className="opacity-60 hover:opacity-100 transition-opacity"
                                title="LLM 設定"
                              >
                                <Cog size={9} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssignModel(mod.key, m.provider, m.model_id)
                                }
                                disabled={saving}
                                className="opacity-60 hover:text-red-400 hover:opacity-100 transition-colors"
                                title="移除此模型"
                              >
                                <X size={9} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssignModel(mod.key, m.provider, m.model_id)}
                              disabled={saving || !state.isEnabled}
                              title={state.isEnabled ? '綁定此模型到此模組' : '請先啟用此模組'}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-bg-tertiary text-text-secondary border border-border-subtle hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={10} />
                              綁定
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>已啟用</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
          <span>已停用</span>
        </div>
        <span className="text-text-muted/60">
          · 第一欄為「統一測試設定」中已選的模型；橫列為 7 個功能模組；每格可綁定該模型至該模組，數字 1=主模型、2~100=備選，⚙ 可設定 LLM 參數與 System Prompt
        </span>
      </div>

      {/* ── Model Settings Modal ── */}
      {settingsModal && (
        <ModelSettingsModal
          providerId={settingsModal.providerId}
          providerName={settingsModal.providerName}
          modelId={settingsModal.modelId}
          modelName={settingsModal.modelName}
          moduleName={settingsModal.moduleName}
          settings={
            moduleStates[settingsModal.moduleKey]?.assignments.find(
              (a) =>
                a.provider === settingsModal.providerId && a.model === settingsModal.modelId,
            )?.settings
          }
          customInstructions={moduleConfigs[settingsModal.moduleKey]?.custom_instructions ?? ''}
          prompt={moduleConfigs[settingsModal.moduleKey]?.prompt ?? ''}
          onClose={() => setSettingsModal(null)}
          onSave={(settings: ModelSettings, cfg?: ModuleConfig) =>
            handleModelSettingsSave(
              settingsModal.moduleKey,
              settingsModal.providerId,
              settingsModal.modelId,
              settings,
              cfg,
            )
          }
          onTestModel={onTestModel}
        />
      )}
    </div>
  );
}
