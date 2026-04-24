'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Key, FlaskConical, ScanText, BookMarked, Trophy, Bot,
  Loader2, RefreshCw, Trash2, ShieldCheck, Upload, Download, Play, Route, X,
} from 'lucide-react';
import {
  PromptManagerModal,
  PROMPT_LOAD_MESSAGE_TYPE,
} from '@/components/ai-settings/PromptManagerModal';

import { BottomSheetTabs, type SheetTabDef } from '@/components/ui/BottomSheetTabs';
import EnhancedTable from '@/components/ui/EnhancedTable';
import {
  createAdapterConfigColumns,
  formatAdapterSerial,
  type AdapterConfigDraftCell,
  type AdapterConfigTableRow,
} from './adapter-config-columns';
import {
  createModelRouterColumns,
  MODEL_ROUTER_ROWS,
  MODEL_ROUTER_TABLE_INITIAL_WIDTHS,
  MODEL_ROUTER_TABLE_MIN_WIDTH_PX,
  type ModelRouterRow,
} from './model-router-columns';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/Button';
import {
  ApiKeyManager,
  type ApiKeyManagerHandle,
  ModelEvaluator,
} from '@/components/ai-settings';
import { OcrSystemPromptPanel } from '@/components/ai-settings/OcrSystemPromptPanel';
import { LlmLeaderboardPanel } from '@/components/ai-settings/LlmLeaderboardPanel';
import { EvaluationsGlobalPanel } from './EvaluationsGlobalPanel';
import { buildEvaluationsGlobalRowsFromAdapterTables } from './evaluations-global-from-adapters';
import { mergeEvaluationsGlobalDbHistory } from './evaluations-global-merge-db';
import type { AdapterEvaluationGroupSummaryDto } from './adapter-evaluation-runs-types';
import type { EvaluationsGlobalTableRow } from './evaluations-global-columns';
import { useAISettings, type KeyValidationResult } from '@/lib/hooks/useAISettings';
import { listSavedPrompts } from '@/app/superadmin/settings/evaluations-global-test/promptActions';
import {
  getTotalAvailableModels,
  getSelectedCountInAvailable,
  getAvailableModelsListWithStaticFallback,
} from '@/lib/utils/total-available-models';
import { getProviderById, AI_PROVIDERS } from '@/lib/ai-providers';
import { getModelDisplayName } from '@/components/ai-settings/model-evaluator/utils';
import { SUPPORTED_AI_ENV_KEY_NAMES } from '@/lib/parse-env-keys';
import { ADAPTER_CONFIG_ITEMS, DEFAULT_ADAPTER_TEST_PROMPT } from '@/lib/adapter-config';
import { evaluateAdapterRun } from './adapter-evaluation';


type SettingsTab =
  | 'keys'
  | 'llm-leaderboard'
  | 'evaluations-global'
  | 'http-adapter-config'
  | 'model-router'
  | 'ocr';

const TAB_IDS: SettingsTab[] = [
  'keys',
  'llm-leaderboard',
  'evaluations-global',
  'http-adapter-config',
  'model-router',
  'ocr',
];

const LS_GLOBAL_PROMPT = 'ai-settings:globalTestPrompt';
const LS_SAVED_PROMPTS = 'ai-settings:savedPrompts';
const LS_LAST_PROMPT_NAME_BY_MODULE = 'ai-settings:lastPromptNameByModule';

type SavedPromptCategory = 'general' | 'ocr';

type SavedPrompt = {
  id: string;
  name: string;
  category: SavedPromptCategory;
  content: string;
  updatedAt: string;
};

type LastPromptNameByModule = Record<string, string>;

// Default evaluation prompt for OCR transcript parsing — kept at module level so
// readLocalStorage can reference it as a fallback before the component mounts.
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

function getTabFromHash(): SettingsTab | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1).toLowerCase();
  return (TAB_IDS as string[]).includes(hash) ? (hash as SettingsTab) : null;
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'keys', label: 'API 金鑰管理', icon: Key, description: '管理各 AI 服務提供商的 API 金鑰' },
  {
    id: 'llm-leaderboard',
    label: 'LLM Leader Board',
    icon: Trophy,
    description: 'Artificial Analysis LLM 排行榜（每日同步）',
  },
  {
    id: 'evaluations-global',
    label: 'AI 模型全域評測',
    icon: FlaskConical,
    description: '',
  },
  {
    id: 'http-adapter-config',
    label: 'HTTP Adapter調適',
    icon: Bot,
    description: '',
  },
  {
    id: 'model-router',
    label: 'Model Router',
    icon: Route,
    description: '',
  },
  { id: 'ocr', label: 'OCR解析設定', icon: ScanText, description: '設定 OCR 解析模型與參數' },
];

const ENV_IMPORT_TOOLTIP = `從 .env 或 JSON 導入\n支援兩種格式：\n• .env：KEY=value 或 export KEY=value\n• JSON：{"OPENAI_API_KEY":"sk-..."} 等頂層 key\n變數名大小寫不拘、拼寫需正確；僅下列金鑰會被辨識：${SUPPORTED_AI_ENV_KEY_NAMES.join('、')}`;

const OCR_HIDDEN_MODULE_KEYS = [
  'web_assistant',
  'contract_assistant',
  'blog_generator',
  'property_description',
  'ad_generator',
  'software_dev_engineer',
  'ttd_engineer',
];

/** Map each evaluator tab to its hidden module keys and optional statusLabelMode */
const EVALUATOR_TAB_CONFIG: Record<string, { hiddenModuleKeys: string[]; statusLabelMode?: 'vlm' | 'ocr' }> = {
  ocr: { hiddenModuleKeys: OCR_HIDDEN_MODULE_KEYS, statusLabelMode: 'ocr' },
};

/** Bottom sheet tab definitions for Excel-style navigation */
const SHEET_TABS: SheetTabDef[] = [
  { id: 'keys', label: 'API Keys', zhLabel: 'API 金鑰管理', icon: Key, color: 'text-amber-600', activeColor: 'bg-amber-600 text-white' },
  {
    id: 'llm-leaderboard',
    label: 'Leaderboard',
    zhLabel: 'LLM Leader Board',
    icon: Trophy,
    color: 'text-violet-600',
    activeColor: 'bg-violet-600 text-white',
  },
  {
    id: 'evaluations-global',
    label: '',
    zhLabel: 'AI 模型全域評測',
    icon: FlaskConical,
    color: 'text-emerald-600',
    activeColor: 'bg-emerald-600 text-white',
  },
  {
    id: 'http-adapter-config',
    label: '',
    zhLabel: 'LLM Http Adapter調適',
    icon: Bot,
    color: 'text-indigo-600',
    activeColor: 'bg-indigo-600 text-white',
  },
  {
    id: 'model-router',
    label: 'Model Router',
    zhLabel: '模型路由策略',
    icon: Route,
    color: 'text-cyan-600',
    activeColor: 'bg-cyan-600 text-white',
  },
  { id: 'ocr', label: 'OCR', zhLabel: 'OCR解析設定', icon: ScanText, color: 'text-blue-600', activeColor: 'bg-blue-600 text-white' },
];

const ADAPTER_PROVIDER_LABEL: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  codex: 'Codex',
  kilo: 'Kilo',
  opencode: 'OpenCode',
  ollama_cloud: 'Ollama Cloud',
  ollama_local: 'Ollama Local',
};

type AdapterRunStatus = 'idle' | 'running' | 'paused' | 'stopped';

type AdapterConfigDraft = AdapterConfigDraftCell;
type AdapterPromptOption = { id: string; label: string; content: string };

const LS_ADAPTER_RUN_SNAPSHOT = 'ai-settings:adapter-run-snapshot';
const LS_HTTP_ADAPTER_RUN_SNAPSHOT = 'ai-settings:http-adapter-run-snapshot';
const ADAPTER_RESULTS_MODULE_KEY = 'adapter_config_test_results';

const HTTP_ADAPTER_CONFIG_TABLE_ID = 'ai-settings-http-adapter-config-v1';
const HTTP_ADAPTER_CONFIG_TABLE_INITIAL_WIDTHS = [4, 7, 10, 14, 8, 10, 8, 14, 13, 12, 6, 6, 6, 6, 5, 8, 7];
const HTTP_ADAPTER_CONFIG_TABLE_MIN_WIDTH_PX = 3200;

const MAX_ADAPTER_RUN_NOTICES = 40;

type AdapterRunNoticeEntry = {
  id: string;
  at: string;
  severity: 'error' | 'warn';
  adapterLabel: string;
  message: string;
};

type AdapterRunSnapshot = Record<
  string,
  Pick<
    AdapterConfigDraft,
    'outputLines' | 'renderedOutput' | 'requestedModel' | 'effectiveModel' | 'modelSource' | 'commandPreview' | 'runCount'
  >
>;

function createDefaultAdapterDraft(
  model: string,
  snapshot?: Partial<AdapterRunSnapshot[string]>
): AdapterConfigDraft {
  return {
    promptText: DEFAULT_ADAPTER_TEST_PROMPT,
    selectedPromptId: '',
    testFileName: '',
    testFile: null,
    runStartedAtMs: null,
    runStatus: 'idle',
    logCursor: 0,
    pid: null,
    commandPreview: snapshot?.commandPreview ?? '',
    renderedOutput: snapshot?.renderedOutput ?? '',
    requestedModel: snapshot?.requestedModel ?? model,
    effectiveModel: snapshot?.effectiveModel ?? '',
    modelSource: snapshot?.modelSource ?? '',
    outputLines: snapshot?.outputLines ?? [],
    runCount: snapshot?.runCount ?? 0,
    ttftMs: null,
    e2eLatencyMs: null,
    tokensPerSec: null,
    httpStatus: null,
    retryCount: 0,
    errorType: '',
    successRateRecent: null,
  };
}

function formatAdapterNoticeTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function quoteCliArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

/** While a bulk run is active: show elapsed seconds (1 decimal) */
function BulkRunElapsed({ startMs }: { startMs: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [startMs]);
  return (
    <span className="tabular-nums font-mono text-xs font-semibold" aria-live="polite">
      {((Date.now() - startMs) / 1000).toFixed(1)}s
    </span>
  );
}

