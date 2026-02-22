'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Key, Cpu, Puzzle, MessageSquareText, BarChart3, FlaskConical,
  Loader2, RefreshCw, Trash2, Upload, ShieldCheck, Save,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import {
  ApiKeyManager,
  type ApiKeyManagerHandle,
  ModelSelector,
  ModelEvaluator,
  FeatureModuleSelector,
  SystemPromptEditor,
  UsageMonitor,
} from '@/components/ai-settings';
import { useAISettings, type KeyValidationResult } from '@/lib/hooks/useAISettings';
import { getTotalAvailableModels, getSelectedCountInAvailable } from '@/lib/utils/total-available-models';
import { getProviderById } from '@/lib/ai-providers';
import { SUPPORTED_AI_ENV_KEY_NAMES, parseEnvForAIKeys } from '@/lib/parse-env-keys';

type SettingsTab = 'keys' | 'evaluations' | 'models' | 'modules' | 'prompts' | 'usage';

const TAB_IDS: SettingsTab[] = ['keys', 'evaluations', 'modules', 'prompts', 'usage', 'models'];

function getTabFromHash(): SettingsTab | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1).toLowerCase();
  return (TAB_IDS as string[]).includes(hash) ? (hash as SettingsTab) : null;
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'keys', label: 'API 金鑰管理', icon: Key, description: '管理各 AI 服務提供商的 API 金鑰' },
  { id: 'evaluations', label: '已選/可選模型評估', icon: FlaskConical, description: '評估各模型的運作狀態與強項，建立 AI 功能候選名單' },
  { id: 'modules', label: '功能模組配置', icon: Puzzle, description: '啟用與配置 AI 功能模組' },
  { id: 'prompts', label: 'System Prompt', icon: MessageSquareText, description: '編輯各功能模組的系統提示詞' },
  { id: 'usage', label: '使用監控與設定', icon: BarChart3, description: '查看使用統計，匯入/匯出設定' },
  { id: 'models', label: '模型費用說明', icon: Cpu, description: '選擇與配置可用的 AI 模型' },
];

const ENV_IMPORT_TOOLTIP = `從 .env 或 JSON 導入\n支援兩種格式：\n• .env：KEY=value 或 export KEY=value\n• JSON：{"OPENAI_API_KEY":"sk-..."} 等頂層 key\n變數名大小寫不拘、拼寫需正確；僅下列金鑰會被辨識：${SUPPORTED_AI_ENV_KEY_NAMES.join('、')}`;

