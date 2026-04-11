'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AgentDef } from '@/lib/ai/agent-registry';
import type {
  AgentAssignment,
  AgentAssignmentPatch,
  AgentFallbackEntry,
  AgentGuardrails,
  AgentModelConfig,
  FallbackTrigger,
} from '@/lib/types/agent-assignment';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AvailableModel {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
}

export interface AgentStrategyFormProps {
  agent: AgentDef;
  /** Current saved row (may be undefined if not yet configured). */
  assignment: AgentAssignment | undefined;
  /** Deduped list of (providerId × modelId) the user can pick from. */
  availableModels: AvailableModel[];
  onSave: (patch: AgentAssignmentPatch) => Promise<void>;
  onReset: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TRIGGER_OPTIONS: Array<{ value: FallbackTrigger; label: string }> = [
  { value: 'rate_limit', label: '超過速率限制' },
  { value: 'error', label: '呼叫錯誤' },
  { value: 'cost_over', label: '超過成本上限' },
];

interface FormState {
  isEnabled: boolean;
  primaryProvider: string;
  primaryModelId: string;
  config: AgentModelConfig;
  fallbacks: AgentFallbackEntry[];
  guardrails: AgentGuardrails;
  notes: string;
}

function assignmentToForm(a: AgentAssignment | undefined): FormState {
  return {
    isEnabled: a?.is_enabled ?? true,
    primaryProvider: a?.primary_provider ?? '',
    primaryModelId: a?.primary_model_id ?? '',
    config: { ...(a?.primary_config ?? {}) },
    fallbacks: (a?.fallbacks ?? []).map((f) => ({ ...f, config: { ...(f.config ?? {}) } })),
    guardrails: { ...(a?.guardrails ?? {}) },
    notes: a?.notes ?? '',
  };
}

/** Build a stable "providerId::modelId" key used for selects. */
function buildModelKey(provider: string, modelId: string): string {
  return `${provider}::${modelId}`;
}

function parseModelKey(key: string): { provider: string; modelId: string } | null {
  const [provider, ...rest] = key.split('::');
  if (!provider || rest.length === 0) return null;
  return { provider, modelId: rest.join('::') };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentStrategyForm({
  agent,
  assignment,
  availableModels,
  onSave,
  onReset,
}: AgentStrategyFormProps) {
  const [form, setForm] = useState<FormState>(() => assignmentToForm(assignment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Reload form whenever the selected agent or its assignment changes.
  useEffect(() => {
    setForm(assignmentToForm(assignment));
    setDirty(false);
    setError(null);
  }, [agent.key, assignment]);

  // Group models by provider for the dropdown.
  const modelsByProvider = useMemo(() => {
    const map = new Map<string, AvailableModel[]>();
    for (const m of availableModels) {
      const arr = map.get(m.providerId) ?? [];
      arr.push(m);
      map.set(m.providerId, arr);
    }
    return map;
  }, [availableModels]);

  const markDirty = () => setDirty(true);

  const updatePrimaryFromKey = (key: string) => {
    const parsed = parseModelKey(key);
    if (!parsed) return;
    setForm((f) => ({ ...f, primaryProvider: parsed.provider, primaryModelId: parsed.modelId }));
    markDirty();
  };

  const updateFallback = (index: number, patch: Partial<AgentFallbackEntry>) => {
    setForm((f) => {
      const next = f.fallbacks.slice();
      next[index] = { ...next[index], ...patch };
      return { ...f, fallbacks: next };
    });
    markDirty();
  };

  const addFallback = () => {
    const first = availableModels[0];
    if (!first) return;
    setForm((f) => ({
      ...f,
      fallbacks: [
        ...f.fallbacks,
        { provider: first.providerId, model_id: first.modelId, trigger: 'error', config: {} },
      ],
    }));
    markDirty();
  };

  const removeFallback = (index: number) => {
    setForm((f) => ({ ...f, fallbacks: f.fallbacks.filter((_, i) => i !== index) }));
    markDirty();
  };

  const handleSave = async () => {
    if (!form.primaryProvider || !form.primaryModelId) {
      setError('請先選擇 Primary 模型');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        agent_key: agent.key,
        is_enabled: form.isEnabled,
        primary_provider: form.primaryProvider,
        primary_model_id: form.primaryModelId,
        primary_config: form.config,
        fallbacks: form.fallbacks,
        guardrails: form.guardrails,
        notes: form.notes || null,
      });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        `確定要將「${agent.label}」還原為系統預設值嗎？\n目前的 Primary / Fallbacks / Guardrails 會被預設值覆蓋。`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onReset();
    } catch (e) {
      setError(e instanceof Error ? e.message : '還原失敗');
    } finally {
      setSaving(false);
    }
  };

  const primarySelectValue =
    form.primaryProvider && form.primaryModelId
      ? buildModelKey(form.primaryProvider, form.primaryModelId)
      : '';

  return (
    <div
      className="flex flex-col gap-4 p-4 border border-border-default rounded-base bg-bg-secondary"
      data-testid="agent-strategy-form"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <agent.icon size={18} className="text-emerald-600" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">{agent.label}</span>
          <span className="text-[11px] text-text-muted">{agent.description}</span>
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(e) => {
              setForm((f) => ({ ...f, isEnabled: e.target.checked }));
              markDirty();
            }}
          />
          啟用
        </label>
      </div>

      {/* Primary model */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-text-primary">Primary 模型</legend>
        <select
          aria-label="primary-model"
          value={primarySelectValue}
          onChange={(e) => updatePrimaryFromKey(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-bg-primary border border-border-default rounded"
        >
          <option value="">— 請選擇 —</option>
          {Array.from(modelsByProvider.entries()).map(([providerId, models]) => (
            <optgroup key={providerId} label={models[0]?.providerName ?? providerId}>
              {models.map((m) => (
                <option key={m.modelId} value={buildModelKey(providerId, m.modelId)}>
                  {m.modelName || m.modelId}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-text-muted">
            temperature
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={form.config.temperature ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setForm((f) => ({ ...f, config: { ...f.config, temperature: v } }));
                markDirty();
              }}
              className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-text-muted">
            max_tokens
            <input
              type="number"
              step="64"
              min="1"
              value={form.config.max_tokens ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setForm((f) => ({ ...f, config: { ...f.config, max_tokens: v } }));
                markDirty();
              }}
              className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-text-muted">
            top_p
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={form.config.top_p ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                setForm((f) => ({ ...f, config: { ...f.config, top_p: v } }));
                markDirty();
              }}
              className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
            />
          </label>
        </div>
      </fieldset>

      {/* Fallbacks */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-text-primary">
          Fallbacks（依序嘗試）
        </legend>
        {form.fallbacks.length === 0 && (
          <p className="text-[11px] text-text-muted italic">尚未設定 fallback。</p>
        )}
        {form.fallbacks.map((fb, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            data-testid={`fallback-row-${i}`}
          >
            <span className="text-[11px] text-text-muted w-4">{i + 1}.</span>
            <select
              aria-label={`fallback-${i}-model`}
              value={buildModelKey(fb.provider, fb.model_id)}
              onChange={(e) => {
                const parsed = parseModelKey(e.target.value);
                if (parsed) {
                  updateFallback(i, { provider: parsed.provider, model_id: parsed.modelId });
                }
              }}
              className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
            >
              {Array.from(modelsByProvider.entries()).map(([providerId, models]) => (
                <optgroup key={providerId} label={models[0]?.providerName ?? providerId}>
                  {models.map((m) => (
                    <option key={m.modelId} value={buildModelKey(providerId, m.modelId)}>
                      {m.modelName || m.modelId}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              aria-label={`fallback-${i}-trigger`}
              value={fb.trigger}
              onChange={(e) => updateFallback(i, { trigger: e.target.value as FallbackTrigger })}
              className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`remove-fallback-${i}`}
              onClick={() => removeFallback(i)}
              className="p-1 text-text-muted hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addFallback}
          disabled={availableModels.length === 0}
          className="self-start flex items-center gap-1 text-xs text-accent hover:underline disabled:text-text-muted disabled:no-underline"
        >
          <Plus size={12} /> 新增 fallback
        </button>
      </fieldset>

      {/* Guardrails */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-text-primary">Guardrails</legend>
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          月上限 USD
          <input
            type="number"
            step="1"
            min="0"
            value={form.guardrails.max_monthly_usd ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : Number(e.target.value);
              setForm((f) => ({ ...f, guardrails: { ...f.guardrails, max_monthly_usd: v } }));
              markDirty();
            }}
            className="w-24 px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
          />
        </label>
      </fieldset>

      {/* Notes */}
      <label className="flex flex-col gap-1 text-[11px] text-text-muted">
        備註
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => {
            setForm((f) => ({ ...f, notes: e.target.value }));
            markDirty();
          }}
          className="px-2 py-1 text-xs bg-bg-primary border border-border-default rounded"
        />
      </label>

      {/* Actions + error */}
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          disabled={!dirty || saving}
          leftIcon={saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        >
          儲存
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={saving}
          leftIcon={<RotateCcw size={12} />}
          title="還原為系統預設值 (Primary + 3 Fallbacks + 月上限 $5 USD)"
        >
          還原為預設
        </Button>
        {dirty && !saving && (
          <span className="text-[11px] text-amber-500">尚未儲存</span>
        )}
      </div>
    </div>
  );
}
