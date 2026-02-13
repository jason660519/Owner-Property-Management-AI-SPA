// filepath: apps/superadmin/components/ai-settings/ModelSelector.tsx
// Component for selecting AI models per provider (multi-select with redundancy)

'use client';

import React, { useState, useMemo } from 'react';
import { Check, Star, Info, Zap, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, type AIProvider, type AIModelInfo, formatContextWindow, formatPrice } from '@/lib/ai-providers';
import type { SavedKey, SavedModel } from '@/lib/hooks/useAISettings';

interface ModelSelectorProps {
  savedKeys: SavedKey[];
  savedModels: SavedModel[];
  onSave: (provider: AIProvider, selections: { modelId: string; modelName: string; isPrimary: boolean }[]) => Promise<void>;
}

interface ProviderModelCardProps {
  provider: typeof AI_PROVIDERS[number];
  hasKey: boolean;
  selectedModels: SavedModel[];
  onSave: (provider: AIProvider, selections: { modelId: string; modelName: string; isPrimary: boolean }[]) => Promise<void>;
}

function ProviderModelCard({ provider, hasKey, selectedModels, onSave }: ProviderModelCardProps) {
  const [localSelections, setLocalSelections] = useState<Set<string>>(
    new Set(selectedModels.map(m => m.model_id))
  );
  const [primaryModel, setPrimaryModel] = useState<string | null>(
    selectedModels.find(m => m.is_primary)?.model_id || null
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleModel = (modelId: string) => {
    setLocalSelections(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
        if (primaryModel === modelId) setPrimaryModel(null);
      } else {
        next.add(modelId);
        if (!primaryModel) setPrimaryModel(modelId);
      }
      return next;
    });
    setHasChanges(true);
  };

  const setPrimary = (modelId: string) => {
    if (!localSelections.has(modelId)) {
      setLocalSelections(prev => new Set([...prev, modelId]));
    }
    setPrimaryModel(modelId);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selections = provider.models
        .filter(m => localSelections.has(m.id))
        .map(m => ({
          modelId: m.id,
          modelName: m.name,
          isPrimary: m.id === primaryModel,
        }));
      await onSave(provider.id, selections);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="border border-border-default rounded-base p-4 opacity-50">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-sm font-semibold text-text-primary">{provider.name}</h4>
          <span className="text-[10px] text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">需要先設定 API 金鑰</span>
        </div>
        <p className="text-xs text-text-muted">請先在「API 金鑰管理」區塊設定 {provider.envKey}</p>
      </div>
    );
  }

  return (
    <div className="border border-border-default rounded-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text-primary">{provider.name}</h4>
          <span className="text-[10px] text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
            已選 {localSelections.size} / {provider.models.length}
          </span>
        </div>
        {hasChanges && (
          <Button size="sm" variant="primary" onClick={handleSave} isLoading={saving}>
            儲存選擇
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {provider.models.map(model => {
          const isSelected = localSelections.has(model.id);
          const isPrimary = primaryModel === model.id;

          return (
            <div
              key={model.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'border-accent/40 bg-accent-subtle'
                  : 'border-transparent hover:bg-bg-tertiary'
              }`}
              onClick={() => toggleModel(model.id)}
            >
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected ? 'bg-accent text-white' : 'border border-border-default'
              }`}>
                {isSelected && <Check size={12} />}
              </div>

              {/* Model Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{model.name}</span>
                  {model.recommended && (
                    <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">推薦</span>
                  )}
                  {isPrimary && (
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                      <Star size={8} /> 主要
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={10} />
                    {formatContextWindow(model.contextWindow)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={10} />
                    {formatPrice(model.inputPrice)}/{formatPrice(model.outputPrice)} per 1M
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={10} />
                    {model.capabilities.join(', ')}
                  </span>
                </div>
              </div>

              {/* Set as primary */}
              {isSelected && !isPrimary && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPrimary(model.id); }}
                  className="text-[10px] text-text-muted hover:text-yellow-400 px-2 py-1 rounded hover:bg-yellow-500/10 transition-colors"
                  title="設為主要模型"
                >
                  <Star size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModelSelector({ savedKeys, savedModels, onSave }: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      {AI_PROVIDERS.map(provider => {
        const hasKey = savedKeys.some(k => k.provider === provider.id);
        const providerModels = savedModels.filter(m => m.provider === provider.id);
        return (
          <ProviderModelCard
            key={provider.id}
            provider={provider}
            hasKey={hasKey}
            selectedModels={providerModels}
            onSave={onSave}
          />
        );
      })}
    </div>
  );
}
