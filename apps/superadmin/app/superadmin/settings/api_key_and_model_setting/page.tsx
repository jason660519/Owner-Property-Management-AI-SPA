'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Key, Puzzle, MessageSquareText, FlaskConical,
  Loader2, RefreshCw, Trash2, ShieldCheck, Upload,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import {
  ApiKeyManager,
  type ApiKeyManagerHandle,
  ModelEvaluator,
  FeatureModuleSelector,
} from '@/components/ai-settings';
import { useAISettings, type KeyValidationResult } from '@/lib/hooks/useAISettings';
import { getTotalAvailableModels, getSelectedCountInAvailable } from '@/lib/utils/total-available-models';
import { getProviderById, AI_PROVIDERS } from '@/lib/ai-providers';
import { SUPPORTED_AI_ENV_KEY_NAMES } from '@/lib/parse-env-keys';

type SettingsTab = 'keys' | 'evaluations' | 'modules';

const TAB_IDS: SettingsTab[] = ['keys', 'evaluations', 'modules'];

function getTabFromHash(): SettingsTab | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1).toLowerCase();
  return (TAB_IDS as string[]).includes(hash) ? (hash as SettingsTab) : null;
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'keys', label: 'API 金鑰管理', icon: Key, description: '管理各 AI 服務提供商的 API 金鑰' },
  { id: 'evaluations', label: '已選/可選模型評估', icon: FlaskConical, description: '' },
  { id: 'modules', label: '功能模組配置', icon: Puzzle, description: '啟用與配置 AI 功能模組' },
];

const ENV_IMPORT_TOOLTIP = `從 .env 或 JSON 導入\n支援兩種格式：\n• .env：KEY=value 或 export KEY=value\n• JSON：{"OPENAI_API_KEY":"sk-..."} 等頂層 key\n變數名大小寫不拘、拼寫需正確；僅下列金鑰會被辨識：${SUPPORTED_AI_ENV_KEY_NAMES.join('、')}`;