function isAdapterRunActive(status: AdapterRunStatus | undefined): boolean {
  return status === 'running' || status === 'paused';
}

/**
 * Bulk run: only resolves after all rows are no longer active (not running / not paused).
 * startAdapterRun only waits for "start" to complete, so the batch must additionally poll until idle/stopped.
 */
function waitForAllAdapterRunsSettled(
  getDrafts: () => Record<string, AdapterConfigDraft>,
  pollMs = 400
): Promise<void> {
  return new Promise((resolve) => {
    const step = () => {
      const drafts = getDrafts();
      const anyActive = ADAPTER_CONFIG_ITEMS.some((item) =>
        isAdapterRunActive(drafts[item.id]?.runStatus)
      );
      if (!anyActive) {
        resolve();
        return;
      }
      setTimeout(step, pollMs);
    };
    step();
  });
}

function buildAdapterCommand(
  item: (typeof ADAPTER_CONFIG_ITEMS)[number],
  draft: AdapterConfigDraft
): string {
  const prompt = draft.promptText.trim() || DEFAULT_ADAPTER_TEST_PROMPT;
  const promptArg = quoteCliArg(prompt);
  const fileArg = draft.testFileName ? quoteCliArg(draft.testFileName) : '';
  if (item.provider === 'claude') {
    return draft.testFileName
      ? `cat ${fileArg} | claude --model ${item.model} -p ${promptArg}`
      : `claude --model ${item.model} -p ${promptArg}`;
  }
  if (item.provider === 'codex') {
    return `codex exec -m ${item.model} ${promptArg}`;
  }
  if (item.provider === 'gemini') {
    return `agent --model ${item.model} -p ${promptArg}`;
  }
  if (item.provider === 'kilo') {
    return draft.testFileName
      ? `kilo -m ${item.model} run -f ${fileArg} ${promptArg}`
      : `kilo -m ${item.model} run ${promptArg}`;
  }
  if (item.provider === 'opencode') {
    return draft.testFileName
      ? `opencode -m ${item.model} run -f ${fileArg} ${promptArg}`
      : `opencode -m ${item.model} run ${promptArg}`;
  }
  if (item.provider === 'ollama_cloud' || item.provider === 'ollama_local') {
    /**
     * Cloud vs local both go through the local `ollama` binary; the model slug's `:cloud`
     * suffix signals the daemon to proxy to ollama.com. `-f` is not supported.
     */
    return `ollama run ${item.model} ${promptArg}`;
  }
  return item.cliCommandTemplate.replace('<prompt>', prompt);
}


