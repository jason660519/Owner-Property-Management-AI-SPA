// filepath: apps/superadmin/components/ai-settings/FeatureModuleSelector.tsx
// Component for selecting and configuring AI feature modules

'use client';

import React, { useState } from 'react';
import {
  Cloud, HardDrive, MessageCircle, FileText, PenTool, Layout,
  ChevronDown, ChevronUp, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FEATURE_MODULES, AI_PROVIDERS, type FeatureModule, type AIProvider } from '@/lib/ai-providers';
import type { SavedModule, SavedKey, SavedModel } from '@/lib/hooks/useAISettings';

interface FeatureModuleSelectorProps {
  savedModules: SavedModule[];
  savedKeys: SavedKey[];
  savedModels: SavedModel[];
  onSave: (
    moduleKey: string,
    isEnabled: boolean,
    assignedProvider?: string,
    assignedModel?: string,
    config?: Record<string, unknown>
  ) => Promise<void>;
}

const iconMap: Record<string, React.ElementType> = {
  cloud: Cloud,
  'hard-drive': HardDrive,
  'message-circle': MessageCircle,
  'file-text': FileText,
  'pen-tool': PenTool,
  layout: Layout,
};

const categoryLabels: Record<string, string> = {
  ocr: 'OCR 文件辨識',
  assistant: 'AI 助理',
  generator: '內容生成',
};

const categoryColors: Record<string, string> = {
  ocr: 'text-blue-400 bg-blue-500/10',
  assistant: 'text-green-400 bg-green-500/10',
  generator: 'text-purple-400 bg-purple-500/10',
};

interface ModuleCardProps {
  module: FeatureModule;
  saved?: SavedModule;
  availableProviders: { id: string; name: string; models: { id: string; name: string }[] }[];
  onSave: FeatureModuleSelectorProps['onSave'];
}

function ModuleCard({ module, saved, availableProviders, onSave }: ModuleCardProps) {
  const [isEnabled, setIsEnabled] = useState(saved?.is_enabled ?? false);
  const [provider, setProvider] = useState(saved?.assigned_provider || '');
  const [model, setModel] = useState(saved?.assigned_model || '');
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const Icon = iconMap[module.icon] || Settings2;

  const selectedProviderModels = availableProviders.find(p => p.id === provider)?.models || [];

  const handleToggle = async () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    setSaving(true);
    try {
      await onSave(module.key, newEnabled, provider || undefined, model || undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await onSave(module.key, isEnabled, provider || undefined, model || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`border rounded-base transition-all ${
      isEnabled ? 'border-accent/30 bg-accent-subtle/30' : 'border-border-default'
    }`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColors[module.category]}`}>
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">{module.name}</h4>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[module.category]}`}>
              {categoryLabels[module.category]}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{module.description}</p>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            isEnabled ? 'bg-accent' : 'bg-bg-tertiary border border-border-default'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            isEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`} />
        </button>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Config */}
      {expanded && (
        <div className="border-t border-border-default px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Provider Select */}
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">指定 AI 提供商</label>
              <select
                value={provider}
                onChange={(e) => { setProvider(e.target.value); setModel(''); }}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">自動選擇</option>
                {availableProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Model Select */}
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">指定模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!provider}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              >
                <option value="">自動選擇</option>
                {selectedProviderModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Required capabilities */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">需要能力：</span>
            {module.requiredCapabilities.map(cap => (
              <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
                {cap}
              </span>
            ))}
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={handleSaveConfig} isLoading={saving}>
              儲存設定
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeatureModuleSelector({ savedModules, savedKeys, savedModels, onSave }: FeatureModuleSelectorProps) {
  // Build available providers with their selected models
  const availableProviders = AI_PROVIDERS
    .filter(p => savedKeys.some(k => k.provider === p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      models: savedModels
        .filter(m => m.provider === p.id)
        .map(m => ({ id: m.model_id, name: m.model_name })),
    }));

  // Group modules by category
  const grouped = FEATURE_MODULES.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, FeatureModule[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, modules]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {categoryLabels[category]}
          </h4>
          <div className="space-y-2">
            {modules.map(mod => (
              <ModuleCard
                key={mod.key}
                module={mod}
                saved={savedModules.find(s => s.module_key === mod.key)}
                availableProviders={availableProviders}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
