// filepath: apps/superadmin/components/ai-settings/FeatureModuleSelector.tsx
// Excel-style matrix for mapping AI models to feature modules

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud, HardDrive, MessageCircle, FileText, PenTool, Layout, Settings2, Check, Plus, Minus, Cog,
} from 'lucide-react';
import { FEATURE_MODULES, AI_PROVIDERS } from '@/lib/ai-providers';
import type { FeatureModule } from '@/lib/ai-providers';
import type { SavedModule, SavedKey, SavedModel, AssignedModel, ModelSettings } from '@/lib/hooks/useAISettings';
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
  onTestModel?: (provider: string, modelId: string) => Promise<{ success: boolean; message?: string; output?: string }>;
}

const iconMap: Record<string, React.ElementType> = {
  cloud: Cloud,
  'hard-drive': HardDrive,
  'message-circle': MessageCircle,
  'file-text': FileText,
  'pen-tool': PenTool,
  layout: Layout,
};

const categoryColors: Record<string, { text: string; bg: string }> = {
  ocr:       { text: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  assistant: { text: 'text-green-400',  bg: 'bg-green-500/10'  },
  generator: { text: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const categoryLabels: Record<string, string> = {
  ocr: 'OCR',
  assistant: '助理',
  generator: '生成',
};

const providerBadgeColors: Record<string, string> = {
  openai:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  anthropic: 'bg-orange-500/15  text-orange-400  border border-orange-500/20',
  gemini:    'bg-blue-500/15    text-blue-400    border border-blue-500/20',
  deepseek:  'bg-cyan-500/15    text-cyan-400    border border-cyan-500/20',
  grok:      'bg-rose-500/15    text-rose-400    border border-rose-500/20',
};

interface ModuleState {
  isEnabled: boolean;
  assignments: AssignedModel[];
}

export function FeatureModuleSelector({ savedModules, savedKeys, savedModels, onSave, onTestModel }: FeatureModuleSelectorProps) {
  // Displayed columns (can add/remove); init from FEATURE_MODULES
  const [displayedModules, setDisplayedModules] = useState<FeatureModule[]>(() => [...FEATURE_MODULES]);
  const [addMenuAt, setAddMenuAt] = useState<number | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addMenuAt === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuAt(null);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [addMenuAt]);

  // Build providers that have both a saved key AND at least one selected model
  const availableProviders = AI_PROVIDERS
    .filter(p => savedKeys.some(k => k.provider === p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      models: savedModels
        .filter(m => m.provider === p.id)
        .map(m => ({ id: m.model_id, name: m.model_name })),
    }))
    .filter(p => p.models.length > 0);

  // Per-module state (isEnabled + multi model assignments)
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>(() => {
    const init: Record<string, ModuleState> = {};
    for (const mod of [...FEATURE_MODULES]) {
      const saved = savedModules.find(s => s.module_key === mod.key);
      const assignments = saved?.assigned_models ?? [];
      init[mod.key] = {
        isEnabled: saved?.is_enabled ?? false,
        assignments: Array.isArray(assignments) ? [...assignments] : [],
      };
    }
    return init;
  });

  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());
  const [settingsModal, setSettingsModal] = useState<{
    moduleKey: string;
    moduleName: string;
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  } | null>(null);

  // Per-module config: custom instructions & prompt for guiding LLM
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfig>>(() => {
    const init: Record<string, ModuleConfig> = {};
    for (const mod of FEATURE_MODULES) {
      const saved = savedModules.find(s => s.module_key === mod.key);
      const c = (saved?.config ?? {}) as Partial<ModuleConfig>;
      init[mod.key] = {
        custom_instructions: typeof c.custom_instructions === 'string' ? c.custom_instructions : '',
        prompt: typeof c.prompt === 'string' ? c.prompt : '',
      };
    }
    return init;
  });

  const markSaving = (key: string, on: boolean) =>
    setSavingSet(prev => {
      const next = new Set(prev);
      on ? next.add(key) : next.delete(key);
      return next;
    });

  const availableToAdd = FEATURE_MODULES.filter(m => !displayedModules.some(d => d.key === m.key));

  const handleAddColumnLeft = (insertBeforeIndex: number, mod: FeatureModule) => {
    setDisplayedModules(prev => {
      const next = [...prev];
      next.splice(insertBeforeIndex, 0, mod);
      return next;
    });
    const saved = savedModules.find(s => s.module_key === mod.key);
    setModuleStates(p => ({
      ...p,
      [mod.key]: { isEnabled: saved?.is_enabled ?? false, assignments: saved?.assigned_models ?? [] },
    }));
    const c = (saved?.config ?? {}) as Partial<ModuleConfig>;
    setModuleConfigs(p => ({
      ...p,
      [mod.key]: {
        custom_instructions: typeof c.custom_instructions === 'string' ? c.custom_instructions : '',
        prompt: typeof c.prompt === 'string' ? c.prompt : '',
      },
    }));
    setAddMenuAt(null);
  };

  const handleRemoveColumn = (mod: FeatureModule) => {
    if (displayedModules.length <= 1) return;
    setDisplayedModules(prev => prev.filter(m => m.key !== mod.key));
  };

  const getNextPriority = (assignments: AssignedModel[]) => {
    if (assignments.length === 0) return 1;
    const max = Math.max(...assignments.map(a => a.priority ?? 0), 0);
    return Math.min(max + 1, 100);
  };

  // Toggle model assignment for a module (add or remove)
  const handleCellClick = async (moduleKey: string, providerId: string, modelId: string) => {
    const cur = moduleStates[moduleKey];
    const exists = cur.assignments.some(a => a.provider === providerId && a.model === modelId);
    const next = exists
      ? cur.assignments.filter(a => !(a.provider === providerId && a.model === modelId))
      : [...cur.assignments, { provider: providerId, model: modelId, priority: getNextPriority(cur.assignments) }];
    setModuleStates(p => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markSaving(moduleKey, true);
    try {
      await onSave(moduleKey, cur.isEnabled, next);
    } finally {
      markSaving(moduleKey, false);
    }
  };

  const handleModelSettingsSave = async (
    moduleKey: string,
    providerId: string,
    modelId: string,
    newSettings: ModelSettings,
    moduleConfig?: ModuleConfig
  ) => {
    const cur = moduleStates[moduleKey];
    const exists = cur.assignments.some(a => a.provider === providerId && a.model === modelId);
    const next = exists
      ? cur.assignments.map(a =>
          a.provider === providerId && a.model === modelId ? { ...a, settings: newSettings } : a
        )
      : [...cur.assignments, { provider: providerId, model: modelId, priority: getNextPriority(cur.assignments), settings: newSettings }];
    setModuleStates(p => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    if (moduleConfig) setModuleConfigs(p => ({ ...p, [moduleKey]: moduleConfig }));
    markSaving(moduleKey, true);
    try {
      const cfg = moduleConfig ?? moduleConfigs[moduleKey];
      await onSave(moduleKey, cur.isEnabled, next, cfg ? { custom_instructions: cfg.custom_instructions, prompt: cfg.prompt } : undefined);
    } finally {
      markSaving(moduleKey, false);
    }
  };

  const handlePriorityChange = async (moduleKey: string, providerId: string, modelId: string, newPriority: number) => {
    const cur = moduleStates[moduleKey];
    const num = Math.max(1, Math.min(100, Math.round(newPriority)));
    const next = cur.assignments.map(a =>
      a.provider === providerId && a.model === modelId ? { ...a, priority: num } : a
    );
    setModuleStates(p => ({ ...p, [moduleKey]: { ...p[moduleKey], assignments: next } }));
    markSaving(moduleKey, true);
    try {
      await onSave(moduleKey, cur.isEnabled, next);
    } finally {
      markSaving(moduleKey, false);
    }
  };

  // Empty state
  if (availableProviders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <Settings2 size={32} className="mb-3 opacity-40" />
        <p className="text-sm font-medium text-text-secondary">尚未設定 API 金鑰或選擇模型</p>
        <p className="text-xs mt-1">請先在「API 金鑰管理」頁籤設定金鑰，並完成模型選擇</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Scrollable table ── */}
      <div className="overflow-x-auto rounded-base border border-border-default">
        <table
          className="w-full border-collapse text-xs"
          style={{ minWidth: `${176 + displayedModules.length * 100}px` }}
        >
          {/* ── Column headers (module row) ── */}
          <thead>
            <tr className="border-b-2 border-border-default bg-bg-tertiary/60">
              {/* Corner cell */}
              <th className="sticky left-0 z-20 bg-bg-tertiary px-3 py-3 text-left w-44 min-w-[11rem] border-r border-border-default">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  提供商 / 模型
                </span>
              </th>

              {displayedModules.map((mod, colIdx) => {
                const Icon   = iconMap[mod.icon] ?? Settings2;
                const colors = categoryColors[mod.category];
                const canAdd  = availableToAdd.length > 0;
                const canRemove = displayedModules.length > 1;
                const showAddMenu = addMenuAt === colIdx;

                return (
                  <th
                    key={mod.key}
                    className="relative px-2 py-2.5 text-center min-w-[6.25rem] w-[6.25rem] border-r border-border-subtle last:border-r-0 bg-bg-tertiary/60"
                  >
                    {/* Top-left + box */}
                    {canAdd && (
                      <div ref={colIdx === addMenuAt ? addMenuRef : undefined} className="absolute -top-1 -left-1 z-10">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAddMenuAt(showAddMenu ? null : colIdx); }}
                          className="w-4 h-4 rounded border border-border-default bg-bg-primary flex items-center justify-center text-[10px] font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent transition-colors"
                          title="往左增加一功能欄位"
                        >
                          <Plus size={10} strokeWidth={2.5} />
                        </button>
                        {showAddMenu && (
                          <div className="absolute left-0 top-0 z-20 mt-5 w-36 rounded border border-border-default bg-bg-primary shadow-lg py-1">
                            {availableToAdd.map(m => (
                              <button
                                key={m.key}
                                type="button"
                                onClick={() => handleAddColumnLeft(colIdx, m)}
                                className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-bg-tertiary text-text-primary"
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Top-right - box */}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(mod)}
                        className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded border border-border-default bg-bg-primary flex items-center justify-center text-[10px] font-bold text-text-secondary hover:bg-red-500/20 hover:text-red-500 transition-colors"
                        title="刪除此欄位"
                      >
                        <Minus size={10} strokeWidth={2.5} />
                      </button>
                    )}
                    <div className="flex flex-col items-center gap-1">
                      {/* Category badge */}
                      <span className={`text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {categoryLabels[mod.category]}
                      </span>

                      {/* Icon */}
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colors.bg}`}>
                        <Icon size={13} className={colors.text} />
                      </div>

                      {/* Module name */}
                      <span
                        className="text-[10px] font-medium text-text-primary leading-tight text-center line-clamp-2 max-w-[5.5rem]"
                        title={mod.name}
                      >
                        {mod.name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body: one group per provider ── */}
          <tbody>
            {availableProviders.map((provider, pIdx) => (
              <React.Fragment key={provider.id}>
                {/* Provider group header row */}
                <tr className={`border-b border-border-default ${pIdx > 0 ? 'border-t-2 border-border-default' : ''}`}>
                  <td
                    colSpan={displayedModules.length + 1}
                    className="sticky left-0 px-3 py-1.5 bg-bg-secondary/90"
                  >
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${providerBadgeColors[provider.id] ?? 'bg-bg-tertiary text-text-muted'}`}>
                      {provider.name}
                    </span>
                    <span className="ml-2 text-[10px] text-text-muted">
                      {provider.models.length} 個模型
                    </span>
                  </td>
                </tr>

                {/* Model rows */}
                {provider.models.map((model, mIdx) => (
                  <tr
                    key={model.id}
                    className={[
                      'hover:bg-bg-tertiary/20 transition-colors',
                      mIdx < provider.models.length - 1 ? 'border-b border-border-subtle/40' : '',
                    ].join(' ')}
                  >
                    {/* Model name (sticky) */}
                    <td className="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5 border-r border-border-default">
                      <span
                        className="text-text-secondary font-medium text-[11px] block truncate max-w-[9.5rem]"
                        title={model.name}
                      >
                        {model.name}
                      </span>
                    </td>

                    {/* Module cells */}
                    {displayedModules.map(mod => {
                      const state      = moduleStates[mod.key];
                      const assignment = state?.assignments.find(
                        a => a.provider === provider.id && a.model === model.id
                      );
                      const isSelected = !!assignment;
                      const saving     = savingSet.has(mod.key);
                      const priority   = assignment?.priority ?? 1;

                      return (
                        <td
                          key={mod.key}
                          className="px-2 py-2.5 text-center border-r border-border-subtle/30 last:border-r-0"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCellClick(mod.key, provider.id, model.id)}
                              disabled={saving}
                              title={
                                isSelected
                                  ? `取消「${mod.name}」使用 ${model.name}`
                                  : `設定「${mod.name}」使用 ${model.name}`
                              }
                              className={[
                                'w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-all duration-150',
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30 hover:bg-emerald-500/90'
                                  : 'border-border-default bg-transparent hover:border-emerald-500/60 hover:bg-emerald-500/5',
                                saving ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                              ].join(' ')}
                            >
                              {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                            </button>
                            {isSelected && (
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={priority}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const n = parseInt(v, 10);
                                  if (!Number.isNaN(n) && n >= 1 && n <= 100) {
                                    setModuleStates(p => ({
                                      ...p,
                                      [mod.key]: {
                                        ...p[mod.key],
                                        assignments: p[mod.key].assignments.map(a =>
                                          a.provider === provider.id && a.model === model.id
                                            ? { ...a, priority: n }
                                            : a
                                        ),
                                      },
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  const val = Number.isNaN(n) ? 1 : Math.max(1, Math.min(100, n));
                                  handlePriorityChange(mod.key, provider.id, model.id, val);
                                }}
                                disabled={saving}
                                className="w-9 h-5 px-0.5 text-center text-[10px] rounded border border-border-default bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                title="1=主模型，2~100=備選順序"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setSettingsModal({
                                  moduleKey: mod.key,
                                  moduleName: mod.name,
                                  providerId: provider.id,
                                  providerName: provider.name,
                                  modelId: model.id,
                                  modelName: model.name,
                                })
                              }
                              title={`${provider.name} ${model.name} 的 LLM 設定`}
                              className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-border-default bg-bg-primary text-text-secondary hover:bg-bg-tertiary hover:text-accent transition-colors"
                            >
                              <Cog size={10} />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Settings Modal */}
      {settingsModal && (
        <ModelSettingsModal
          providerId={settingsModal.providerId}
          providerName={settingsModal.providerName}
          modelId={settingsModal.modelId}
          modelName={settingsModal.modelName}
          moduleName={settingsModal.moduleName}
          settings={
            moduleStates[settingsModal.moduleKey]?.assignments.find(
              a => a.provider === settingsModal.providerId && a.model === settingsModal.modelId
            )?.settings
          }
          customInstructions={moduleConfigs[settingsModal.moduleKey]?.custom_instructions ?? ''}
          prompt={moduleConfigs[settingsModal.moduleKey]?.prompt ?? ''}
          onClose={() => setSettingsModal(null)}
          onSave={(settings: ModelSettings, cfg?: ModuleConfig) =>
            handleModelSettingsSave(settingsModal.moduleKey, settingsModal.providerId, settingsModal.modelId, settings, cfg)
          }
          onTestModel={onTestModel}
        />
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check size={10} className="text-white stroke-[3]" />
          </div>
          <span>已選用</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded border-2 border-border-default flex-shrink-0" />
          <span>取消選用</span>
        </div>
        <span className="text-text-muted/60">· 每個模組可複選多個模型；數字 1=主模型，2~100=備選順序；齒輪可設定 LLM 參數</span>
      </div>
    </div>
  );
}