export default function AIServiceSettingsPage() {
  // Initialize with 'keys' on both SSR and first client render to avoid a
  // hydration mismatch — the useEffect below syncs from window.location.hash
  // after mount. Reading window.location.hash in the useState initializer
  // worked client-side but differed from SSR (which has no window), causing
  // React to regenerate the whole tree on hydration.
  const [activeTab, setActiveTab] = useState<SettingsTab>('keys');
  const [envImportButtonHover, setEnvImportButtonHover] = useState(false);
  const settings = useAISettings();
  const apiKeyHeaderActionsRef = useRef<{ setEnvImportOpen: (v: boolean) => void } | null>(null);
  const apiKeyManagerRef = useRef<ApiKeyManagerHandle | null>(null);
  const [validateAllLoading, setValidateAllLoading] = useState(false);
  /** Per-key results after "validate all", so each card can show available models without re-validating */
  const [validateAllResultsByKeyId, setValidateAllResultsByKeyId] = useState<Record<string, KeyValidationResult>>({});
  /** Summary shown at the bottom of the keys tab after import+validate-all completes */
  const [validateSummary, setValidateSummary] = useState<{
    importedCount: number | null;
    successCount: number;
    successCloud: number;
    successLocal: number;
    failedProviders: string[];
    totalModels: number;
    perProviderModels: Array<{ name: string; count: number }>;
  } | null>(null);
  const keysRef = useRef(settings.keys);
  const [modelEvaluatorHeaderActions, setModelEvaluatorHeaderActions] = useState<{
    runBatchTest: () => void;
    abortBatchTest: () => void;
    batchTesting: boolean;
    canBatchTest: boolean;
    tooltip: string;
    batchProgress: { tested: number; total: number; succeeded: number; failed: number } | null;
    testableCount: number;
    batchTestableCount?: number;
    selectedCount: number;
    totalCount: number;
    filteredTotal: number;
    filteredSelectedCount: number;
    lastBatchTestSummary?: {
      selectedBeforeTest: number;
      total: number;
      succeeded: number;
      failed: number;
    } | null;
    hasRecentBatchReport?: boolean;
    openRecentBatchReport?: () => void;
    applyRecentBatchReport?: () => Promise<void>;
    applyingRecentBatchReport?: boolean;
  } | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  useEffect(() => {
    keysRef.current = settings.keys;
  }, [settings.keys]);

  // Model tabs: 全域評測 Prompt 與共用檔案（供 ModelEvaluator 使用）
  // DEFAULT_EVALUATION_PROMPT is defined at module level (see below)
  const [globalTestPrompt, setGlobalTestPrompt] = useState<string>(
    () => readLocalStorage(LS_GLOBAL_PROMPT, DEFAULT_EVALUATION_PROMPT)
  );
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(
    () => readLocalStorage<SavedPrompt[]>(LS_SAVED_PROMPTS, [])
  );
  const [promptFileName, setPromptFileName] = useState<string>('');
  const [lastPromptNameByModule, setLastPromptNameByModule] = useState<LastPromptNameByModule>(
    () => readLocalStorage<LastPromptNameByModule>(LS_LAST_PROMPT_NAME_BY_MODULE, {})
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedCloudPromptId, setSelectedCloudPromptId] = useState<string>('');
  // ── Persist globalTestPrompt to localStorage whenever it changes ──────────
  useEffect(() => {
    writeLocalStorage(LS_GLOBAL_PROMPT, globalTestPrompt);
  }, [globalTestPrompt]);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof window === 'undefined' || event.origin !== window.location.origin) return;
      if (event.data?.type !== PROMPT_LOAD_MESSAGE_TYPE || !event.data?.content) return;
      setGlobalTestPrompt(event.data.content);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  useEffect(() => {
    writeLocalStorage<SavedPrompt[]>(LS_SAVED_PROMPTS, savedPrompts);
  }, [savedPrompts]);
  useEffect(() => {
    writeLocalStorage<LastPromptNameByModule>(LS_LAST_PROMPT_NAME_BY_MODULE, lastPromptNameByModule);
  }, [lastPromptNameByModule]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  /** Ref to the hidden file-input used by the "Import settings" button */
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [exportingSettings, setExportingSettings] = useState(false);
  const [importingSettings, setImportingSettings] = useState(false);
  const [bulkStarting, setBulkStarting] = useState(false);
  const [httpBulkStarting, setHttpBulkStarting] = useState(false);
  const [httpBulkRunStartedAtMs, setHttpBulkRunStartedAtMs] = useState<number | null>(null);
  /** Evaluations Global bulk-run: run CLI bulk-run first, then HTTP bulk-run (same engine as both Adapter tables) */
  const [evalGlobalBulkStarting, setEvalGlobalBulkStarting] = useState(false);
  const [evalGlobalBulkRunStartedAtMs, setEvalGlobalBulkRunStartedAtMs] = useState<number | null>(null);
  /** Per-user adapter test history from `adapter_evaluation_runs` (merged into Evaluations Global rows) */
  const [evalGlobalDbSummaries, setEvalGlobalDbSummaries] = useState<AdapterEvaluationGroupSummaryDto[] | null>(null);
  const [httpBulkToast, setHttpBulkToast] = useState<string | null>(null);
  const httpBulkToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adapterRunNotices, setAdapterRunNotices] = useState<AdapterRunNoticeEntry[]>([]);
  const [adapterConfigDrafts, setAdapterConfigDrafts] = useState<Record<string, AdapterConfigDraft>>(() =>
    {
      const persistedSnapshot = readLocalStorage<AdapterRunSnapshot>(LS_ADAPTER_RUN_SNAPSHOT, {});
      return Object.fromEntries(
        ADAPTER_CONFIG_ITEMS.map((item) => [
          item.id,
          createDefaultAdapterDraft(item.model, persistedSnapshot[item.id]),
        ])
      );
    }
  );
  const [httpAdapterConfigDrafts, setHttpAdapterConfigDrafts] = useState<Record<string, AdapterConfigDraft>>(() =>
    {
      const persistedSnapshot = readLocalStorage<AdapterRunSnapshot>(LS_HTTP_ADAPTER_RUN_SNAPSHOT, {});
      return Object.fromEntries(
        ADAPTER_CONFIG_ITEMS.map((item) => [
          item.id,
          createDefaultAdapterDraft(item.model, persistedSnapshot[item.id]),
        ])
      );
    }
  );
  const [adapterPromptOptions, setAdapterPromptOptions] = useState<AdapterPromptOption[]>([]);
  const adapterPollIntervalRefs = useRef<Record<string, ReturnType<typeof setInterval> | null>>({});
  const httpAdapterPollIntervalRefs = useRef<Record<string, ReturnType<typeof setInterval> | null>>({});
  const httpAdapterFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const adapterDraftsRef = useRef(adapterConfigDrafts);
  const httpAdapterDraftsRef = useRef(httpAdapterConfigDrafts);
  const prevAdapterRunStatusRef = useRef<Record<string, AdapterRunStatus>>({});
  const prevHttpAdapterRunStatusRef = useRef<Record<string, AdapterRunStatus>>({});
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (httpBulkToastTimerRef.current) clearTimeout(httpBulkToastTimerRef.current);
    };
  }, []);

  const appendAdapterRunNotice = useCallback((entry: Omit<AdapterRunNoticeEntry, 'id' | 'at'>) => {
    setAdapterRunNotices((prev) => {
      const row: AdapterRunNoticeEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: new Date().toISOString(),
        ...entry,
      };
      return [row, ...prev].slice(0, MAX_ADAPTER_RUN_NOTICES);
    });
  }, []);
  const adapterConfigGroups = useMemo(() => {
    const grouped = new Map<string, typeof ADAPTER_CONFIG_ITEMS>();
    for (const item of ADAPTER_CONFIG_ITEMS) {
      const arr = grouped.get(item.provider) ?? [];
      grouped.set(item.provider, [...arr, item]);
    }
    return Array.from(grouped.entries());
  }, []);

  useEffect(() => {
    adapterDraftsRef.current = adapterConfigDrafts;
  }, [adapterConfigDrafts]);
  useEffect(() => {
    httpAdapterDraftsRef.current = httpAdapterConfigDrafts;
  }, [httpAdapterConfigDrafts]);
  const promptOptions = adapterPromptOptions;

  useEffect(() => {
    setAdapterConfigDrafts((prev) => {
      const next = { ...prev };
      for (const item of ADAPTER_CONFIG_ITEMS) {
        if (!next[item.id]) {
          next[item.id] = createDefaultAdapterDraft(item.model);
        }
      }
      return next;
    });
    setHttpAdapterConfigDrafts((prev) => {
      const next = { ...prev };
      for (const item of ADAPTER_CONFIG_ITEMS) {
        if (!next[item.id]) {
          next[item.id] = createDefaultAdapterDraft(item.model);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const snapshot = Object.fromEntries(
      Object.entries(adapterConfigDrafts).map(([adapterId, draft]) => [
        adapterId,
        {
          outputLines: draft.outputLines,
          renderedOutput: draft.renderedOutput,
          requestedModel: draft.requestedModel,
          effectiveModel: draft.effectiveModel,
          modelSource: draft.modelSource,
          commandPreview: draft.commandPreview,
          runCount: draft.runCount,
        },
      ])
    ) as AdapterRunSnapshot;
    writeLocalStorage(LS_ADAPTER_RUN_SNAPSHOT, snapshot);
  }, [adapterConfigDrafts]);
  useEffect(() => {
    const snapshot = Object.fromEntries(
      Object.entries(httpAdapterConfigDrafts).map(([adapterId, draft]) => [
        adapterId,
        {
          outputLines: draft.outputLines,
          renderedOutput: draft.renderedOutput,
          requestedModel: draft.requestedModel,
          effectiveModel: draft.effectiveModel,
          modelSource: draft.modelSource,
          commandPreview: draft.commandPreview,
          runCount: draft.runCount,
        },
      ])
    ) as AdapterRunSnapshot;
    writeLocalStorage(LS_HTTP_ADAPTER_RUN_SNAPSHOT, snapshot);
  }, [httpAdapterConfigDrafts]);

  useEffect(() => {
    const cloudModule = settings.modules.find((m) => m.module_key === ADAPTER_RESULTS_MODULE_KEY);
    const cloudSnapshot = (cloudModule?.config?.adapterSnapshots ?? null) as AdapterRunSnapshot | null;
    const cloudHttpSnapshot = (cloudModule?.config?.httpAdapterSnapshots ?? null) as AdapterRunSnapshot | null;
    if (cloudSnapshot && typeof cloudSnapshot === 'object') {
      setAdapterConfigDrafts((prev) => {
        const next = { ...prev };
        for (const item of ADAPTER_CONFIG_ITEMS) {
          const snap = cloudSnapshot[item.id];
          if (!snap) continue;
          const current = next[item.id];
          if (!current) continue;
          next[item.id] = {
            ...current,
            outputLines: Array.isArray(snap.outputLines) ? snap.outputLines.slice(-120) : current.outputLines,
            renderedOutput: typeof snap.renderedOutput === 'string' ? snap.renderedOutput : current.renderedOutput,
            requestedModel: typeof snap.requestedModel === 'string' ? snap.requestedModel : current.requestedModel,
            effectiveModel: typeof snap.effectiveModel === 'string' ? snap.effectiveModel : current.effectiveModel,
            modelSource: typeof snap.modelSource === 'string' ? snap.modelSource : current.modelSource,
            commandPreview: typeof snap.commandPreview === 'string' ? snap.commandPreview : current.commandPreview,
            runCount: typeof snap.runCount === 'number' ? snap.runCount : current.runCount,
            runStartedAtMs: null,
            runStatus: 'stopped',
            pid: null,
            logCursor: 0,
          };
        }
        return next;
      });
    }
    if (!cloudHttpSnapshot || typeof cloudHttpSnapshot !== 'object') return;
    setHttpAdapterConfigDrafts((prev) => {
      const next = { ...prev };
      for (const item of ADAPTER_CONFIG_ITEMS) {
        const snap = cloudHttpSnapshot[item.id];
        if (!snap) continue;
        const current = next[item.id];
        if (!current) continue;
        next[item.id] = {
          ...current,
          outputLines: Array.isArray(snap.outputLines) ? snap.outputLines.slice(-120) : current.outputLines,
          renderedOutput: typeof snap.renderedOutput === 'string' ? snap.renderedOutput : current.renderedOutput,
          requestedModel: typeof snap.requestedModel === 'string' ? snap.requestedModel : current.requestedModel,
          effectiveModel: typeof snap.effectiveModel === 'string' ? snap.effectiveModel : current.effectiveModel,
          modelSource: typeof snap.modelSource === 'string' ? snap.modelSource : current.modelSource,
          commandPreview: typeof snap.commandPreview === 'string' ? snap.commandPreview : current.commandPreview,
          runCount: typeof snap.runCount === 'number' ? snap.runCount : current.runCount,
          runStartedAtMs: null,
          runStatus: 'stopped',
          pid: null,
          logCursor: 0,
        };
      }
      return next;
    });
  }, [settings.modules]);

  useEffect(() => {
    if (!settings.userId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      const snapshot = Object.fromEntries(
        Object.entries(adapterDraftsRef.current).map(([adapterId, draft]) => [
          adapterId,
          {
            outputLines: draft.outputLines.slice(-120),
            renderedOutput: draft.renderedOutput,
            requestedModel: draft.requestedModel,
            effectiveModel: draft.effectiveModel,
            modelSource: draft.modelSource,
            commandPreview: draft.commandPreview,
            runCount: draft.runCount,
          },
        ])
      ) as AdapterRunSnapshot;
      const httpSnapshot = Object.fromEntries(
        Object.entries(httpAdapterDraftsRef.current).map(([adapterId, draft]) => [
          adapterId,
          {
            outputLines: draft.outputLines.slice(-120),
            renderedOutput: draft.renderedOutput,
            requestedModel: draft.requestedModel,
            effectiveModel: draft.effectiveModel,
            modelSource: draft.modelSource,
            commandPreview: draft.commandPreview,
            runCount: draft.runCount,
          },
        ])
      ) as AdapterRunSnapshot;
      try {
        await settings.saveModule(
          ADAPTER_RESULTS_MODULE_KEY,
          true,
          [],
          undefined,
          {
            adapterSnapshots: snapshot,
            httpAdapterSnapshots: httpSnapshot,
            updatedAt: new Date().toISOString(),
          }
        );
      } catch {
        // silent; local snapshot already persisted
      }
    }, 1500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [adapterConfigDrafts, httpAdapterConfigDrafts, settings.userId, settings.saveModule]);

  useEffect(() => {
    let mounted = true;
    const loadPromptOptions = async () => {
      const result = await listSavedPrompts();
      if (!mounted) return;
      if (result.error || !result.data) {
        setAdapterPromptOptions([]);
        return;
      }
      setAdapterPromptOptions(
        result.data.map((prompt) => ({
          id: prompt.id,
          label: prompt.name,
          content: prompt.content,
        }))
      );
    };
    void loadPromptOptions();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const key of Object.keys(adapterPollIntervalRefs.current)) {
        const timer = adapterPollIntervalRefs.current[key];
        if (timer) {
          clearInterval(timer);
        }
      }
      for (const key of Object.keys(httpAdapterPollIntervalRefs.current)) {
        const timer = httpAdapterPollIntervalRefs.current[key];
        if (timer) {
          clearInterval(timer);
        }
      }
    };
  }, []);

  type AdapterRunApiResponse = {
    success: boolean;
    message?: string;
    status: AdapterRunStatus;
    logs: string[];
    cursor: number;
    command: string;
    pid: number | null;
    resultText: string;
    requestedModel: string;
    effectiveModel: string;
    modelSource: string;
    ttftMs?: number | null;
    e2eLatencyMs?: number | null;
    tokensPerSec?: number | null;
    httpStatus?: number | null;
    retryCount?: number;
    errorType?: string;
    successRateRecent?: number | null;
  };

  const stopAdapterPolling = useCallback((adapterId: string, mode: 'cli' | 'http' = 'cli') => {
    const ref = mode === 'http' ? httpAdapterPollIntervalRefs.current : adapterPollIntervalRefs.current;
    const timer = ref[adapterId];
    if (timer) {
      clearInterval(timer);
      ref[adapterId] = null;
    }
  }, []);

  const pollAdapterRun = useCallback(async (adapterId: string, mode: 'cli' | 'http' = 'cli') => {
    const draftsRef = mode === 'http' ? httpAdapterDraftsRef : adapterDraftsRef;
    const setDrafts = mode === 'http' ? setHttpAdapterConfigDrafts : setAdapterConfigDrafts;
    const draft = draftsRef.current[adapterId];
    if (!draft) return;
    const res = await fetch(`/api/ai-settings/adapter-runs?adapterId=${encodeURIComponent(adapterId)}&cursor=${draft.logCursor}&mode=${mode}`);
    const data = await res.json() as AdapterRunApiResponse;
    if (!data.success) return;
    setDrafts((prev) => {
      const current = prev[adapterId];
      if (!current) return prev;
      const nextStatus = data.status;
      if (nextStatus === 'idle' || nextStatus === 'stopped') {
        stopAdapterPolling(adapterId, mode);
      }
      let runStartedAtMs = current.runStartedAtMs;
      if (nextStatus === 'running') {
        runStartedAtMs = runStartedAtMs ?? Date.now();
      } else if (nextStatus === 'idle' || nextStatus === 'stopped') {
        runStartedAtMs = null;
      }
      return {
        ...prev,
        [adapterId]: {
          ...current,
          runStatus: nextStatus,
          runStartedAtMs,
          commandPreview: data.command || current.commandPreview,
          pid: data.pid ?? null,
          logCursor: data.cursor,
          outputLines: [...current.outputLines, ...data.logs].slice(-120),
          renderedOutput: data.resultText || current.renderedOutput,
          requestedModel: data.requestedModel || current.requestedModel,
          effectiveModel: data.effectiveModel || current.effectiveModel,
          modelSource: data.modelSource || current.modelSource,
          ttftMs: data.ttftMs ?? current.ttftMs,
          e2eLatencyMs: data.e2eLatencyMs ?? current.e2eLatencyMs,
          tokensPerSec: data.tokensPerSec ?? current.tokensPerSec,
          httpStatus: data.httpStatus ?? current.httpStatus,
          retryCount: data.retryCount ?? current.retryCount,
          errorType: data.errorType ?? current.errorType,
          successRateRecent: data.successRateRecent ?? current.successRateRecent,
        },
      };
    });
  }, [stopAdapterPolling]);

  const startAdapterPolling = useCallback((adapterId: string, mode: 'cli' | 'http' = 'cli') => {
    stopAdapterPolling(adapterId, mode);
    const timer = setInterval(() => {
      void pollAdapterRun(adapterId, mode);
    }, 1500);
    if (mode === 'http') {
      httpAdapterPollIntervalRefs.current[adapterId] = timer;
      return;
    }
    adapterPollIntervalRefs.current[adapterId] = timer;
  }, [pollAdapterRun, stopAdapterPolling]);

  const startAdapterRun = useCallback(async (
    item: (typeof ADAPTER_CONFIG_ITEMS)[number],
    draft: AdapterConfigDraft,
    mode: 'cli' | 'http' = 'cli'
  ) => {
    const setDrafts = mode === 'http' ? setHttpAdapterConfigDrafts : setAdapterConfigDrafts;
    const form = new FormData();
    form.append('adapterId', item.id);
    form.append('provider', item.provider);
    form.append('model', item.model);
    form.append('mode', mode);
    form.append('prompt', draft.promptText.trim() || DEFAULT_ADAPTER_TEST_PROMPT);
    if (draft.testFile) form.append('file', draft.testFile);
    const res = await fetch('/api/ai-settings/adapter-runs', {
      method: 'POST',
      body: form,
    });
    let data: AdapterRunApiResponse;
    try {
      data = await res.json() as typeof data;
    } catch {
      appendAdapterRunNotice({
        severity: 'error',
        adapterLabel: item.optionLabel,
        message: res.ok ? '啟動失敗（回應無法解析）' : `啟動失敗（HTTP ${res.status}）`,
      });
      return;
    }
    if (!res.ok || !data.success) {
      appendAdapterRunNotice({
        severity: 'error',
        adapterLabel: item.optionLabel,
        message: typeof data.message === 'string' && data.message.trim()
          ? data.message
          : `啟動失敗${!res.ok ? `（HTTP ${res.status}）` : ''}`,
      });
      return;
    }
    const running = data.status === 'running';
    setDrafts((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        runStatus: data.status,
        runStartedAtMs: running ? Date.now() : null,
        runCount: (prev[item.id]?.runCount ?? 0) + 1,
        outputLines: data.logs ?? [],
        logCursor: data.cursor ?? 0,
        commandPreview: data.command ?? '',
        pid: data.pid ?? null,
        renderedOutput: data.resultText ?? '',
        requestedModel: data.requestedModel ?? item.model,
        effectiveModel: data.effectiveModel ?? '',
        modelSource: data.modelSource ?? '',
        ttftMs: data.ttftMs ?? null,
        e2eLatencyMs: data.e2eLatencyMs ?? null,
        tokensPerSec: data.tokensPerSec ?? null,
        httpStatus: data.httpStatus ?? null,
        retryCount: data.retryCount ?? 0,
        errorType: data.errorType ?? '',
        successRateRecent: data.successRateRecent ?? null,
      },
    }));
    startAdapterPolling(item.id, mode);
  }, [appendAdapterRunNotice, startAdapterPolling]);

  const controlAdapterRun = useCallback(async (
    adapterId: string,
    action: 'pause' | 'resume' | 'stop',
    mode: 'cli' | 'http' = 'cli'
  ) => {
    const setDrafts = mode === 'http' ? setHttpAdapterConfigDrafts : setAdapterConfigDrafts;
    const res = await fetch('/api/ai-settings/adapter-runs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapterId, action, mode }),
    });
    let data: AdapterRunApiResponse;
    try {
      data = await res.json() as typeof data;
    } catch {
      const item = ADAPTER_CONFIG_ITEMS.find((i) => i.id === adapterId);
      appendAdapterRunNotice({
        severity: 'error',
        adapterLabel: item?.optionLabel ?? adapterId,
        message: res.ok ? '操作失敗（回應無法解析）' : `操作失敗（HTTP ${res.status}）`,
      });
      return;
    }
    if (!res.ok || !data.success) {
      const item = ADAPTER_CONFIG_ITEMS.find((i) => i.id === adapterId);
      appendAdapterRunNotice({
        severity: 'error',
        adapterLabel: item?.optionLabel ?? adapterId,
        message: typeof data.message === 'string' && data.message.trim()
          ? data.message
          : `操作失敗${!res.ok ? `（HTTP ${res.status}）` : ''}`,
      });
      return;
    }
    setDrafts((prev) => {
      const current = prev[adapterId];
      if (!current) return prev;
      const nextStatus = data.status;
      let runStartedAtMs = current.runStartedAtMs;
      if (nextStatus === 'running') {
        runStartedAtMs = runStartedAtMs ?? Date.now();
      } else if (nextStatus === 'idle' || nextStatus === 'stopped') {
        runStartedAtMs = null;
      }
      return {
        ...prev,
        [adapterId]: {
          ...current,
          runStatus: nextStatus,
          runStartedAtMs,
          outputLines: data.logs ?? current.outputLines,
          logCursor: data.cursor ?? current.logCursor,
          commandPreview: data.command ?? current.commandPreview,
          pid: data.pid ?? current.pid,
          renderedOutput: data.resultText || current.renderedOutput,
          requestedModel: data.requestedModel || current.requestedModel,
          effectiveModel: data.effectiveModel || current.effectiveModel,
          modelSource: data.modelSource || current.modelSource,
          ttftMs: data.ttftMs ?? current.ttftMs,
          e2eLatencyMs: data.e2eLatencyMs ?? current.e2eLatencyMs,
          tokensPerSec: data.tokensPerSec ?? current.tokensPerSec,
          httpStatus: data.httpStatus ?? current.httpStatus,
          retryCount: data.retryCount ?? current.retryCount,
          errorType: data.errorType ?? current.errorType,
          successRateRecent: data.successRateRecent ?? current.successRateRecent,
        },
      };
    });
    if (action === 'stop') {
      stopAdapterPolling(adapterId, mode);
    } else {
      startAdapterPolling(adapterId, mode);
    }
  }, [appendAdapterRunNotice, startAdapterPolling, stopAdapterPolling]);

  useEffect(() => {
    for (const item of ADAPTER_CONFIG_ITEMS) {
      const draft = adapterConfigDrafts[item.id];
      if (!draft) continue;
      const cur = draft.runStatus;
      const prev = prevAdapterRunStatusRef.current[item.id];
      if (
        prev !== undefined &&
        prev === 'running' &&
        (cur === 'stopped' || cur === 'idle')
      ) {
        const requested = (draft.requestedModel?.trim() || item.model).trim();
        const effective = (draft.effectiveModel?.trim() || '').trim();
        const evaluation = evaluateAdapterRun({
          requestedModel: requested,
          effectiveModel: effective,
          renderedOutput: draft.renderedOutput,
          outputLines: draft.outputLines,
          errorType: draft.errorType,
          httpStatus: draft.httpStatus,
        });
        if (evaluation.level === 'fail' || evaluation.level === 'warning') {
          appendAdapterRunNotice({
            severity: evaluation.level === 'fail' ? 'error' : 'warn',
            adapterLabel: item.optionLabel,
            message: evaluation.message,
          });
        }
      }
      prevAdapterRunStatusRef.current[item.id] = cur;
    }
  }, [adapterConfigDrafts, appendAdapterRunNotice]);

  useEffect(() => {
    for (const item of ADAPTER_CONFIG_ITEMS) {
      const draft = httpAdapterConfigDrafts[item.id];
      if (!draft) continue;
      const cur = draft.runStatus;
      const prev = prevHttpAdapterRunStatusRef.current[item.id];
      if (
        prev !== undefined &&
        prev === 'running' &&
        (cur === 'stopped' || cur === 'idle')
      ) {
        const requested = (draft.requestedModel?.trim() || item.model).trim();
        const effective = (draft.effectiveModel?.trim() || '').trim();
        const evaluation = evaluateAdapterRun({
          requestedModel: requested,
          effectiveModel: effective,
          renderedOutput: draft.renderedOutput,
          outputLines: draft.outputLines,
          errorType: draft.errorType,
          httpStatus: draft.httpStatus,
        });
        if (evaluation.level === 'fail' || evaluation.level === 'warning') {
          appendAdapterRunNotice({
            severity: evaluation.level === 'fail' ? 'error' : 'warn',
            adapterLabel: `${item.optionLabel}（HTTP）`,
            message: evaluation.message,
          });
        }
      }
      prevHttpAdapterRunStatusRef.current[item.id] = cur;
    }
  }, [httpAdapterConfigDrafts, appendAdapterRunNotice]);

  const runAllAdapters = useCallback(async () => {
    if (bulkStarting) return;
    setBulkStarting(true);
    try {
      const drafts = adapterDraftsRef.current;
      const tasks = ADAPTER_CONFIG_ITEMS.map(async (item) => {
        const draft = drafts[item.id];
        if (!draft) return;
        if (draft.runStatus === 'running') return;
        await startAdapterRun(item, draft, 'cli');
      });
      await Promise.allSettled(tasks);
      await new Promise((r) => setTimeout(r, 0));
      await waitForAllAdapterRunsSettled(() => adapterDraftsRef.current);
    } finally {
      setBulkStarting(false);
    }
  }, [bulkStarting, startAdapterRun]);
  const runAllHttpAdapters = useCallback(async () => {
    if (httpBulkStarting) return;
    setHttpBulkStarting(true);
    setHttpBulkRunStartedAtMs(Date.now());
    const beforeRunCountById = Object.fromEntries(
      ADAPTER_CONFIG_ITEMS.map((item) => [item.id, httpAdapterDraftsRef.current[item.id]?.runCount ?? 0])
    ) as Record<string, number>;
    const draftsAtBatchStart = httpAdapterDraftsRef.current;
    try {
      const drafts = draftsAtBatchStart;
      const tasks = ADAPTER_CONFIG_ITEMS.map(async (item) => {
        const draft = drafts[item.id];
        if (!draft) return;
        if (draft.runStatus === 'running') return;
        await startAdapterRun(item, draft, 'http');
      });
      await Promise.allSettled(tasks);
      await new Promise((resolve) => setTimeout(resolve, 0));
      await waitForAllAdapterRunsSettled(() => httpAdapterDraftsRef.current);
      const attempted = ADAPTER_CONFIG_ITEMS.filter((item) => {
        const d = draftsAtBatchStart[item.id];
        if (!d) return false;
        if (d.runStatus === 'running') return false;
        return true;
      }).length;
      const started = ADAPTER_CONFIG_ITEMS.filter((item) => {
        const before = beforeRunCountById[item.id] ?? 0;
        const after = httpAdapterDraftsRef.current[item.id]?.runCount ?? before;
        return after > before;
      }).length;
      const failed = Math.max(0, attempted - started);
      const message = `HTTP 全測完成｜嘗試 ${attempted} 家、成功 ${started} 家、失敗 ${failed} 家`;
      setHttpBulkToast(message);
      if (httpBulkToastTimerRef.current) clearTimeout(httpBulkToastTimerRef.current);
      httpBulkToastTimerRef.current = setTimeout(() => {
        setHttpBulkToast(null);
        httpBulkToastTimerRef.current = null;
      }, 3500);
    } finally {
      setHttpBulkStarting(false);
      setHttpBulkRunStartedAtMs(null);
    }
  }, [httpBulkStarting, startAdapterRun]);

  const runCliThenHttpForEvaluationsGlobal = useCallback(async () => {
    if (evalGlobalBulkStarting || bulkStarting || httpBulkStarting) return;
    setEvalGlobalBulkStarting(true);
    setEvalGlobalBulkRunStartedAtMs(Date.now());
    try {
      await runAllAdapters();
      await runAllHttpAdapters();
    } finally {
      setEvalGlobalBulkStarting(false);
      setEvalGlobalBulkRunStartedAtMs(null);
    }
  }, [
    evalGlobalBulkStarting,
    bulkStarting,
    httpBulkStarting,
    runAllAdapters,
    runAllHttpAdapters,
  ]);

  /** Parse row ids like `${channel}-adapter-pass-${itemId}` and return the channel + adapter item id */
  const parseEvalGlobalRowId = useCallback(
    (id: string): { channel: 'cli' | 'http'; itemId: string } | null => {
      const CLI_PREFIX = 'cli-adapter-pass-';
      const HTTP_PREFIX = 'http-adapter-pass-';
      if (id.startsWith(CLI_PREFIX)) return { channel: 'cli', itemId: id.slice(CLI_PREFIX.length) };
      if (id.startsWith(HTTP_PREFIX)) return { channel: 'http', itemId: id.slice(HTTP_PREFIX.length) };
      return null;
    },
    [],
  );

  /** Evaluations Global: single-row "Run/Resume" dispatched to the underlying adapter run engine */
  const handleEvalGlobalRunRow = useCallback(
    async (row: EvaluationsGlobalTableRow) => {
      const parsed =
        row.adapterChannel && row.adapterItemId
          ? { channel: row.adapterChannel, itemId: row.adapterItemId }
          : parseEvalGlobalRowId(row.id);
      if (!parsed) {
        appendAdapterRunNotice({
          severity: 'warn',
          adapterLabel: row.companyName,
          message: '無法解析此列的 adapter id，請重新整理頁面後再試。',
        });
        return;
      }
      const item = ADAPTER_CONFIG_ITEMS.find((i) => i.id === parsed.itemId);
      if (!item) {
        appendAdapterRunNotice({
          severity: 'error',
          adapterLabel: row.companyName,
          message: `找不到 adapter 設定：${parsed.itemId}`,
        });
        return;
      }
      const draftsMap = parsed.channel === 'http' ? httpAdapterConfigDrafts : adapterConfigDrafts;
      const draft = draftsMap[item.id] ?? createDefaultAdapterDraft(item.model);
      try {
        await startAdapterRun(item, draft, parsed.channel);
      } catch (e) {
        appendAdapterRunNotice({
          severity: 'error',
          adapterLabel: item.optionLabel,
          message: e instanceof Error ? e.message : '啟動測試失敗（未預期錯誤）',
        });
      }
    },
    [adapterConfigDrafts, httpAdapterConfigDrafts, parseEvalGlobalRowId, startAdapterRun, appendAdapterRunNotice],
  );

  /** Evaluations Global: single-row "Pause/Resume/Stop" dispatched to the underlying adapter run engine */
  const handleEvalGlobalControlRow = useCallback(
    async (row: EvaluationsGlobalTableRow, action: 'pause' | 'resume' | 'stop') => {
      const parsed =
        row.adapterChannel && row.adapterItemId
          ? { channel: row.adapterChannel, itemId: row.adapterItemId }
          : parseEvalGlobalRowId(row.id);
      if (!parsed) return;
      await controlAdapterRun(parsed.itemId, action, parsed.channel);
    },
    [controlAdapterRun, parseEvalGlobalRowId],
  );

  const handleExportSettings = useCallback(async () => {
    setExportingSettings(true);
    try {
      const data = await settings.exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-settings-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '匯出失敗';
      if (typeof window !== 'undefined') window.alert(msg);
    } finally {
      setExportingSettings(false);
    }
  }, [settings]);

  const handleImportSettings = useCallback(async (file: File) => {
    setImportingSettings(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      await settings.importSettings(data);
      if (typeof window !== 'undefined') window.alert('載入設定成功！頁面資料已更新。');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '載入失敗，請確認檔案格式正確';
      if (typeof window !== 'undefined') window.alert(msg);
    } finally {
      setImportingSettings(false);
    }
  }, [settings]);

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

  // Only merge validation cache for keys that still exist; deleting keys will not keep stale cache entries.
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

  const getCategoryForTab = (tabId: SettingsTab): SavedPromptCategory => {
    switch (tabId) {
      case 'ocr':
        return 'ocr';
      case 'keys':
      case 'llm-leaderboard':
      case 'evaluations-global':
      default:
        return 'general';
    }
  };

  const currentPromptCategory = getCategoryForTab(activeTab);

  const handleSaveCurrentPrompt = async () => {
    const trimmed = globalTestPrompt.trim();
    if (!trimmed) {
      if (typeof window !== 'undefined') {
        window.alert('目前的 Prompt 為空白，無法儲存。');
      }
      return;
    }
    const rawFileName = promptFileName.trim();
    if (!rawFileName) {
      if (typeof window !== 'undefined') {
        window.alert('請先輸入要儲存的檔名。');
      }
      return;
    }
    if (typeof window === 'undefined') return;
    const moduleKey = getPromptModuleKeyForTab(activeTab);
    const name = rawFileName;
    const downloadFileName = rawFileName.endsWith('.txt') ? rawFileName : `${rawFileName}.txt`;
    try {
      const blob = new Blob([trimmed], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // 下載失敗不影響雲端儲存
       
      console.warn('[AI Settings] 下載 Prompt 檔案失敗', err);
    }
    try {
      await settings.savePrompt(
        moduleKey,
        'global_eval',
        trimmed,
        name
      );
      setLastPromptNameByModule((prev) => ({
        ...prev,
        [moduleKey]: name,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '儲存 Prompt 至雲端失敗，請稍後再試。';
      window.alert(msg);
      return;
    }
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: SavedPrompt[] = [
      ...savedPrompts,
      {
        id,
        name,
        category: currentPromptCategory,
        content: trimmed,
        updatedAt: new Date().toISOString(),
      },
    ];
    setSavedPrompts(next);
    setSelectedPromptId(id);
    window.alert('已將 Prompt 儲存至本機與雲端。');
  };

  const handleSelectSavedPrompt = (promptId: string) => {
    if (!promptId) {
      setSelectedPromptId(null);
      return;
    }
    const found = savedPrompts.find((p) => p.id === promptId);
    if (!found) return;
    setSelectedPromptId(found.id);
    setGlobalTestPrompt(found.content);
  };

  const handleDeleteSavedPrompt = (promptId: string) => {
    if (!promptId) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('確定要刪除此已儲存的 Prompt 嗎？此動作無法復原。');
      if (!confirmed) return;
    }
    setSavedPrompts((prev) => prev.filter((p) => p.id !== promptId));
    setSelectedPromptId((prev) => (prev === promptId ? null : prev));
  };

  const getPromptModuleKeyForTab = (tabId: SettingsTab): string => {
    switch (tabId) {
      case 'ocr':
        return 'eval_ocr_global_prompt';
      case 'keys':
      case 'llm-leaderboard':
      case 'evaluations-global':
      default:
        return 'eval_general_global_prompt';
    }
  };

  const getCurrentCloudPromptNameForActiveTab = (): string | null => {
    const moduleKey = getPromptModuleKeyForTab(activeTab);
    const candidates = settings.prompts.filter(
      (p) => p.module_key === moduleKey && p.provider === 'global_eval'
    );
    if (!candidates.length) return null;
    if (selectedCloudPromptId) {
      const found = candidates.find((p) => p.id === selectedCloudPromptId);
      if (found) return found.prompt_name;
    }
    return candidates[0]?.prompt_name ?? null;
  };

  const currentCloudPromptName = getCurrentCloudPromptNameForActiveTab();

  const handleDeletePromptFromSupabase = async () => {
    if (!selectedCloudPromptId) {
      if (typeof window !== 'undefined') {
        window.alert('請先從下拉選單選擇要刪除的 Prompt。');
      }
      return;
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('確定要刪除此雲端 Prompt 嗎？此動作無法復原。');
      if (!confirmed) return;
    }
    try {
      await settings.deletePrompt(selectedCloudPromptId);
      setSelectedCloudPromptId('');
    } catch (err) {
      if (typeof window !== 'undefined') {
        const msg = err instanceof Error ? err.message : '刪除失敗，請稍後再試。';
        window.alert(msg);
      }
    }
  };

  const runValidateAllKeys = useCallback(
    async (keys: typeof settings.keys, importedCount?: number) => {
      if (!keys.length) return;
      setValidateAllLoading(true);
      try {
        // Pass an empty apiKey; the server route now fetches + decrypts the
        // stored key by keyId (under server-side session auth) instead of
        // relying on a client-held decryptedKey.
        const results = await Promise.all(
          keys.map((key) =>
            settings.validateKey(
              key.provider,
              '',
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
        // Reset stale ModelEvaluator header cache so the page header uses
        // the freshly computed totalAvailableModels instead of stale totalCount.
        setModelEvaluatorHeaderActions(null);
        try {
          await settings.saveValidationSummary(successCount, totalModels);
        } catch (saveErr) {
          console.warn('[驗證全部金鑰] 組態概況寫入失敗，不影響驗證結果', saveErr);
        }
        // Local providers run on user's own infrastructure (not cloud APIs)
        const LOCAL_PROVIDER_IDS = new Set(['ollama_local']);
        const failedProviders = keys
          .filter((_, i) => !results[i]?.valid)
          .map((k) => getProviderById(k.provider as Parameters<typeof getProviderById>[0])?.name ?? k.provider);
        const successCloud = keys.filter((k, i) => results[i]?.valid && !LOCAL_PROVIDER_IDS.has(k.provider)).length;
        const successLocal = keys.filter((k, i) => results[i]?.valid && LOCAL_PROVIDER_IDS.has(k.provider)).length;
        const perProviderModels = Array.from(byProviderForTotal.entries()).map(([providerId, count]) => ({
          name: getProviderById(providerId as Parameters<typeof getProviderById>[0])?.name ?? providerId,
          count,
        }));
        setValidateSummary({
          importedCount: importedCount ?? null,
          successCount,
          successCloud,
          successLocal,
          failedProviders,
          totalModels,
          perProviderModels,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : '驗證全部金鑰時發生錯誤，請稍後再試';
        setValidateSummary({
          importedCount: null,
          successCount: 0,
          successCloud: 0,
          successLocal: 0,
          failedProviders: [msg],
          totalModels: 0,
          perProviderModels: [],
        });
      } finally {
        setValidateAllLoading(false);
      }
    },
    [settings]
  );

  // Memoize to prevent new array reference on every render — avoids triggering
  // allRows/handleBatchTest/headerActionsRef useEffect chain that causes infinite re-renders.
  const memoizedCurrentKeys = useMemo(
    () => settings.keys.map((k) => ({ id: k.id, provider: k.provider })),
    [settings.keys]
  );

  const adapterTableRows = useMemo((): AdapterConfigTableRow[] => {
    let serial = 0;
    const rows: AdapterConfigTableRow[] = [];
    for (const [provider, items] of adapterConfigGroups) {
      for (const item of items) {
        serial += 1;
        const draft =
          adapterConfigDrafts[item.id] ?? createDefaultAdapterDraft(item.model);
        rows.push({
          serialNo: serial,
          provider,
          item,
          draft,
          commandPreview: buildAdapterCommand(item, draft),
        });
      }
    }
    return rows;
  }, [adapterConfigGroups, adapterConfigDrafts]);
  const httpAdapterTableRows = useMemo((): AdapterConfigTableRow[] => {
    let serial = 0;
    const rows: AdapterConfigTableRow[] = [];
    for (const [provider, items] of adapterConfigGroups) {
      for (const item of items) {
        serial += 1;
        const draft = httpAdapterConfigDrafts[item.id] ?? createDefaultAdapterDraft(item.model);
        rows.push({
          serialNo: serial,
          provider,
          item,
          draft,
          commandPreview: `HTTP ${item.provider} ${item.model}`,
        });
      }
    }
    return rows;
  }, [adapterConfigGroups, httpAdapterConfigDrafts]);

  const evaluationsGlobalImportedRows = useMemo(
    () =>
      buildEvaluationsGlobalRowsFromAdapterTables(
        adapterTableRows,
        httpAdapterTableRows,
        ADAPTER_PROVIDER_LABEL,
      ),
    [adapterTableRows, httpAdapterTableRows],
  );

  const refreshEvalGlobalDbSummaries = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-settings/adapter-evaluation-runs?summary=1');
      if (!res.ok) return;
      const data = (await res.json()) as { summaries?: AdapterEvaluationGroupSummaryDto[] };
      setEvalGlobalDbSummaries(data.summaries ?? []);
    } catch {
      // ignore network errors
    }
  }, []);

  const evaluationsGlobalDisplayRows = useMemo(
    () => mergeEvaluationsGlobalDbHistory(evaluationsGlobalImportedRows, evalGlobalDbSummaries),
    [evaluationsGlobalImportedRows, evalGlobalDbSummaries],
  );

  useEffect(() => {
    if (activeTab !== 'evaluations-global') return;
    void refreshEvalGlobalDbSummaries();
    const id = setInterval(() => void refreshEvalGlobalDbSummaries(), 12000);
    return () => clearInterval(id);
  }, [activeTab, refreshEvalGlobalDbSummaries]);

  const httpAdapterConfigTableColumns = useMemo(
    () =>
      createAdapterConfigColumns({
        providerLabel: ADAPTER_PROVIDER_LABEL,
        promptOptions,
        adapterFileInputRefs: httpAdapterFileInputRefs,
        setAdapterConfigDrafts: setHttpAdapterConfigDrafts,
        startAdapterRun: (item, draft) => startAdapterRun(item, draft, 'http'),
        controlAdapterRun: (adapterId, action) => controlAdapterRun(adapterId, action, 'http'),
        showHttpMetrics: true,
      }),
    [promptOptions, startAdapterRun, controlAdapterRun],
  );
  const modelRouterColumns = useMemo(() => createModelRouterColumns(), []);

  const getAdapterConfigSearchValue = useCallback((row: AdapterConfigTableRow) => {
    const { item, draft, provider, serialNo } = row;
    return [
      formatAdapterSerial(serialNo),
      String(serialNo),
      ADAPTER_PROVIDER_LABEL[provider] ?? provider,
      item.optionLabel,
      item.model,
      item.id,
      draft.promptText,
      draft.renderedOutput,
      draft.requestedModel,
      draft.effectiveModel,
      draft.modelSource,
      ...draft.outputLines.slice(-40),
    ].join(' ');
  }, []);

  const getAdapterConfigCategoryValue = useCallback(
    (row: AdapterConfigTableRow) => ADAPTER_PROVIDER_LABEL[row.provider] ?? row.provider,
    [],
  );
  const getModelRouterSearchValue = useCallback((row: ModelRouterRow) => {
    return [
      row.id,
      row.scenario,
      row.owner,
      row.primaryModel,
      row.fallbackChain,
      row.triggerRule,
      row.status,
      row.notes,
    ].join(' ');
  }, []);
  const getModelRouterCategoryValue = useCallback((row: ModelRouterRow) => row.status, []);
  const adapterCompareSummary = useMemo(() => {
    const collect = (drafts: Record<string, AdapterConfigDraft>) => {
      const all = Object.values(drafts);
      const measured = all.filter((d) => d.e2eLatencyMs != null);
      const latency = measured
        .map((d) => d.e2eLatencyMs as number)
        .sort((a, b) => a - b);
      const ttft = measured
        .map((d) => d.ttftMs)
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);
      const p = (arr: number[], ratio: number) =>
        arr.length ? arr[Math.min(arr.length - 1, Math.floor((arr.length - 1) * ratio))] : null;
      const successCount = all.filter((d) => !!d.renderedOutput && !d.errorType).length;
      const timeoutCount = all.filter((d) => d.errorType === 'timeout').length;
      const serverErrCount = all.filter((d) => (d.httpStatus ?? 0) >= 500).length;
      const avgRetry = all.length
        ? all.reduce((sum, d) => sum + (d.retryCount ?? 0), 0) / all.length
        : 0;
      return {
        total: all.length,
        p50Latency: p(latency, 0.5),
        p95Latency: p(latency, 0.95),
        p50Ttft: p(ttft, 0.5),
        successRate: all.length ? successCount / all.length : 0,
        timeoutRate: all.length ? timeoutCount / all.length : 0,
        serverErrRate: all.length ? serverErrCount / all.length : 0,
        avgRetry,
      };
    };
    return {
      cli: collect(adapterConfigDrafts),
      http: collect(httpAdapterConfigDrafts),
    };
  }, [adapterConfigDrafts, httpAdapterConfigDrafts]);

  const renderAdapterRunNoticesColumn = () => (
    <div className="min-w-0 flex-1 border-t border-border-default pt-4 lg:max-w-md lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-text-primary">最近測試錯誤／警告</p>
        <button
          type="button"
          onClick={() => setAdapterRunNotices([])}
          disabled={adapterRunNotices.length === 0}
          className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-text-muted transition hover:bg-bg-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          清除
        </button>
      </div>
      {adapterRunNotices.length === 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
          尚無紀錄。啟動失敗、遠端操作失敗，或單次執行結束後評價為「不及格／模型不正確」時會列在此，方便對照（關閉彈窗後仍可回看）。
        </p>
      ) : (
        <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-0.5">
          {adapterRunNotices.map((n) => (
            <li
              key={n.id}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${
                n.severity === 'error'
                  ? 'border-rose-200 bg-rose-50/80 text-rose-900'
                  : 'border-amber-200 bg-amber-50/80 text-amber-950'
              }`}
            >
              <span className="font-medium text-text-secondary">{formatAdapterNoticeTime(n.at)}</span>
              <span className="text-text-muted"> · {n.adapterLabel}</span>
              <p className="mt-0.5 break-words">{n.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
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

    // --- Keys tab ---
    if (activeTab === 'keys') {
      return (
        <div className="space-y-4">
          <ApiKeyManager
            ref={apiKeyManagerRef}
            savedKeys={settings.keys}
            validateAllResultsByKeyId={validateAllResultsByKeyId}
            onSave={settings.saveKey}
            onDelete={settings.deleteKey}
            onValidate={async (provider, apiKey, keyId) => {
              const r = await settings.validateKey(provider, apiKey, keyId);
              if (keyId && r?.valid) setValidateAllResultsByKeyId((prev) => ({ ...prev, [keyId]: r }));
              return r;
            }}
            onRevealKey={settings.revealKey}
            headerActionsRef={apiKeyHeaderActionsRef}
            onBatchImportComplete={async (importedCount) => {
              // Use keys returned by refreshSilent directly. Relying on
              // keysRef.current was racy: the ref is synced to settings.keys
              // via useEffect after React re-renders, which hadn't flushed
              // when we fired validate-all — so validation hit the now-
              // deactivated previous rows (keyId-matched, no is_active filter)
              // and the freshly-inserted active rows stayed is_valid=NULL.
              const freshKeys = await settings.refreshSilent();
              await runValidateAllKeys(freshKeys, importedCount);
            }}
          />

          {/* Validate-all summary — shown at the bottom after import+validate completes */}
          {validateSummary && (
            <div className="rounded-base border border-green-500/30 bg-green-500/5 p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  {validateSummary.importedCount != null && validateSummary.importedCount > 0 && (
                    <div>
                      <p className="font-semibold text-green-400 mb-1">
                        匯入成功：共 {validateSummary.importedCount} 家金鑰
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-green-400 mb-1">
                      驗證完成：共 {validateSummary.successCount} 家通過
                      {validateSummary.failedProviders.length > 0 && (
                        <span className="ml-2 text-red-400 font-normal text-xs">
                          （失敗 {validateSummary.failedProviders.length} 家：{validateSummary.failedProviders.join('、')}）
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                      <span>☁️ 雲端：{validateSummary.successCloud} 家</span>
                      <span>🖥️ 地端：{validateSummary.successLocal} 家</span>
                    </div>
                  </div>
                  {validateSummary.perProviderModels.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-text-muted mb-1">各家可用模型數（共 {validateSummary.totalModels} 個）：</p>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {validateSummary.perProviderModels.map((p) => `${p.name}：${p.count} 個`).join('；')}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setValidateSummary(null)}
                  className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                  aria-label="關閉摘要"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'llm-leaderboard') {
      return <LlmLeaderboardPanel />;
    }

    if (activeTab === 'evaluations-global') {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <EvaluationsGlobalPanel
            importedRows={evaluationsGlobalDisplayRows}
            onBulkRunAllAdapters={() => {
              void runCliThenHttpForEvaluationsGlobal();
            }}
            bulkRunAllBusy={evalGlobalBulkStarting || bulkStarting || httpBulkStarting}
            bulkRunAllStartedAtMs={evalGlobalBulkStarting ? evalGlobalBulkRunStartedAtMs : null}
            onRunRow={handleEvalGlobalRunRow}
            onControlRow={handleEvalGlobalControlRow}
            onWidthPresetOverwriteSaved={focusEvaluationsGlobalTab}
          />
          <div className="shrink-0">{renderAdapterRunNoticesColumn()}</div>
        </div>
      );
    }

    if (activeTab === 'http-adapter-config') {
      const { cli, http } = adapterCompareSummary;
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="shrink-0 flex flex-col gap-3 rounded-base border border-dashed border-border-default bg-bg-secondary p-3 sm:p-4 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary">CLI vs HTTP 比較摘要（最近一輪）</p>
              <div className="mt-3 grid gap-2 text-[11px] text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
                <p>CLI P50/P95: <span className="font-mono">{Math.round(cli.p50Latency ?? 0)}/{Math.round(cli.p95Latency ?? 0)} ms</span></p>
                <p>HTTP P50/P95: <span className="font-mono">{Math.round(http.p50Latency ?? 0)}/{Math.round(http.p95Latency ?? 0)} ms</span></p>
                <p>CLI 成功率: <span className="font-mono">{Math.round(cli.successRate * 100)}%</span></p>
                <p>HTTP 成功率: <span className="font-mono">{Math.round(http.successRate * 100)}%</span></p>
                <p>CLI Timeout: <span className="font-mono">{Math.round(cli.timeoutRate * 100)}%</span></p>
                <p>HTTP Timeout: <span className="font-mono">{Math.round(http.timeoutRate * 100)}%</span></p>
                <p>CLI 5xx: <span className="font-mono">{Math.round(cli.serverErrRate * 100)}%</span></p>
                <p>HTTP 5xx: <span className="font-mono">{Math.round(http.serverErrRate * 100)}%</span></p>
                <p>CLI 平均重試: <span className="font-mono">{cli.avgRetry.toFixed(2)}</span></p>
                <p>HTTP 平均重試: <span className="font-mono">{http.avgRetry.toFixed(2)}</span></p>
                <p>CLI P50 TTFT: <span className="font-mono">{Math.round(cli.p50Ttft ?? 0)} ms</span></p>
                <p>HTTP P50 TTFT: <span className="font-mono">{Math.round(http.p50Ttft ?? 0)} ms</span></p>
              </div>
            </div>
            {renderAdapterRunNoticesColumn()}
          </div>
          <div className="min-h-0 flex-1">
            <EnhancedTable<AdapterConfigTableRow>
              tableId={HTTP_ADAPTER_CONFIG_TABLE_ID}
              columns={httpAdapterConfigTableColumns}
              data={httpAdapterTableRows}
              initialWidths={[...HTTP_ADAPTER_CONFIG_TABLE_INITIAL_WIDTHS]}
              minWidth={HTTP_ADAPTER_CONFIG_TABLE_MIN_WIDTH_PX}
              stretchToContainer={false}
              persistentHorizontalScrollbar
              getSearchValue={getAdapterConfigSearchValue}
              getCategoryValue={getAdapterConfigCategoryValue}
              extraToolbar={
                <button
                  type="button"
                  onClick={() => {
                    void runAllHttpAdapters();
                  }}
                  disabled={httpBulkStarting}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  title={
                    httpBulkStarting
                      ? '一鍵啟動全部 HTTP Adapter 測試（進行中）'
                      : '一鍵啟動全部 HTTP Adapter 測試'
                  }
                  aria-busy={httpBulkStarting}
                >
                  {httpBulkStarting && httpBulkRunStartedAtMs != null ? (
                    <>
                      <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
                      <BulkRunElapsed startMs={httpBulkRunStartedAtMs} />
                      <span>全測中</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} aria-hidden />
                      全測
                    </>
                  )}
                </button>
              }
            />
          </div>
        </div>
      );
    }

    if (activeTab === 'model-router') {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="shrink-0 rounded-base border border-dashed border-border-default bg-bg-secondary p-3 sm:p-4">
            <p className="text-xs font-semibold text-text-primary">Model Router 規劃表</p>
            <p className="mt-1 text-xs text-text-muted">
              用於整理前面 Adapter 的模型路由策略，包含主模型、fallback chain、觸發條件與狀態，便於規劃像「謄本解析 AI 助手」這類實戰路由方案。
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <EnhancedTable<ModelRouterRow>
              tableId="ai-settings-model-router-v1"
              columns={modelRouterColumns}
              data={MODEL_ROUTER_ROWS}
              initialWidths={[...MODEL_ROUTER_TABLE_INITIAL_WIDTHS]}
              minWidth={MODEL_ROUTER_TABLE_MIN_WIDTH_PX}
              stretchToContainer={false}
              persistentHorizontalScrollbar
              getSearchValue={getModelRouterSearchValue}
              getCategoryValue={getModelRouterCategoryValue}
            />
          </div>
        </div>
      );
    }

    // --- Evaluator tabs (ocr / static-ad / contract / blog / property-description) ---
    const tabConfig = EVALUATOR_TAB_CONFIG[activeTab];
    if (!tabConfig) return null;

    const handleSaveModels = async (providerId: string, selections: { modelId: string; modelName: string; isPrimary: boolean }[]) => {
      await settings.saveModels(
        providerId as Parameters<typeof settings.saveModels>[0],
        selections
      );
    };
    const handleSaveModule = async (moduleKey: string, isEnabled: boolean, assignedModels: import('@/lib/hooks/useAISettings').AssignedModel[], config?: Record<string, unknown>) => {
      await settings.saveModule(moduleKey, isEnabled, assignedModels, undefined, config);
    };

    const evaluator = (
      <ModelEvaluator
        savedKeys={settings.keys}
        savedModels={settings.models}
        savedEvaluations={settings.evaluations}
        validateAllResultsByKeyId={validateAllResultsByKeyId}
        currentKeys={memoizedCurrentKeys}
        onSave={settings.saveEvaluations}
        onTestModel={settings.testModel}
        onSaveModels={handleSaveModels}
        savedModules={settings.modules}
        hiddenModuleKeys={tabConfig.hiddenModuleKeys}
        onSaveModule={handleSaveModule}
        summarySelectedCount={selectedModelCount}
        summaryTotalCount={totalAvailableModels}
        promptVariableLabel={currentCloudPromptName ? `{${currentCloudPromptName}}` : undefined}
        globalTestPrompt={globalTestPrompt}
        onChangeGlobalTestPrompt={setGlobalTestPrompt}
        uploadedFile={uploadedFile}
        onChangeUploadedFile={setUploadedFile}
        headerActionsRef={setModelEvaluatorHeaderActions}
        statusLabelMode={tabConfig.statusLabelMode}
      />
    );

    if (activeTab === 'ocr') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">系統 Prompt 設定</h3>
            <p className="text-xs text-text-muted mb-3">
              儲存後每次雲端解析均自動套用，留空則使用內建預設 Prompt。
            </p>
            <OcrSystemPromptPanel
              savedPrompts={settings.prompts}
              onSave={settings.savePrompt}
            />
          </div>
          {evaluator}
        </div>
      );
    }

    return evaluator;
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  // 初始化每個分頁對應的預設檔名
  useEffect(() => {
    const moduleKey = getPromptModuleKeyForTab(activeTab);
    const lastName = lastPromptNameByModule[moduleKey];
    if (lastName) {
      setPromptFileName(lastName);
    } else {
      setPromptFileName(`${currentTab.label}-prompt`);
    }
  }, [activeTab, currentTab.label, lastPromptNameByModule]);

  // On first load, if the cloud has a matching module prompt, restore the last saved prompt name/content from this page.
  const [initialCloudPromptLoaded, setInitialCloudPromptLoaded] = useState(false);
  useEffect(() => {
    if (initialCloudPromptLoaded) return;
    const moduleKey = getPromptModuleKeyForTab(activeTab);
    const lastName = lastPromptNameByModule[moduleKey];
    if (!lastName) return;
    const candidate = settings.prompts.find(
      (p) =>
        p.module_key === moduleKey &&
        p.provider === 'global_eval' &&
        p.prompt_name === lastName
    );
    if (!candidate) return;
    setGlobalTestPrompt(candidate.prompt_content);
    setSelectedCloudPromptId(candidate.id);
    setInitialCloudPromptLoaded(true);
  }, [activeTab, lastPromptNameByModule, settings.prompts, initialCloudPromptLoaded]);

  /** Total available models: only counts validation results for keys that still exist; deleting keys reduces immediately */
  const computedFromValidation = getTotalAvailableModels(
    validateAllResultsByKeyId,
    memoizedCurrentKeys
  );
  const totalAvailableModels =
    settings.keys.length === 0
      ? 0
      : computedFromValidation > 0
        ? computedFromValidation
        : settings.validationSummary.totalModels;

  /**
   * SSOT: the selected count always comes from Supabase ai_model_selections (settings.models).
   * Keeps numbers consistent across tabs (API keys, model evaluation, etc.).
   */
  const currentKeysForUtil = memoizedCurrentKeys;
  const selectedInAvailable = getSelectedCountInAvailable(
    settings.models,
    validateAllResultsByKeyId,
    currentKeysForUtil
  );
  const currentProviderIds = new Set(memoizedCurrentKeys.map((k) => k.provider));
  const selectedModelsForCurrentKeys = settings.models.filter((m) =>
    currentProviderIds.has(m.provider)
  );
  const selectedModelCountRaw =
    selectedInAvailable ?? selectedModelsForCurrentKeys.length;
  const selectedModelCount = Math.min(selectedModelCountRaw, totalAvailableModels);

  // ---------------------------------------------------------------------------
  // Bulk export of all available models (CSV / JSON / Markdown)
  // ---------------------------------------------------------------------------
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!exportDropdownRef.current) return;
      if (!exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportDropdownOpen]);

  const exportableModelRows = useMemo(() => {
    const base = getAvailableModelsListWithStaticFallback(
      validateAllResultsByKeyId,
      memoizedCurrentKeys
    );
    return base
      .map(({ providerId, modelId }) => ({
        providerId,
        providerName: AI_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId,
        modelId,
        modelName: getModelDisplayName(providerId, modelId),
      }))
      .sort((a, b) => {
        const oa = AI_PROVIDERS.findIndex((p) => p.id === a.providerId);
        const ob = AI_PROVIDERS.findIndex((p) => p.id === b.providerId);
        if (oa !== ob) return oa - ob;
        return (a.modelName || a.modelId).localeCompare(b.modelName || b.modelId);
      });
  }, [validateAllResultsByKeyId, memoizedCurrentKeys]);

  const exportAllModels = useCallback(
    (format: 'csv' | 'json' | 'markdown') => {
      const rows = exportableModelRows;
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
      const baseName = `ai-models-all-${stamp}`;

      let content = '';
      let mime = '';
      let ext = '';

      if (format === 'csv') {
        const escape = (v: string) => {
          const needsQuote = /[",\n\r]/.test(v);
          const escaped = v.replace(/"/g, '""');
          return needsQuote ? `"${escaped}"` : escaped;
        };
        const header = ['providerId', 'providerName', 'modelId', 'modelName'];
        const lines = [header.join(',')];
        for (const r of rows) {
          lines.push(
            [escape(r.providerId), escape(r.providerName), escape(r.modelId), escape(r.modelName)].join(',')
          );
        }
        // BOM so Excel reads UTF-8 correctly
        content = '\ufeff' + lines.join('\r\n');
        mime = 'text/csv;charset=utf-8';
        ext = 'csv';
      } else if (format === 'json') {
        content = JSON.stringify(rows, null, 2);
        mime = 'application/json;charset=utf-8';
        ext = 'json';
      } else {
        const escapeMd = (v: string) => v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
        const lines = [
          '| providerId | providerName | modelId | modelName |',
          '| --- | --- | --- | --- |',
        ];
        for (const r of rows) {
          lines.push(
            `| ${escapeMd(r.providerId)} | ${escapeMd(r.providerName)} | ${escapeMd(r.modelId)} | ${escapeMd(r.modelName)} |`
          );
        }
        content = lines.join('\n');
        mime = 'text/markdown;charset=utf-8';
        ext = 'md';
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDropdownOpen(false);
    },
    [exportableModelRows]
  );

  const handleSheetTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as SettingsTab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  }, []);

  /** Evaluations Global: after overwriting a width preset, switch back to the tab and sync the URL hash */
  const focusEvaluationsGlobalTab = useCallback(() => {
    setActiveTab('evaluations-global');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#evaluations-global');
    }
  }, []);

  const fixedBlock = (
    <div className="w-full px-4 lg:px-6 py-3 bg-bg-secondary border-b border-border-subtle">
      <div className="w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 gap-y-1 min-w-0">
            {React.createElement(currentTab.icon, { size: 18, className: 'text-accent shrink-0' })}
            {activeTab !== 'http-adapter-config' && (
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text-primary">{currentTab.label}</h2>
                {currentTab.description && (
                  <p className="text-[11px] text-text-muted">{currentTab.description}</p>
                )}
              </div>
            )}
            {activeTab !== 'llm-leaderboard' &&
            activeTab !== 'evaluations-global' &&
            activeTab !== 'http-adapter-config' &&
            activeTab !== 'model-router' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  window.open('/superadmin/settings/prompt-management', '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle"
                title="前往 Prompt 管理頁面"
              >
                <BookMarked size={14} className="text-text-muted" />
                <span>Prompt 管理</span>
              </button>
              {activeTab !== 'keys' && (
                <>
                  <button
                    type="button"
                    onClick={handleExportSettings}
                    disabled={exportingSettings || importingSettings}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                    title="匯出 AI 設定（JSON）"
                  >
                    <Download size={14} className="text-text-muted" />
                    <span>匯出設定</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={exportingSettings || importingSettings}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                    title="載入 AI 設定（JSON）"
                  >
                    <Upload size={14} className="text-text-muted" />
                    <span>載入設定</span>
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      await handleImportSettings(file);
                    }}
                  />
                </>
              )}
            </div>
            )}
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
                      全部公司可選模型數：
                      <span className="font-medium text-text-primary">
                        {modelEvaluatorHeaderActions?.totalCount ?? totalAvailableModels}
                      </span>
                      {modelEvaluatorHeaderActions != null &&
                        modelEvaluatorHeaderActions.filteredTotal !== modelEvaluatorHeaderActions.totalCount && (
                        <>
                          ，篩選後可選模型數：
                          <span className="font-medium text-text-primary">
                            {modelEvaluatorHeaderActions.filteredTotal}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}
                {!settings.loading && exportableModelRows.length > 0 && (
                  <div className="relative shrink-0" ref={exportDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setExportDropdownOpen((v) => !v)}
                      aria-expanded={exportDropdownOpen}
                      aria-haspopup="menu"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                      title={`導出全部 ${exportableModelRows.length} 個可選模型`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      導出所有可選模型
                    </button>
                    {exportDropdownOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 z-30 min-w-[220px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2"
                        role="menu"
                        aria-label="批量導出格式"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                          導出格式（全部 {exportableModelRows.length} 個模型）
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => exportAllModels('csv')}
                          className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                        >
                          CSV（Excel / Sheets）
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => exportAllModels('json')}
                          className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                        >
                          JSON
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => exportAllModels('markdown')}
                          className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                        >
                          Markdown 表格
                        </button>
                        <div className="border-t border-border-default mt-1 pt-1 px-3 py-1 text-[10px] text-text-muted">
                          欄位：providerId / providerName / modelId / modelName
                        </div>
                      </div>
                    )}
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
      {httpBulkToast && (
        <div className="fixed right-6 top-24 z-[120] max-w-[520px] rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 shadow-lg">
          {httpBulkToast}
        </div>
      )}
      {/* Keys tab needs an outer scroll track; other tabs keep full-height layout with internal scroll. */}
      <div
        className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden px-2 py-2 sm:px-3 lg:px-4 lg:py-3 ${
          activeTab === 'keys' ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div
          className={`flex min-w-0 flex-col rounded-base border border-border-default bg-bg-secondary p-3 shadow-sm sm:p-4 ${
            activeTab === 'keys' ? '' : 'min-h-0 flex-1 overflow-hidden'
          }`}
        >
          {renderContent()}
        </div>

        {/* Security reminder — only shown on keys tab */}
        {activeTab === 'keys' && (
          <div className="mt-8 shrink-0 space-y-4">
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
                <li>切換底部分頁「AI 模型全域評測」，於工作表中勾選要納入候選的模型（可測試連線）。</li>
              </ol>
            </div>
          </div>
        )}
      </div>
      {/* Bottom sheet tabs — Excel-style navigation */}
      <BottomSheetTabs
        tabs={SHEET_TABS}
        activeTab={activeTab}
        onTabChange={handleSheetTabChange}
      />
      {showPromptManager && (
        <PromptManagerModal
          onClose={() => setShowPromptManager(false)}
          onLoad={(content) => {
            setGlobalTestPrompt(content);
            setShowPromptManager(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
