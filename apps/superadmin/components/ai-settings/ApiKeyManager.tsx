// filepath: apps/superadmin/components/ai-settings/ApiKeyManager.tsx
// Component for managing AI API keys: .env import (system-parsed) and per-provider save.

'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Shield, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AI_PROVIDERS, type AIProvider, type AIProviderInfo } from '@/lib/ai-providers';
import { maskApiKey } from '@/lib/crypto';
import { parseEnvForAIKeys, SUPPORTED_AI_ENV_KEY_NAMES } from '@/lib/parse-env-keys';
import type { SavedKey, SavedModel, KeyValidationResult } from '@/lib/hooks/useAISettings';

interface ApiKeyManagerProps {
  savedKeys: SavedKey[];
  /** 來自「模型費用說明」的已選模型，用於在未驗證時顯示已選模型（系統有持久化） */
  savedModels?: SavedModel[];
  /** 全部驗證完成後各 key 的結果，供每張 card 直接顯示 Available models */
  validateAllResultsByKeyId?: Record<string, KeyValidationResult>;
  /** options.skipRefresh: 批量導入時傳 true，由呼叫端在全部完成後自行重整，避免畫面閃爍 */
  onSave: (provider: AIProvider, rawKey: string, options?: { skipRefresh?: boolean }) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onValidate: (provider: AIProvider, apiKey: string, keyId?: string) => Promise<KeyValidationResult>;
  /** Optional ref for parent to trigger env import panel open/close (e.g. header button). */
  headerActionsRef?: React.MutableRefObject<{ setEnvImportOpen: (v: boolean) => void } | null>;
  /** 批量導入完成後呼叫一次；可傳入導入成功家數，供頁面顯示並執行驗證全部金鑰 */
  onBatchImportComplete?: (importedCount?: number) => void | Promise<void>;
}

export interface ApiKeyManagerHandle {
  /** 保留以相容既有 ref 使用；目前無需取得模型勾選（模型選擇僅在「已選/可選模型評估」分頁） */
  getModelSelections?: () => Record<string, string[]>;
}

interface ProviderKeyRowProps {
  provider: AIProviderInfo;
  savedKey?: SavedKey;
  /** 該 provider 在 DB 的已選模型（唯讀顯示；實際選擇請至「已選/可選模型評估」分頁） */
  providerSavedModels?: SavedModel[];
  /** 全部驗證完成後傳入的該 key 結果，用於直接顯示 Available models 無需再按「驗證金鑰」 */
  validationResultFromValidateAll?: KeyValidationResult;
  onSave: (provider: AIProvider, rawKey: string) => Promise<void>;
  onDelete: (keyId: string) => Promise<void>;
  onValidate: (provider: AIProvider, apiKey: string, keyId?: string) => Promise<KeyValidationResult>;
}

