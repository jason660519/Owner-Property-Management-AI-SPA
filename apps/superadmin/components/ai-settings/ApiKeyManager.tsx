// filepath: apps/superadmin/components/ai-settings/ApiKeyManager.tsx
// Component for managing AI API keys with encryption, masking, and validation

'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Shield, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, type AIProvider, type AIProviderInfo } from '@/lib/ai-providers';
import { maskApiKey } from '@/lib/crypto';
import type { SavedKey, KeyValidationResult } from '@/lib/hooks/useAISettings';

interface ApiKeyManagerProps {
  savedKeys: SavedKey[];
  onSave: (provider: AIProvider, rawKey: string) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onValidate: (provider: AIProvider, apiKey: string, keyId?: string) => Promise<KeyValidationResult>;
}

interface ProviderKeyRowProps {
  provider: AIProviderInfo;
  savedKey?: SavedKey;
  onSave: (provider: AIProvider, rawKey: string) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onValidate: (provider: AIProvider, apiKey: string, keyId?: string) => Promise<KeyValidationResult>;
}

function ProviderKeyRow({ provider, savedKey, onSave, onDelete, onValidate }: ProviderKeyRowProps) {
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<KeyValidationResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!savedKey);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Auto-fetch available models for already-validated keys (using stored key in DB)
  useEffect(() => {
    const shouldAutoValidate =
      !!savedKey &&
      savedKey.is_valid === true &&
      !isEditing &&
      !validationResult &&
      !validating;

    if (!shouldAutoValidate) return;

    let cancelled = false;

    (async () => {
      try {
        setValidating(true);
        const result = await onValidate(provider.id, '', savedKey.id);
        if (cancelled) return;
        if (result.valid) {
          setValidationResult(result);
          if (Array.isArray(result.availableModels)) {
            setSelectedModels(result.availableModels);
          }
        } else {
          setValidationResult(result);
        }
      } catch {
        if (!cancelled) {
          setValidationResult({ valid: false, message: '驗證請求失敗' });
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [savedKey, isEditing, validationResult, validating, onValidate, provider.id]);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setSaving(true);
    setSaveSuccess(null);
    try {
      await onSave(provider.id, inputValue.trim());
      setInputValue('');
      setIsEditing(false);
      setValidationResult(null);
      setSaveSuccess('已在Supabase儲存成功');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    const keyToValidate = inputValue.trim();
    // Allow validation if we have input OR if we have a saved key (and no input, meaning validate stored)
    if (!keyToValidate && !savedKey) return;

    setValidating(true);
    setValidationResult(null);
    try {
      const result = await onValidate(provider.id, keyToValidate, savedKey?.id);
      setValidationResult(result);
      if (!result.valid) {
        setSelectedModels([]);
      }
    } catch {
      setValidationResult({ valid: false, message: '驗證請求失敗' });
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async () => {
    if (!savedKey) return;
    if (!confirm(`確定要刪除 ${provider.name} 的 API 金鑰嗎？`)) return;
    await onDelete(savedKey.id);
    setIsEditing(true);
  };

  const providerColors: Record<string, string> = {
    openai: '#10A37F',
    anthropic: '#D4A574',
    gemini: '#4285F4',
    deepseek: '#4D6BFE',
    grok: '#FFFFFF',
  };

  return (
    <div
      className="border border-border-default rounded-base p-4 hover:border-accent/30 transition-all"
      data-testid={`provider-card-${provider.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${providerColors[provider.id]}20`, color: providerColors[provider.id] }}
          >
            {provider.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{provider.name}</h4>
            <p className="text-xs text-text-muted">
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline hover:text-accent transition-colors"
                title={`${provider.name} API Key 設定頁面`}
              >
                {provider.envKey}
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-green-500 font-medium animate-pulse">
              {saveSuccess}
            </span>
          )}
          {savedKey && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${savedKey.is_valid === true
              ? 'bg-green-500/20 text-green-400'
              : savedKey.is_valid === false
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>
              {savedKey.is_valid === true ? <Check size={10} /> : savedKey.is_valid === false ? <X size={10} /> : <Shield size={10} />}
              {savedKey.is_valid === true ? '已驗證' : savedKey.is_valid === false ? '無效' : '待驗證'}
            </span>
          )}
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors"
            title="查看官方文件"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Key Display / Input */}
      {savedKey && !isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-bg-tertiary rounded-base text-sm text-text-secondary font-mono">
              {maskApiKey(`${provider.keyPrefix}${'x'.repeat(40)}`)}
            </div>
            <Button variant="secondary" size="sm" onClick={handleValidate} disabled={validating} isLoading={validating}>
              驗證金鑰
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setInputValue(savedKey.decryptedKey || '');
              setIsEditing(true);
            }}>
              更換
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 size={14} />
            </Button>
          </div>

          {/* Validation Result for Stored Key */}
          {validationResult && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-base text-xs ${validationResult.valid
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
              {validationResult.valid ? <Check size={12} /> : <X size={12} />}
              <span className="font-medium">{validationResult.message}</span>
              {validationResult.modelInfo && (
                <span className="ml-1 px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default">
                  {validationResult.modelInfo}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setValidationResult(null); }}
              placeholder={`輸入 ${provider.envKey}...`}
              className="w-full px-3 py-2 pr-10 bg-bg-secondary border border-border-default rounded-base text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-base text-xs ${validationResult.valid
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
              {validationResult.valid ? <Check size={12} /> : <X size={12} />}
              <span className="font-medium">{validationResult.message}</span>
              {validationResult.modelInfo && (
                <span className="ml-1 px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default">
                  {validationResult.modelInfo}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={!inputValue.trim() || saving}
              isLoading={saving}
            >
              <Shield size={14} />
              加密儲存
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleValidate}
              disabled={!inputValue.trim() || validating}
              isLoading={validating}
            >
              驗證金鑰
            </Button>
            {savedKey && (
              <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setInputValue(''); }}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* SDK Info */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-text-muted">
        <span>SDK: <code className="text-text-secondary">{provider.sdkPackage}</code></span>
        <span>Base URL: <code className="text-text-secondary">{provider.baseUrl}</code></span>
      </div>

      {/* Available Models (after successful validation) */}
      {validationResult?.valid && (
        <div className="mt-2 space-y-1 text-[11px] text-text-muted">
          {(!validationResult.availableModels || validationResult.availableModels.length === 0) ? (
            <div className="flex items-center gap-2 p-2 rounded-base bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20">
              <span className="shrink-0">⚠️ 雖然驗證成功，但未取得可用模型列表。可能是權限不足或 API 回應格式不符。</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="shrink-0">Available models:</span>
                {selectedModels.length > 0 && (
                  <span className="rounded-full border border-border-subtle bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-secondary">
                    已選 {selectedModels.length} 個
                  </span>
                )}
              </div>
              <div
                className="max-h-32 overflow-y-auto rounded-base border border-border-subtle bg-bg-primary/40 px-2 py-1 scrollbar-thin scrollbar-thumb-border-default hover:scrollbar-thumb-border-hover"
              >
                {validationResult.availableModels.map(modelId => {
                  const checked = selectedModels.includes(modelId);
                  return (
                    <label
                      key={modelId}
                      className="flex cursor-pointer items-center gap-2 py-0.5 text-[11px] text-text-secondary"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-border-default bg-bg-primary text-accent focus:ring-0"
                        checked={checked}
                        onChange={() => {
                          setSelectedModels(prev =>
                            prev.includes(modelId)
                              ? prev.filter(id => id !== modelId)
                              : [...prev, modelId]
                          );
                        }}
                      />
                      <span className="truncate font-mono text-[10px]">{modelId}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiKeyManager({ savedKeys, onSave, onDelete, onValidate }: ApiKeyManagerProps) {
  return (
    <div className="space-y-3">
      {AI_PROVIDERS.map(provider => {
        const savedKey = savedKeys.find(k => k.provider === provider.id);
        return (
          <ProviderKeyRow
            key={provider.id}
            provider={provider}
            savedKey={savedKey}
            onSave={onSave}
            onDelete={onDelete}
            onValidate={onValidate}
          />
        );
      })}
    </div>
  );
}