export default function AIServiceSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => getTabFromHash() ?? 'keys');
  const [envImportButtonHover, setEnvImportButtonHover] = useState(false);
  const settings = useAISettings();
  const apiKeyHeaderActionsRef = useRef<{ setEnvImportOpen: (v: boolean) => void } | null>(null);
  const apiKeyManagerRef = useRef<ApiKeyManagerHandle | null>(null);
  const [validateAllLoading, setValidateAllLoading] = useState(false);
  /** 全部驗證完成後各 key 的結果，供每張 card 直接顯示 Available models，無需再按「驗證金鑰」 */
  const [validateAllResultsByKeyId, setValidateAllResultsByKeyId] = useState<Record<string, KeyValidationResult>>({});
  const keysRef = useRef(settings.keys);
  const modelEvaluatorHeaderActionsRef = useRef<{
    runBatchTest: () => void;
    batchTesting: boolean;
    canBatchTest: boolean;
    tooltip: string;
  } | null>(null);
  useEffect(() => {
    keysRef.current = settings.keys;
  }, [settings.keys]);

  // 已選/可選模型評估：全域測試 Prompt 與共用檔案（供 ModelEvaluator 使用）
  const DEFAULT_EVALUATION_PROMPT = `請根據我提供的文件資料，無論其格式為何（PDF、JPG、掃描後的 OCR 文字、或直接複製的文字），完整解析並轉換成結構化的 JSON 格式，以便將來餵給資料庫使用。
具體來說，我將執行以下步驟：
內容分區： 將謄本內容細分為「謄本資訊」、「建物標示部」和「建物所有權部」等明確區塊，確保資料結構清晰。
資訊提取： 從各區塊中精確提取所有相關資訊，包括但不限於：
謄本種類
建物建號
行政區
列印時間
建物門牌
主要用途
所有權人
權利範圍
以及所有其他相關字段
格式轉換： 將提取的資訊轉換為 key-value 對的形式，並嚴格按照 JSON 格式進行組織，確保資料庫易於讀取和使用。
資料清洗： 徹底清理資料，包括去除多餘的空格、修正 OCR 文字識別錯誤、以及處理任何不一致或不完整的數據，以提高資料品質。
列表處理： 將「其他登記事項」等包含多個項目的資訊轉換為 JSON 陣列，確保所有資訊都以結構化的方式呈現。
輸出範例：
json
{
  "謄本資訊": {
    "謄本種類": "建物登記第二類謄本",
    "建物建號": "01696-000",
    "行政區": "大安區復興段二小段",
    "列印時間": "民國102年07月08日14時21分",
    "頁次": "1",
    "謄本類型": "網路申領之電子謄本",
    "列印機構": "弘盛資產管理股份有限公司",
    "謄本檢查號": "102AF022949REG0F69C7C431A22472C942E9BD12FA301BC",
    "查驗網址": "http://ttt.land.net.tw",
    "地政事務所主任": "高麗香",
    "大安電謄字號": "022949",
    "資料管轄機關": "臺北市大安地政事務所",
    "謄本核發機關": "臺北市大安地政事務所"
  },
  "建物標示部": {
    "登記日期": "民國086年06月04日",
    "登記原因": "門牌整編",
    "建物門牌": "敦化南路一段236巷7號十一樓",
    "建物坐落地號": "復興段二小段0007-0000",
    "主要用途": "住家用",
    "主要建材": "鋼筋混凝土造",
    "層數": "014層",
    "層次": "十一層",
    "建築完成日期": "民國---年--月--日",
    "附屬建物用途": "陽台",
    "總面積": "146.87平方公尺",
    "層次面積": "146.87平方公尺",
    "陽台面積": "17.84平方公尺",
    "共有部分": "復興段二小段01719-000建號2,424.04平方公尺",
    "權利範圍": "242404分之2249",
    "其他登記事項": [
      "1683公設持分110377934188分之1021594009",
      "1712公設持分110377934188分之1597121304",
      "1687公設持分110377934188分之1618925080",
      "1661公設持分110377934188分之1618925080",
      "1713建號公設持分110377934188分之1597238301",
      "使用執照字號:67使字155號",
      "1704建號公設持分110377934188分之1618925080",
      "1687建號公設持分110377934188分之1618925080",
      "主建物1712建號權利範圍110377934188分之1597121304",
      "1679建號公設持分110377934188分之1618925080",
      "1680建號公設持分110377934188分之1618925080"
    ]
  },
  "建物所有權部": {
    "登記次序": "0001",
    "登記日期": "民國080年03月06日",
    "登記原因": "買賣",
    "原因發生日期": "民國080年02月04日",
    "所有權人": "林湘君",
    "住址": "台北市大安區仁愛里19鄰敦化南路1段236巷7號11樓",
    "權利範圍": "全部1分之1",
    "權狀字號": "080北大字第001496號",
    "相關他項權利登記次序": [
      "0002-000",
      "0003-000",
      "0004-000",
      "0005-000"
    ],
    "其他登記事項": null
  },
  "備註": "本謄本僅係建物標示及所有權部節本，詳細權利狀態請參閱全部謄本"
}`;
  const [globalTestPrompt, setGlobalTestPrompt] = useState<string>(DEFAULT_EVALUATION_PROMPT);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
            savedModules={settings.modules}
            onSaveModule={async (moduleKey, isEnabled, assignedModels, config) => {
              await settings.saveModule(moduleKey, isEnabled, assignedModels, undefined, config);
            }}
            summarySelectedCount={selectedModelCount}
            summaryTotalCount={totalAvailableModels}
            globalTestPrompt={globalTestPrompt}
            onChangeGlobalTestPrompt={setGlobalTestPrompt}
            uploadedFile={uploadedFile}
            onChangeUploadedFile={setUploadedFile}
            headerActionsRef={modelEvaluatorHeaderActionsRef}
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
      default:
        return null;
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
   * 與 API 金鑰管理、已選/可選模型評估 等分頁顯示一致。
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
    <div className="w-full px-4 lg:px-6 py-3 bg-bg-secondary border-b border-border-subtle">
      <div className="w-full">
        <div className="mb-3 border-b border-border-subtle">
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 gap-y-1 min-w-0">
            {React.createElement(currentTab.icon, { size: 18, className: 'text-accent shrink-0' })}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">{currentTab.label}</h2>
              {currentTab.description && (
                <p className="text-[11px] text-text-muted">{currentTab.description}</p>
              )}
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
                        {settings.keys.filter((k) => k.is_valid === true).length}/{AI_PROVIDERS.length}
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {activeTab === 'keys' && (
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
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
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: 'Model and API key Settings' },
      ]}
      fixedContent={fixedBlock}
      contentFullHeight
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-2 sm:px-4 lg:px-6 py-3 lg:py-4 min-w-0">
          {activeTab === 'evaluations' && !settings.loading && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-base border border-border-subtle bg-bg-secondary p-3 shadow-sm">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-text-secondary hover:text-text-primary rounded border border-border-subtle bg-bg-primary px-3 py-2 shrink-0">
              <Upload size={16} className="shrink-0" />
              <span>選擇檔案</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadedFile(f);
                  if (e.target) (e.target as HTMLInputElement).value = '';
                }}
                title="上傳 PDF、圖片或文字檔"
              />
            </label>
            {uploadedFile && (
              <span className="text-sm text-text-muted truncate max-w-[160px]" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <textarea
                value={globalTestPrompt}
                onChange={(e) => setGlobalTestPrompt(e.target.value)}
                placeholder="例如：請根據我提供的文件資料，解析並轉換成結構化 JSON（見上方預設內容）"
                rows={2}
                className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[52px]"
                title="輸入任意 prompt，每列測試時會使用此內容"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => modelEvaluatorHeaderActionsRef.current?.runBatchTest()}
              isLoading={modelEvaluatorHeaderActionsRef.current?.batchTesting}
              disabled={
                !modelEvaluatorHeaderActionsRef.current?.canBatchTest ||
                !!modelEvaluatorHeaderActionsRef.current?.batchTesting
              }
              title={
                modelEvaluatorHeaderActionsRef.current?.tooltip ??
                '對目前已選且具金鑰的模型並行測試'
              }
              className="shrink-0"
            >
              {modelEvaluatorHeaderActionsRef.current?.batchTesting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              <span className="ml-1.5 whitespace-nowrap">全部測試</span>
            </Button>
          </div>
        )}
        <section className="space-y-4">
          <div className="bg-bg-secondary border border-border-default rounded-base p-4 sm:p-5 shadow-sm min-w-0">
            {renderContent()}
          </div>
        </section>

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
                <li>在「API 金鑰管理」新增各提供商的 API 金鑰；可用「驗證金鑰」確認可用性並取得可選模型清單。</li>
                <li>在「已選/可選模型評估」勾選要納入候選的模型（可測試連線）；這些模型將可在功能模組中綁定。</li>
                <li>在「功能模組配置」啟用所需模組，並為各模組綁定主模型（1）與備援模型（2～100），必要時可設定 LLM 參數與 System Prompt。</li>
              </ol>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