function ProviderKeyRow({ provider, savedKey, providerSavedModels = [], validationResultFromValidateAll, onSave, onDelete, onValidate }: ProviderKeyRowProps) {
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<KeyValidationResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!savedKey);

  /** 本卡「驗證金鑰」結果優先；若無則用「全部驗證」傳入的結果 */
  const displayResult = validationResult ?? validationResultFromValidateAll;

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
      {/* Header: provider name + doc links on same row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${providerColors[provider.id]}20`, color: providerColors[provider.id] }}
          >
            {provider.name.charAt(0)}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h4 className="text-sm font-semibold text-text-primary">{provider.name}</h4>
            <span className="text-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline hover:text-accent transition-colors"
                title={`${provider.name} API Key 設定頁面`}
              >
                {provider.envKey}
              </a>
              {provider.sdkDocsUrl && (
                <>
                  <span className="text-border-default">·</span>
                  <a
                    href={provider.sdkDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline hover:text-accent transition-colors"
                  >
                    {provider.sdkDocsLabel ?? `${provider.name} SDK Doc`}
                  </a>
                </>
              )}
              {provider.dashboardUrl && (
                <>
                  <span className="text-border-default">·</span>
                  <a
                    href={provider.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline hover:text-accent transition-colors"
                  >
                    {provider.dashboardLabel ?? `${provider.name} Dashboard`}
                  </a>
                </>
              )}
            </span>
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
            <div className="flex-1 min-w-0 relative flex items-center">
              <div className="flex-1 min-w-0 px-3 py-2 pr-10 bg-bg-tertiary rounded-base text-sm text-text-secondary font-mono truncate">
                {showKey && savedKey.decryptedKey
                  ? savedKey.decryptedKey
                  : maskApiKey(`${provider.keyPrefix}${'x'.repeat(40)}`)}
              </div>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                title={showKey ? '隱藏金鑰' : '顯示金鑰'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleValidate} disabled={validating} isLoading={validating}>
              驗證金鑰
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} title="清空金鑰（自雲端刪除）">
              <Trash2 size={14} />
            </Button>
          </div>

          {/* Validation Result for Stored Key (已儲存金鑰按「驗證金鑰」的結果) */}
          {validationResult && (
            <div
              className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-base text-xs ${
                validationResult.valid
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {validationResult.valid ? <Check size={12} /> : <X size={12} />}
              <span className="font-medium">{validationResult.message}</span>
              {validationResult.modelInfo && (
                <span className="px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default">
                  {validationResult.modelInfo}
                </span>
              )}
              {validationResult.valid &&
                Array.isArray(validationResult.availableModels) &&
                validationResult.availableModels.length >= 0 && (
                  <span className="px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default font-medium">
                    Available models: {validationResult.availableModels.length}
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

          {/* Validation Result (來自「驗證金鑰」或「全部驗證」) */}
          {displayResult && (
            <div
              className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-base text-xs ${
                displayResult.valid
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {displayResult.valid ? <Check size={12} /> : <X size={12} />}
              <span className="font-medium">{displayResult.message}</span>
              {displayResult.modelInfo && (
                <span className="px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default">
                  {displayResult.modelInfo}
                </span>
              )}
              {displayResult.valid &&
                Array.isArray(displayResult.availableModels) &&
                displayResult.availableModels.length >= 0 && (
                  <span className="px-1.5 py-0.5 bg-bg-primary rounded text-[10px] border border-border-default font-medium">
                    Available models: {displayResult.availableModels.length}
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
              儲存
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

      {/* SDK Info (when sdkDocsUrl is set, SDK links are in header; only show Base URL here) */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-text-muted">
        {!provider.sdkDocsUrl && (
          <span>SDK: <code className="text-text-secondary">{provider.sdkPackage}</code></span>
        )}
        <span>Base URL: <code className="text-text-secondary">{provider.baseUrl}</code></span>
      </div>

      {/* 已選模型（唯讀；選擇/變更請至「已選/可選模型評估」分頁） */}
      {savedKey && providerSavedModels.length > 0 && (
        <div className="mt-2 space-y-0.5 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-medium text-text-secondary">已選模型：</span>
            <span className="font-mono text-[10px] text-text-primary">
              {providerSavedModels.map(m => m.model_id).join('、')}
            </span>
          </div>
          <p className="text-[10px] text-text-muted">
            選擇或變更模型請至「已選/可選模型評估」分頁。
          </p>
        </div>
      )}

      {/* 驗證成功但未取得可用模型列表時提示 */}
      {displayResult?.valid && (!displayResult.availableModels || displayResult.availableModels.length === 0) && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-base bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20 text-[11px]">
          ⚠️ 雖然驗證成功，但未取得可用模型列表。可能是權限不足或 API 回應格式不符。
        </div>
      )}
    </div>
  );
}

const ApiKeyManagerInner = ({
  savedKeys,
  savedModels = [],
  validateAllResultsByKeyId,
  onSave,
  onDelete,
  onValidate,
  headerActionsRef,
  onBatchImportComplete,
}: ApiKeyManagerProps,
ref: React.Ref<ApiKeyManagerHandle>) => {
  const [envImportOpen, setEnvImportOpen] = useState(false);
  const [envImportText, setEnvImportText] = useState('');
  const [envImporting, setEnvImporting] = useState(false);
  const [envImportResult, setEnvImportResult] = useState<{ ok: string[]; err: string[] } | null>(null);

  useImperativeHandle(ref, () => ({}), []);

  useEffect(() => {
    if (headerActionsRef) {
      headerActionsRef.current = { setEnvImportOpen };
      return () => {
        headerActionsRef.current = null;
      };
    }
  }, [headerActionsRef]);

  const handleEnvImport = async () => {
    const parsed = parseEnvForAIKeys(envImportText);
    if (parsed.length === 0) {
      setEnvImportResult({
        ok: [],
        err: [`未辨識到任何 AI 金鑰。請確認貼文內含 KEY=value 且變數名為：${SUPPORTED_AI_ENV_KEY_NAMES.join('、')}`],
      });
      return;
    }
    setEnvImporting(true);
    setEnvImportResult(null);
    const ok: string[] = [];
    const err: string[] = [];
    try {
      for (const { provider, envKey, value } of parsed) {
        try {
          await onSave(provider, value, { skipRefresh: true });
          ok.push(envKey);
        } catch (e) {
          err.push(`${envKey}: ${e instanceof Error ? e.message : '儲存失敗'}`);
        }
      }
      setEnvImportResult({ ok, err });
      if (err.length === 0) {
        setEnvImportText('');
        // 必須 await 重整與驗證，否則關閉面板時 keys 尚未更新；傳入導入成功家數供彈窗顯示
        await onBatchImportComplete?.(ok.length);
        setTimeout(() => {
          setEnvImportOpen(false);
          setEnvImportResult(null);
        }, 2000);
      }
    } finally {
      setEnvImporting(false);
    }
  };

  const parsedCount = parseEnvForAIKeys(envImportText).length;
  const canImport = parsedCount > 0 && !envImporting;

  return (
    <div className="space-y-4">
      {/* 從 .env 導入：說明改由 header 按鈕 hover 顯示，此處僅在展開時顯示表單 */}
      {envImportOpen && (
        <div className="bg-bg-secondary border border-border-default rounded-base p-4 sm:p-5 shadow-sm">
          <div className="space-y-3">
            <textarea
              value={envImportText}
              onChange={(e) => setEnvImportText(e.target.value)}
              placeholder={'支援 .env 或 JSON\n.env: OPENAI_API_KEY=sk-...\nJSON: {"OPENAI_API_KEY":"sk-..."}\n僅辨識清單內變數名（拼寫需正確，大小寫不拘）'}
              rows={6}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-base text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-y"
            />
            {envImportText.trim() && (
              <div className="text-xs text-text-muted">
                {(() => {
                  const parsed = parseEnvForAIKeys(envImportText);
                  if (parsed.length === 0) {
                    return (
                      <span className="text-amber-500">
                        尚未辨識到任何 AI 金鑰。請確認變數名拼寫正確（大小寫不拘）、格式為 KEY=value，且為辨識清單其一。
                      </span>
                    );
                  }
                  return (
                    <span className="text-green-600 dark:text-green-400">
                      辨識到 {parsed.length} 個：{parsed.map((p) => p.envKey).join('、')}
                    </span>
                  );
                })()}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleEnvImport}
                disabled={!canImport}
                isLoading={envImporting}
                aria-label="導入、儲存並驗證全部金鑰"
              >
                <Shield size={14} />
                導入，儲存並驗證全部金鑰
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEnvImportOpen(false);
                  setEnvImportText('');
                  setEnvImportResult(null);
                }}
              >
                關閉
              </Button>
            </div>
            {envImportResult && (
              <div className="space-y-1 text-xs">
                {envImportResult.ok.length > 0 && (
                  <p className="text-green-400 flex items-center gap-1">
                    <Check size={12} /> 已導入：{envImportResult.ok.join(', ')}
                  </p>
                )}
                {envImportResult.err.length > 0 && (
                  <p className="text-red-400 flex items-center gap-1">
                    <X size={12} /> {envImportResult.err.join('；')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {AI_PROVIDERS.map(provider => {
          const savedKey = savedKeys.find(k => k.provider === provider.id);
          const providerSavedModels = savedModels.filter(m => m.provider === provider.id);
          return (
            <ProviderKeyRow
              key={provider.id}
              provider={provider}
              savedKey={savedKey}
              providerSavedModels={providerSavedModels}
              validationResultFromValidateAll={savedKey ? validateAllResultsByKeyId?.[savedKey.id] : undefined}
              onSave={onSave}
              onDelete={onDelete}
              onValidate={onValidate}
            />
          );
        })}
      </div>
    </div>
  );
};

export const ApiKeyManager = forwardRef<ApiKeyManagerHandle, ApiKeyManagerProps>(ApiKeyManagerInner);
