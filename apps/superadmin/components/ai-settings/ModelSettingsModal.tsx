// filepath: apps/superadmin/components/ai-settings/ModelSettingsModal.tsx
// Provider-specific LLM settings modal (各家 SDK 設定模式不同，客製化表單)

'use client';

import React, { useState } from 'react';
import { X, Cog } from 'lucide-react';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import type { ModelSettings } from '@/lib/hooks/useAISettings';
import type { AIProvider } from '@/lib/ai-providers';

export interface ModuleConfig {
  custom_instructions: string;
  prompt: string;
}

interface ModelSettingsModalProps {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  moduleName: string;
  settings: ModelSettings | undefined;
  customInstructions?: string;
  prompt?: string;
  onClose: () => void;
  onSave: (settings: ModelSettings, moduleConfig?: ModuleConfig) => Promise<void>;
  onTestModel?: (provider: string, modelId: string) => Promise<{ success: boolean; message?: string; output?: string }>;
}

const PROVIDER_DOCS: Record<string, { label: string; url: string }> = {
  openai: { label: 'OpenAI API 參數', url: 'https://platform.openai.com/docs/api-reference/chat/create' },
  anthropic: { label: 'Anthropic 參數', url: 'https://docs.anthropic.com/en/api/messages' },
  gemini: { label: 'Gemini 參數', url: 'https://ai.google.dev/api/generate-content' },
  deepseek: { label: 'DeepSeek API', url: 'https://platform.deepseek.com/docs' },
  grok: { label: 'Grok API', url: 'https://docs.x.ai/api' },
  kimi: { label: 'Kimi API', url: 'https://platform.moonshot.cn/docs' },
  openrouter: { label: 'OpenRouter API', url: 'https://openrouter.ai/docs' },
  zhipu: { label: '智谱 API', url: 'https://open.bigmodel.cn/dev/api' },
};

export function ModelSettingsModal({
  providerId,
  providerName,
  modelId,
  modelName,
  moduleName,
  settings,
  customInstructions = '',
  prompt: promptProp = '',
  onClose,
  onSave,
  onTestModel,
}: ModelSettingsModalProps) {
  const [customInstructionsVal, setCustomInstructionsVal] = useState(customInstructions);
  const [promptVal, setPromptVal] = useState(promptProp);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; output?: string } | null>(null);
  const [temperature, setTemperature] = useState(
    typeof settings?.temperature === 'number' ? String(settings.temperature) : '0.7'
  );
  const [maxTokens, setMaxTokens] = useState(
    typeof settings?.max_tokens === 'number' ? String(settings.max_tokens) : '4096'
  );
  const [topP, setTopP] = useState(
    typeof settings?.top_p === 'number' ? String(settings.top_p) : ''
  );
  const [baseUrl, setBaseUrl] = useState(settings?.base_url ?? '');
  const [saving, setSaving] = useState(false);
  const provider = AI_PROVIDERS.find(p => p.id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next: ModelSettings = {
        temperature: parseFloat(temperature) || undefined,
        max_tokens: parseInt(maxTokens, 10) || undefined,
        base_url: baseUrl.trim() || undefined,
      };
      if (topP.trim()) next.top_p = parseFloat(topP);
      const cfg: ModuleConfig = {
        custom_instructions: customInstructionsVal.trim(),
        prompt: promptVal.trim(),
      };
      await onSave(next, cfg);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!onTestModel) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestModel(providerId, modelId);
      setTestResult({ success: res.success, output: res.output });
    } finally {
      setTesting(false);
    }
  };

  const doc = PROVIDER_DOCS[providerId as AIProvider];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-secondary border-b border-border-default px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-bg-tertiary">
              <Cog size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">LLM 設定</h3>
              <p className="text-[10px] text-text-muted">
                {providerName} · {modelName}
                {moduleName && ` · ${moduleName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <p className="text-xs text-text-muted">
            各家 LLM SDK 設定模式不同，此處提供通用參數。呼叫時會依 provider 對應至各 SDK 的專用格式。
          </p>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Temperature (0~2)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full border border-border-default rounded px-3 py-2 bg-bg-primary text-text-primary text-sm"
              placeholder="0.7"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Max tokens</label>
            <input
              type="number"
              min="1"
              max="128000"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="w-full border border-border-default rounded px-3 py-2 bg-bg-primary text-text-primary text-sm"
              placeholder="4096"
            />
          </div>

          {(providerId === 'openai' || providerId === 'deepseek' || providerId === 'grok') && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Top P (0~1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={topP}
                onChange={(e) => setTopP(e.target.value)}
                className="w-full border border-border-default rounded px-3 py-2 bg-bg-primary text-text-primary text-sm"
                placeholder="1 (預設)"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Base URL 覆寫</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full border border-border-default rounded px-3 py-2 bg-bg-primary text-text-primary text-sm font-mono text-xs"
              placeholder={provider?.baseUrl ?? '留空使用預設'}
            />
            <p className="text-[10px] text-text-muted mt-0.5">自建代理或本地部署時可覆寫 API 端點</p>
          </div>

          {doc && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-accent hover:underline"
            >
              {doc.label} →
            </a>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Custom instructions</label>
            <textarea
              value={customInstructionsVal}
              onChange={(e) => setCustomInstructionsVal(e.target.value)}
              placeholder="指導 LLM 的自訂說明..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border-default rounded bg-bg-primary text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Prompt</label>
            <textarea
              value={promptVal}
              onChange={(e) => setPromptVal(e.target.value)}
              placeholder="模組專用 prompt..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border-default rounded bg-bg-primary text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            />
          </div>

          {onTestModel && (
            <div>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-3 py-1.5 text-xs border border-border-default rounded hover:bg-bg-tertiary text-text-secondary disabled:opacity-50"
              >
                {testing ? '測試中...' : '連線測試'}
              </button>
              {testResult && (
                <div className={`mt-2 p-2 rounded text-xs ${testResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  {testResult.success ? testResult.output ?? '連線成功' : '連線失敗'}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary rounded"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