export default function AIServiceSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => getTabFromHash() ?? 'keys');
  const [envImportButtonHover, setEnvImportButtonHover] = useState(false);
  const settings = useAISettings();
  const apiKeyHeaderActionsRef = useRef<{ setEnvImportOpen: (v: boolean) => void } | null>(null);
  const apiKeyManagerRef = useRef<ApiKeyManagerHandle | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importLocalLoading, setImportLocalLoading] = useState(false);
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false);
  const [validateAllLoading, setValidateAllLoading] = useState(false);
  /** 全部驗證完成後各 key 的結果，供每張 card 直接顯示 Available models，無需再按「驗證金鑰」 */
  const [validateAllResultsByKeyId, setValidateAllResultsByKeyId] = useState<Record<string, KeyValidationResult>>({});
  const keysRef = useRef(settings.keys);
  useEffect(() => {
    keysRef.current = settings.keys;
  }, [settings.keys]);

  useEffect(() => {
    const tab = getTabFromHash();
    if (tab) setActiveTab(tab);
    const onHashChange = () => {
      const t = getTabFromHash();
      if (t) setActiveTab(t);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // 只合併「目前仍存在的 key」的驗證快取，刪除金鑰後不會帶入已刪 key 的 cache
  useEffect(() => {
    const cache = settings.validationCacheByKeyId;
    const currentKeyIds = new Set(settings.keys.map((k) => k.id));
    if (!cache || Object.keys(cache).length === 0) return;
    const fromCache = Object.fromEntries(
      Object.entries(cache).filter(([keyId]) => currentKeyIds.has(keyId))
    );
    if (Object.keys(fromCache).length === 0) return;
    setValidateAllResultsByKeyId((prev) => ({ ...fromCache, ...prev }));
  }, [settings.validationCacheByKeyId, settings.keys]);

  // 金鑰刪除後清除已不存在 key 的驗證結果，使「可選 models」數字即時減少
  useEffect(() => {
    const currentKeyIds = new Set(settings.keys.map((k) => k.id));
    setValidateAllResultsByKeyId((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([keyId]) => currentKeyIds.has(keyId))
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [settings.keys]);

  const handleTabClick = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const runValidateAllKeys = useCallback(
    async (keys: typeof settings.keys, importedCount?: number) => {
      if (!keys.length) return;
      setValidateAllLoading(true);
      try {
        const results = await Promise.all(
          keys.map((key) =>
            settings.validateKey(
              key.provider,
              key.decryptedKey ?? '',
              key.id,
              { skipRefresh: true }
            )
          )
        );
        await settings.refreshSilent();
        const successCount = results.filter((r) => r?.valid).length;
        const byProviderForTotal = new Map<string, number>();
        keys.forEach((k, i) => {
          const r = results[i];
          if (!r?.valid || !Array.isArray(r.availableModels)) return;
          const count = r.availableModels.length;
          const existing = byProviderForTotal.get(k.provider);
          if (existing === undefined || existing < count) byProviderForTotal.set(k.provider, count);
        });
        const totalModels = Array.from(byProviderForTotal.values()).reduce((a, b) => a + b, 0);
        const byKeyId: Record<string, KeyValidationResult> = {};
        keys.forEach((k, i) => {
          if (results[i]) byKeyId[k.id] = results[i] as KeyValidationResult;
        });
        setValidateAllResultsByKeyId(byKeyId);
        try {
          await settings.saveValidationSummary(successCount, totalModels);
        } catch (saveErr) {
          console.warn('[驗證全部金鑰] 組態概況寫入失敗，不影響驗證結果', saveErr);
        }
        if (typeof window !== 'undefined') {
          const lines: string[] = [];
          if (importedCount != null && importedCount > 0) {
            lines.push(`導入成功 ${importedCount} 家金鑰。`);
            lines.push('');
          }
          lines.push(`驗證完成。驗證成功 ${successCount} 家。`);
          if (byProviderForTotal.size > 0) {
            const perProvider = Array.from(byProviderForTotal.entries())
              .map(([providerId, count]) => {
                const name = getProviderById(providerId as Parameters<typeof getProviderById>[0])?.name ?? providerId;
                return `${name}：${count} 個`;
              })
              .join('；');
            lines.push(`各家可用模型數：${perProvider}`);
          }
          lines.push(`全部可用模型共 ${totalModels} 個。`);
          window.alert(lines.join('\n'));
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : '驗證全部金鑰時發生錯誤，請稍後再試';
        if (typeof window !== 'undefined') window.alert(msg);
      } finally {
        setValidateAllLoading(false);
      }
    },
    [settings]
  );

  const renderContent = () => {
    if (settings.loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={32} />
          <span className="ml-3 text-text-secondary">載入設定中...</span>
        </div>
      );
    }

    if (settings.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-red-400">
          <p className="text-sm mb-3">載入錯誤：{settings.error}</p>
          <Button size="sm" variant="secondary" onClick={() => settings.refresh()}>
            <RefreshCw size={14} /> 重試
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'keys':
        return (
          <ApiKeyManager
            ref={apiKeyManagerRef}
            savedKeys={settings.keys}
            savedModels={settings.models}
            validateAllResultsByKeyId={validateAllResultsByKeyId}
            onSave={settings.saveKey}
            onDelete={settings.deleteKey}
            onValidate={async (provider, apiKey, keyId) => {
              const r = await settings.validateKey(provider, apiKey, keyId);
              if (keyId && r?.valid) setValidateAllResultsByKeyId((prev) => ({ ...prev, [keyId]: r }));
              return r;
            }}
            headerActionsRef={apiKeyHeaderActionsRef}
            onSaveModels={async (providerId, modelIds) => {
              await settings.saveModels(
                providerId as Parameters<typeof settings.saveModels>[0],
                modelIds.map((modelId, i) => ({ modelId, modelName: modelId, isPrimary: i === 0 }))
              );
            }}
            onBatchImportComplete={async (importedCount) => {
              await settings.refresh();
              await new Promise((r) => setTimeout(r, 800));
              await runValidateAllKeys(keysRef.current, importedCount);
            }}
          />
        );
      case 'evaluations':
        return (
          <ModelEvaluator
            savedKeys={settings.keys}
            savedModels={settings.models}
            savedEvaluations={settings.evaluations}
            validateAllResultsByKeyId={validateAllResultsByKeyId}
            currentKeys={settings.keys.map((k) => ({ id: k.id, provider: k.provider }))}
            onSave={settings.saveEvaluations}
            onTestModel={settings.testModel}
            onSaveModels={async (providerId, selections) => {
              await settings.saveModels(
                providerId as Parameters<typeof settings.saveModels>[0],
                selections
              );
            }}
          />
        );
      case 'models':
        return (
          <ModelSelector
            savedKeys={settings.keys}
            savedModels={settings.models}
            onSave={settings.saveModels}
          />
        );
      case 'modules':
        return (
          <FeatureModuleSelector
            savedModules={settings.modules}
            savedKeys={settings.keys}
            savedModels={settings.models}
            onSave={async (moduleKey, isEnabled, assignedModels, config) => {
              await settings.saveModule(moduleKey, isEnabled, assignedModels, undefined, config);
            }}
            onTestModel={settings.testModel}
          />
        );
      case 'prompts':
        return (
          <SystemPromptEditor
            savedPrompts={settings.prompts}
            savedKeys={settings.keys}
            onSave={settings.savePrompt}
          />
        );
      case 'usage':
        return (
          <UsageMonitor
            keys={settings.keys}
            models={settings.models}
            modules={settings.modules}
            prompts={settings.prompts}
            onExport={settings.exportSettings}
            onImport={settings.importSettings}
          />
        );
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  /** 可選 models 總數：只計入「目前仍存在的 key」的驗證結果，刪除金鑰後即時減少 */
  const computedFromValidation = getTotalAvailableModels(
    validateAllResultsByKeyId,
    settings.keys.map((k) => ({ id: k.id, provider: k.provider }))
  );
  const totalAvailableModels =
    settings.keys.length === 0
      ? 0
      : computedFromValidation > 0
        ? computedFromValidation
        : settings.validationSummary.totalModels;

  /**
   * 單一事實來源：已選數量一律來自 Supabase ai_model_selections（settings.models）。
   * 與 API 金鑰管理、已選/可選模型評估、模型費用說明 等分頁顯示一致。
   */
  const currentKeysForUtil = settings.keys.map((k) => ({ id: k.id, provider: k.provider }));
  const selectedInAvailable = getSelectedCountInAvailable(
    settings.models,
    validateAllResultsByKeyId,
    currentKeysForUtil
  );
  const currentProviderIds = new Set(settings.keys.map((k) => k.provider));
  const selectedModelsForCurrentKeys = settings.models.filter((m) =>
    currentProviderIds.has(m.provider)
  );
  const selectedModelCountRaw =
    selectedInAvailable ?? selectedModelsForCurrentKeys.length;
  const selectedModelCount = Math.min(selectedModelCountRaw, totalAvailableModels);

  const fixedBlock = (
    <div className="max-w-7xl mx-auto px-6 py-4 bg-bg-secondary border-b border-border-subtle">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-5 border-b border-border-subtle">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex gap-2 overflow-x-auto shrink-0">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-text-muted'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            {React.createElement(currentTab.icon, { size: 18, className: 'text-accent shrink-0' })}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">{currentTab.label}</h2>
              <p className="text-[11px] text-text-muted">{currentTab.description}</p>
            </div>
            {activeTab === 'keys' && (
              <>
                <div
                  className="relative inline-flex shrink-0"
                  onMouseEnter={() => setEnvImportButtonHover(true)}
                  onMouseLeave={() => setEnvImportButtonHover(false)}
                >
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => apiKeyHeaderActionsRef.current?.setEnvImportOpen(true)}
                  >
                    批量導入API KEY
                  </Button>
                  {envImportButtonHover && (
                    <div
                      className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-base border border-border-default bg-bg-primary px-3 py-2.5 text-left shadow-lg"
                      role="tooltip"
                    >
                      <p className="whitespace-pre-line text-xs text-text-secondary">
                        {ENV_IMPORT_TOOLTIP}
                      </p>
                    </div>
                  )}
                </div>
                {!settings.loading && (
                  <div className="flex flex-col gap-0.5 shrink-0 text-xs text-text-secondary">
                    <span>
                      已驗證/可設定金鑰家數{' '}
                      <span className="font-medium text-text-primary">
                        {settings.keys.filter((k) => k.is_valid === true).length}/5
                      </span>
                    </span>
                    <span>
                      已選/可選 models 數量{' '}
                      <span className="font-medium text-text-primary">
                        {selectedModelCount}/{totalAvailableModels}
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}
            {activeTab === 'evaluations' && !settings.loading && (
              <div className="flex flex-col gap-0.5 shrink-0 text-xs text-text-secondary">
                <span>
                  已選/可選 models 數量{' '}
                  <span className="font-medium text-text-primary">
                    {selectedModelCount}/{totalAvailableModels}
                  </span>
                  <span className="text-text-muted ml-1">（與 API 金鑰管理同步）</span>
                </span>
              </div>
            )}
          </div>
          {activeTab === 'keys' && (
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => importFileInputRef.current?.click()}
                isLoading={importLocalLoading}
                title="從本機選擇 JSON 檔案，將 AI 金鑰、模型與模組等設定匯入並同步至雲端"
              >
                <Upload size={14} /> 導入設定
              </Button>
              <Button
                size="sm"
                variant="secondary"
                title="將目前畫面上的已選 models 寫入雲端"
                isLoading={saveSettingsLoading}
                onClick={async () => {
                  const selections = apiKeyManagerRef.current?.getModelSelections?.() ?? {};
                  setSaveSettingsLoading(true);
                  try {
                    const providers = Object.keys(selections);
                    for (const providerId of providers) {
                      const ids = selections[providerId] ?? [];
                      await settings.saveModels(
                        providerId as Parameters<typeof settings.saveModels>[0],
                        ids.map((modelId, i) => ({ modelId, modelName: modelId, isPrimary: i === 0 }))
                      );
                    }
                    await settings.refreshSilent();
                    if (typeof window !== 'undefined') window.alert('設定已儲存');
                  } catch (err) {
                    if (typeof window !== 'undefined') window.alert(err instanceof Error ? err.message : '儲存失敗');
                  } finally {
                    setSaveSettingsLoading(false);
                  }
                }}
              >
                <Save size={14} /> 儲存設定
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="一鍵清空雲端上的 API 金鑰、已選模型、功能模組與 System Prompt"
                onClick={async () => {
                  if (typeof window === 'undefined') return;
                  try {
                    await settings.clearAll();
                  } catch {
                    // 靜默失敗，不顯示彈窗
                  }
                }}
              >
                <Trash2 size={14} /> 全部清空
              </Button>
              <Button
                size="sm"
                variant="secondary"
                title="一鍵驗證所有已儲存的 API 金鑰，並顯示可選用模型總數"
                isLoading={validateAllLoading}
                onClick={async () => {
                  const keys = settings.keys;
                  if (!keys.length) {
                    if (typeof window !== 'undefined') window.alert('尚無已儲存的金鑰可驗證');
                    return;
                  }
                  await runValidateAllKeys(keys);
                }}
              >
                <ShieldCheck size={14} /> 驗證全部金鑰
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Model and API key Settings"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: 'Model and API key Settings' },
      ]}
      fixedContent={fixedBlock}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 lg:py-6">
        <section className="space-y-4">
          <div className="bg-bg-secondary border border-border-default rounded-base p-4 sm:p-5 shadow-sm">
            {renderContent()}
          </div>
        </section>

        <input
          ref={importFileInputRef}
          type="file"
          accept=".json,.env,application/json,text/plain"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImportLocalLoading(true);
            try {
              let text = await file.text();
              text = text.replace(/^\uFEFF/, '').trim();
              let importPayload: Record<string, unknown> = {};
              const firstBrace = text.indexOf('{');

              if (firstBrace >= 0 && firstBrace < text.length) {
                const envPart = text.slice(0, firstBrace).trim();
                const jsonPart = text.slice(firstBrace);
                if (envPart) {
                  const envKeys = parseEnvForAIKeys(envPart);
                  for (const { provider, value } of envKeys) {
                    await settings.saveKey(provider, value);
                  }
                }
                try {
                  importPayload = JSON.parse(jsonPart) as Record<string, unknown>;
                } catch {
                  if (!envPart) throw new Error('JSON 區段格式不正確');
                }
              } else if (text.startsWith('{')) {
                importPayload = JSON.parse(text) as Record<string, unknown>;
              } else {
                const envKeys = parseEnvForAIKeys(text);
                for (const { provider, value } of envKeys) {
                  await settings.saveKey(provider, value);
                }
                await settings.refresh();
                setImportLocalLoading(false);
                e.target.value = '';
                if (typeof window !== 'undefined') window.alert(envKeys.length ? `已導入 ${envKeys.length} 個 API 金鑰（檔案內無 JSON 設定）` : '未辨識到任何 AI 金鑰，請確認格式為 KEY=value 或 JSON');
                return;
              }

              if (typeof importPayload.api_keys_env === 'string') {
                const envKeys = parseEnvForAIKeys(importPayload.api_keys_env);
                for (const { provider, value } of envKeys) {
                  await settings.saveKey(provider, value);
                }
                const { api_keys_env: _, ...rest } = importPayload;
                importPayload = rest;
              }
              await settings.importSettings(importPayload);
              await settings.refresh();
              if (typeof window !== 'undefined') window.alert('導入完成');
            } catch (err) {
              if (typeof window !== 'undefined') window.alert(err instanceof Error ? err.message : '導入失敗：檔案格式不正確');
            } finally {
              setImportLocalLoading(false);
              e.target.value = '';
            }
          }}
        />
        {/* 安全提醒、建議流程 – 僅在 keys 頁籤顯示 */}
        {activeTab === 'keys' && (
          <div className="mt-8 space-y-4">
            <div className="rounded-base border border-amber-300/40 bg-amber-50/80 p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                安全提醒
              </p>
              <p className="text-xs text-amber-800">
                請勿在前端程式碼或公開版控中硬編金鑰。所有 LLM 請求應透過後端或受保護的
                Server Action 轉發。
              </p>
            </div>

            <div className="rounded-base border border-border-subtle bg-bg-secondary p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                建議流程
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-text-secondary">
                <li>先在「API 金鑰管理」中新增各雲端提供商金鑰。</li>
                <li>於「模型費用說明」指定預設模型與備援模型。</li>
                <li>在「功能模組配置」啟用對應模組並綁定模型。</li>
                <li>最後在「System Prompt」微調各模組的系統提示詞。</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
