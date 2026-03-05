'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FlaskConical, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import { ModelEvaluator } from '@/components/ai-settings';
import {
  useAISettings,
  type KeyValidationResult,
} from '@/lib/hooks/useAISettings';
import {
  getTotalAvailableModels,
  getSelectedCountInAvailable,
} from '@/lib/utils/total-available-models';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';

// Keep localStorage keys identical to main settings page
const LS_GLOBAL_PROMPT = 'ai-settings:globalTestPrompt';

// Reuse the same default evaluation prompt text as the main settings page.
// NOTE: This is intentionally kept in sync; if you update it there, also update here.
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

// Hide the same modules as the evaluations tab on the main settings page
const EVALUATIONS_HIDDEN_MODULE_KEYS = [
  'online_ocr_parse',
  'online_ocr_judge',
  'web_assistant',
  'contract_assistant',
  'blog_generator',
  'ad_generator',
  'software_dev_engineer',
  'ttd_engineer',
];

export default function EvaluationsGlobalTestPage() {
  const settings = useAISettings();

  const [validateAllResultsByKeyId, setValidateAllResultsByKeyId] = useState<
    Record<string, KeyValidationResult>
  >({});

  const [globalTestPrompt, setGlobalTestPrompt] = useState<string>(
    () => readLocalStorage(LS_GLOBAL_PROMPT, DEFAULT_EVALUATION_PROMPT),
  );

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Toolbar header state from ModelEvaluator (batch test + counters)
  const [modelEvaluatorHeaderActions, setModelEvaluatorHeaderActions] =
    useState<{
      runBatchTest: () => void;
      batchTesting: boolean;
      canBatchTest: boolean;
      tooltip: string;
      batchProgress: {
        tested: number;
        total: number;
        succeeded: number;
        failed: number;
      } | null;
      testableCount: number;
      selectedCount: number;
      totalCount: number;
      filteredTotal: number;
      filteredSelectedCount: number;
      hasRecentBatchReport?: boolean;
      openRecentBatchReport?: () => void;
      applyRecentBatchReport?: () => Promise<void>;
      applyingRecentBatchReport?: boolean;
    } | null>(null);

  // Persist global prompt-related state to localStorage
  useEffect(() => {
    writeLocalStorage(LS_GLOBAL_PROMPT, globalTestPrompt);
  }, [globalTestPrompt]);

  // Merge validation cache from hook into local validateAll map
  useEffect(() => {
    const cache = settings.validationCacheByKeyId;
    const currentKeyIds = new Set(settings.keys.map((k) => k.id));
    if (!cache || Object.keys(cache).length === 0) return;
    const fromCache = Object.fromEntries(
      Object.entries(cache).filter(([keyId]) => currentKeyIds.has(keyId)),
    );
    if (Object.keys(fromCache).length === 0) return;
    setValidateAllResultsByKeyId((prev) => ({ ...fromCache, ...prev }));
  }, [settings.validationCacheByKeyId, settings.keys]);

  // Drop validations for keys that no longer exist
  useEffect(() => {
    const currentKeyIds = new Set(settings.keys.map((k) => k.id));
    setValidateAllResultsByKeyId((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([keyId]) => currentKeyIds.has(keyId)),
      );
      return Object.keys(next).length === Object.keys(prev).length
        ? prev
        : next;
    });
  }, [settings.keys]);

  const memoizedCurrentKeys = useMemo(
    () => settings.keys.map((k) => ({ id: k.id, provider: k.provider })),
    [settings.keys],
  );

  // Summary numbers
  const computedFromValidation = getTotalAvailableModels(
    validateAllResultsByKeyId,
    memoizedCurrentKeys,
  );
  const totalAvailableModels =
    settings.keys.length === 0
      ? 0
      : computedFromValidation > 0
        ? computedFromValidation
        : settings.validationSummary.totalModels;

  const currentKeysForUtil = memoizedCurrentKeys;
  const selectedInAvailable = getSelectedCountInAvailable(
    settings.models,
    validateAllResultsByKeyId,
    currentKeysForUtil,
  );
  const currentProviderIds = new Set(
    memoizedCurrentKeys.map((k) => k.provider),
  );
  const selectedModelsForCurrentKeys = settings.models.filter((m) =>
    currentProviderIds.has(m.provider),
  );
  const selectedModelCountRaw =
    selectedInAvailable ?? selectedModelsForCurrentKeys.length;
  const selectedModelCount = Math.min(
    selectedModelCountRaw,
    totalAvailableModels,
  );


  const fixedHeader = (
    <div className="w-full px-4 lg:px-6 py-3 bg-bg-secondary border-b border-border-subtle">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical
            size={18}
            className="text-accent shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">
              已選/可選模型評估 - 統一測試
            </h2>
            <p className="text-[11px] text-text-muted">
              先篩選模型公司並勾選被測模型後，再執行單一測試或統一測試
            </p>
          </div>
        </div>
        {!settings.loading && (
          <div className="flex flex-col gap-0.5 shrink-0 text-xs text-text-secondary text-right">
            <span>
              全部公司可選模型數：
              <span className="font-medium text-text-primary">
                {modelEvaluatorHeaderActions?.totalCount ??
                  totalAvailableModels}
              </span>
              ，已選模型數：
              <span className="font-medium text-text-primary">
                {modelEvaluatorHeaderActions != null
                  ? modelEvaluatorHeaderActions.filteredTotal !==
                    modelEvaluatorHeaderActions.totalCount
                    ? modelEvaluatorHeaderActions.filteredSelectedCount
                    : modelEvaluatorHeaderActions.selectedCount
                  : selectedModelCount}
              </span>
            </span>
            {modelEvaluatorHeaderActions && (
              <span className="text-[11px] text-text-muted">
                可測試模型：
                <span
                  className={
                    modelEvaluatorHeaderActions.testableCount > 0
                      ? 'text-accent font-medium'
                      : 'text-amber-500 font-medium'
                  }
                >
                  {modelEvaluatorHeaderActions.testableCount}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (settings.loading) {
    return (
      <DashboardLayout
        currentRole="superadmin"
        breadcrumbs={[
          { label: '首頁', href: '/' },
          { label: '超級管理員專區', href: '/superadmin' },
          { label: '設定', href: '/superadmin/settings' },
          { label: '模型評估統一測試' },
        ]}
        fixedContent={fixedHeader}
        contentFullHeight
      >
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
          <span className="ml-3 text-text-secondary">載入設定中...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (settings.error) {
    return (
      <DashboardLayout
        currentRole="superadmin"
        breadcrumbs={[
          { label: '首頁', href: '/' },
          { label: '超級管理員專區', href: '/superadmin' },
          { label: '設定', href: '/superadmin/settings' },
          { label: '模型評估統一測試' },
        ]}
        fixedContent={fixedHeader}
        contentFullHeight
      >
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-red-400">
          <p className="text-sm mb-3">載入錯誤：{settings.error}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => settings.refresh()}
          >
            重新整理
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      currentRole="superadmin"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: '模型評估統一測試' },
      ]}
      fixedContent={fixedHeader}
      contentFullHeight
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden w-full px-2 sm:px-4 lg:px-6 py-3 lg:py-4 min-w-0 flex flex-col lg:flex-row gap-4">
          {/* Model evaluator table — left */}
          <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto bg-bg-secondary border border-border-default rounded-base p-4 sm:p-5 shadow-sm min-w-0">
              <ModelEvaluator
                savedKeys={settings.keys}
                savedModels={settings.models}
                savedEvaluations={settings.evaluations}
                validateAllResultsByKeyId={validateAllResultsByKeyId}
                currentKeys={memoizedCurrentKeys}
                onSave={settings.saveEvaluations}
                onTestModel={settings.testModel}
                onSaveModels={async (providerId, selections) => {
                  await settings.saveModels(
                    providerId as Parameters<typeof settings.saveModels>[0],
                    selections,
                  );
                }}
                savedModules={settings.modules}
                hiddenModuleKeys={EVALUATIONS_HIDDEN_MODULE_KEYS}
                onSaveModule={async (
                  moduleKey,
                  isEnabled,
                  assignedModels,
                  config,
                ) => {
                  await settings.saveModule(
                    moduleKey,
                    isEnabled,
                    assignedModels,
                    undefined,
                    config,
                  );
                }}
                summarySelectedCount={selectedModelCount}
                summaryTotalCount={totalAvailableModels}
                globalTestPrompt={globalTestPrompt}
                onChangeGlobalTestPrompt={setGlobalTestPrompt}
                uploadedFile={uploadedFile}
                onChangeUploadedFile={setUploadedFile}
                headerActionsRef={setModelEvaluatorHeaderActions}
              />
            </div>
          </section>

          {/* Global test & Prompt settings panel — right */}
          <section
            aria-label="統一測試與Prompt設定"
            className="rounded-base border border-border-default bg-bg-primary shadow-sm w-full lg:w-[420px] lg:min-w-[380px] lg:flex-shrink-0 lg:overflow-y-auto"
          >
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FlaskConical className="h-5 w-5" />
                統一測試與Prompt設定
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                上傳測試檔案、設定全域測試 Prompt，並一鍵對已選模型執行統一測試。
              </p>
            </div>

              <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-text-secondary hover:text-text-primary rounded border border-border-subtle bg-bg-primary px-3 py-2 shrink-0">
                    <FlaskConical size={16} className="shrink-0" />
                    <span>上傳測試檔案</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setUploadedFile(f);
                        if (e.target)
                          (e.target as HTMLInputElement).value = '';
                      }}
                      title="上傳 PDF、圖片或文字檔"
                    />
                  </label>
                  {uploadedFile && (
                    <span
                      className="text-sm text-text-muted truncate max-w-[240px]"
                      title={uploadedFile.name}
                    >
                      {uploadedFile.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary py-2 shrink-0">
                    <FlaskConical
                      size={13}
                      className="text-text-muted shrink-0"
                    />
                    <span>
                      已選/可選{' '}
                      <span className="font-semibold text-text-primary tabular-nums">
                        {modelEvaluatorHeaderActions?.selectedCount ??
                          selectedModelCount}
                        /
                        {modelEvaluatorHeaderActions?.totalCount ??
                          totalAvailableModels}
                      </span>
                    </span>
                    {modelEvaluatorHeaderActions && (
                      <span
                        className={`font-medium tabular-nums ${
                          modelEvaluatorHeaderActions.testableCount > 0
                            ? 'text-accent'
                            : 'text-amber-500'
                        }`}
                        title={
                          modelEvaluatorHeaderActions.testableCount > 0
                            ? `${modelEvaluatorHeaderActions.testableCount} 個模型已選且有金鑰，可進行測試`
                            : '目前無可測試的模型（需勾選模型且設定有效金鑰）'
                        }
                      >
                        · 可測試 {modelEvaluatorHeaderActions.testableCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={globalTestPrompt}
                    onChange={(e) => setGlobalTestPrompt(e.target.value)}
                    placeholder="全域 Prompt，每列可留空或填 {預設prompt} 使用此內容；可自訂每列專屬 Prompt"
                    rows={12}
                    className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[240px]"
                    title="輸入任意 prompt，每列測試時會使用此內容"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => modelEvaluatorHeaderActions?.runBatchTest()}
                    isLoading={modelEvaluatorHeaderActions?.batchTesting}
                    disabled={
                      !modelEvaluatorHeaderActions?.canBatchTest ||
                      !!modelEvaluatorHeaderActions?.batchTesting
                    }
                    title={
                      modelEvaluatorHeaderActions?.tooltip ??
                      '對目前已選且具金鑰的模型並行測試'
                    }
                    className="shrink-0"
                  >
                    {modelEvaluatorHeaderActions?.batchTesting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FlaskConical size={14} />
                    )}
                    <span className="ml-1.5 whitespace-nowrap">開始統一測試</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => modelEvaluatorHeaderActions?.openRecentBatchReport?.()}
                    disabled={
                      !modelEvaluatorHeaderActions?.hasRecentBatchReport ||
                      !!modelEvaluatorHeaderActions?.batchTesting
                    }
                    title={
                      modelEvaluatorHeaderActions?.hasRecentBatchReport
                        ? '檢視最近一次批次測試報告'
                        : '目前尚無可檢視的最近報告'
                    }
                    className="shrink-0"
                  >
                    <Eye size={14} />
                    <span className="ml-1.5 whitespace-nowrap">檢視最近報告</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void modelEvaluatorHeaderActions?.applyRecentBatchReport?.();
                    }}
                    isLoading={modelEvaluatorHeaderActions?.applyingRecentBatchReport}
                    disabled={
                      !modelEvaluatorHeaderActions?.hasRecentBatchReport ||
                      !!modelEvaluatorHeaderActions?.batchTesting ||
                      !!modelEvaluatorHeaderActions?.applyingRecentBatchReport
                    }
                    title={
                      modelEvaluatorHeaderActions?.hasRecentBatchReport
                        ? '依最近報告自動修正模型分類與狀態'
                        : '目前尚無可套用的最近報告'
                    }
                    className="shrink-0"
                  >
                    <span className="ml-1.5 whitespace-nowrap">套用最近報告修正狀態</span>
                  </Button>
                  {modelEvaluatorHeaderActions?.batchProgress && (
                    <span className="text-xs text-text-secondary tabular-nums">
                      {modelEvaluatorHeaderActions.batchProgress.tested}/
                      {
                        modelEvaluatorHeaderActions.batchProgress
                          .total
                      }{' '}
                      <span className="text-green-500">
                        {modelEvaluatorHeaderActions.batchProgress.succeeded}{' '}
                        成功
                      </span>
                      {modelEvaluatorHeaderActions.batchProgress.failed >
                        0 && (
                        <>
                          {' '}
                          <span className="text-red-400">
                            {modelEvaluatorHeaderActions.batchProgress.failed}{' '}
                            失敗
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

