// filepath: apps/superadmin/components/admin/properties/TranscriptParseSection.tsx
// created: 2026-03-04 | creator: Claude Sonnet 4.6
// AI 謄本解析區塊 — pre-execution settings panel + real-time per-model progress + results display.
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Loader2, ChevronDown, ChevronUp, Settings2,
  AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink,
  Copy, Download, Scale, Info, PenLine, BookMarked, FileCode,
} from 'lucide-react';
import { useAISettings, type SavedModel } from '@/lib/hooks/useAISettings';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';
import {
  PromptManagerModal,
  PROMPT_LOAD_MESSAGE_TYPE,
} from '@/components/ai-settings/PromptManagerModal';
import {
  DEFAULT_PARSER_CONCURRENCY,
  PARSER_CONCURRENCY_OPTIONS,
  resolveParserConcurrency,
} from '@/lib/utils/parser-concurrency';
import { getDocumentParseResult } from '@/lib/actions/properties';
import type { PropertyDocumentItem, BuildingTranscriptData, LandTranscriptData } from '@/lib/types/properties';
import type { TranscriptParseOutput, ConsensusMetadata, ConflictDetail } from '@/lib/types/transcript';
import {
  getAvailableModelsListWithStaticFallback,
} from '@/lib/utils/total-available-models';
import { getStatusDisplay } from '@/lib/utils/model-status';
import {
  deleteSavedPrompt,
  listSavedPrompts,
  savePrompt as savePromptAction,
  updatePrompt,
  type SavedPrompt as DbSavedPrompt,
} from '@/app/superadmin/settings/evaluations-global-test/promptActions';
import { readLocalStorage,
  writeLocalStorage,
  readSessionStorage,
} from '@/lib/utils/storage-state';
import {
  normalizeLocalParsedToBuildingTranscriptData,
  normalizeLocalParsedToLandTranscriptData,
  transcriptDataForTranscribeFromParseOutput,
} from '@/lib/utils/transcript-parsed-to-form';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// SSE event types (mirrors the streaming route)
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: 'init' | 'downloading' | 'consensus' | 'saving'; message: string }
  | { type: 'models_loaded'; parserModels: Array<{ provider: string; model: string }>; judgeModel: { provider: string; model: string } | null }
  | { type: 'parse_start'; total: number; concurrency: number; targetSuccessCount: number }
  | { type: 'model_start'; provider: string; model: string; index: number }
  | { type: 'model_result'; provider: string; model: string; index: number; success: boolean; duration_ms: number; error?: string }
  | { type: 'model_cancelled'; provider: string; model: string; index: number }
  | { type: 'model_skipped'; provider: string; model: string; index: number }
  | { type: 'judge_start'; message: string; conflictCount: number }
  | { type: 'judge_done'; success: boolean }
  | { type: 'complete'; result: TranscriptParseOutput; metadata: ConsensusMetadata }
  | { type: 'error'; message: string };

interface ModelProgressItem {
  provider: string;
  model: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled' | 'skipped';
  duration_ms?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  transcriptDocs: PropertyDocumentItem[];
  /** 解析目標：建物謄本 or 土地謄本（預設為建物） */
  kind?: 'building' | 'land';
  /** 銷售模式，用於自動選擇對應的 Prompt（名稱含 (salesMode)） */
  salesMode?: string;
  /**
   * 優先於 salesMode。須與 Prompt 管理內建範本一致，例如 (single_building_number)。
   * 用於單一建號／多建號／獨立車位／公設車位等情境。
   */
  parseScenarioKey?: string;
  /** When provided, show "謄寫" button and call with parse result to fill the form below */
  onTranscribe?: (result: BuildingTranscriptData | LandTranscriptData) => void;
}

const OCR_SETTINGS_HREF = '/superadmin/settings/api_key_and_model_setting#ocr';

// 與 ModelEvaluator 共用的篩選 key（字串需完全一致才能從同一份 localStorage/sessionStorage 還原）
const SS_FILTER_PROVIDERS = 'ai-eval-filter:providerIds';
const SS_FILTER_STATUSES = 'ai-eval-filter:statuses';
const LS_FILTER_CATEGORIES = 'ai-eval-filter:categories';
const LS_LAST_CUSTOM_PROMPT = 'transcript-parse:lastCustomPrompt';
const LS_SHOW_SETTINGS = 'transcript-parse:showSettings';
const LS_LOCAL_PARSE_PREFIX = 'transcript-parse:local-result:';

const VALID_STATUS_VALUES = new Set(['vlm_ok', 'llm_ok', 'not_working', 'untested']);
const VALID_CATEGORY_VALUES = new Set(['VLM', 'LLM', 'unknown']);

function detectCategoryFromOutput(output: string | undefined): 'VLM' | 'LLM' | 'unknown' {
  const text = (output ?? '').trim();
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  const noFilePhrases = [
    '看不到', '無法看到', '無法讀取', '沒有收到', '沒有檔案', '沒有附件', '未提供', '未上傳',
    "can't see", 'cannot see', 'no file', 'no attachment', "i don't have access", "i don't have",
    'not provided', 'without the file', '沒有提供', '無法取得', '無法辨識', '沒有圖', '沒有圖檔',
    '沒有圖片', '沒有文件', '沒有文件檔', '沒有pdf', '沒有上傳', '請提供檔案', '請上傳',
  ];
  const hasNoFile = noFilePhrases.some((p) => text.includes(p) || lower.includes(p.toLowerCase()));
  if (hasNoFile) return 'LLM';
  const docContentPhrases = [
    '所有權人', '所有權', '姓名', '地號', '建號', '權利範圍', '面積', '坐落', '謄本',
    '土地', '建物', '持分', '登記', '所有權人姓名', '所有權人為', '解析出', '根據檔案',
    '根據文件', '根據您提供的', '從檔案中', '從文件中', '文件中顯示', '檔案內容',
  ];
  const hasDocContent = docContentPhrases.some((p) => text.includes(p));
  if (hasDocContent) return 'VLM';
  return 'unknown';
}

export function TranscriptParseSection({
  transcriptDocs,
  kind = 'building',
  salesMode,
  parseScenarioKey,
  onTranscribe,
}: Props) {
  const {
    userId: aiUserId,
    modules: aiModules,
    prompts,
    refreshSilent,
    keys: savedKeys,
    models: savedModels,
    validationCacheByKeyId,
    evaluations,
  } = useAISettings();

  // 進入頁面時拉最新驗證快取，與設定頁「驗證全部」後數字一致
  useEffect(() => {
    refreshSilent?.();
  }, [refreshSilent]);

  // Document selection
  const [selectedDocId, setSelectedDocId] = useState('');

  // Pre-execution settings panel
  const [showSettings, setShowSettings] = useState<boolean>(() =>
    readLocalStorage<boolean>(LS_SHOW_SETTINGS, false)
  );
  const [showPromptManager, setShowPromptManager] = useState(false);
  // 預設載入最後一次 user 輸入的 Prompt（存在 localStorage），避免每次被系統預設覆蓋
  const [customPrompt, setCustomPrompt] = useState<string>(() =>
    readLocalStorage<string>(LS_LAST_CUSTOM_PROMPT, '')
  );
  const [isPromptDirty, setIsPromptDirty] = useState<boolean>(() =>
    readLocalStorage<string>(LS_LAST_CUSTOM_PROMPT, '').trim().length > 0
  );
  const [parserConcurrency, setParserConcurrency] = useState<number>(DEFAULT_PARSER_CONCURRENCY);
  type ParserModelSelection = { provider: string; model: string; priority?: number; enabled: boolean };
  const [parserModelSelection, setParserModelSelection] = useState<ParserModelSelection[]>([]);

  // Parse state
  const [isParsing, setIsParsing] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [modelProgress, setModelProgress] = useState<ModelProgressItem[]>([]);

  // Results
  const [parseResult, setParseResult] = useState<TranscriptParseOutput | null>(null);
  const [parseMetadata, setParseMetadata] = useState<ConsensusMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);

  // No OCR model configured guard (shown before parse starts, with link to settings)
  const [noOcrModelError, setNoOcrModelError] = useState<boolean>(false);

  // AbortController for cancelling the fetch stream
  const abortRef = useRef<AbortController | null>(null);
  const parseRunIdRef = useRef(0);

  // Local Python parse state
  const [isLocalParsing, setIsLocalParsing] = useState(false);
  const [localParseResult, setLocalParseResult] = useState<Record<string, unknown> | null>(null);
  const [localParseError, setLocalParseError] = useState<string | null>(null);

  const targetLabel = kind === 'land' ? '土地謄本' : '建物謄本';

  // 與設定頁 #ocr 共用的篩選條件（透過 storage 事件即時同步）
  const [filterProviderIds, setFilterProviderIds] = useState<string[]>(() =>
    readLocalStorage<string[]>(
      SS_FILTER_PROVIDERS,
      readSessionStorage<string[]>(SS_FILTER_PROVIDERS, []),
    )
  );
  const [filterStatuses, setFilterStatuses] = useState<string[]>(() =>
    readLocalStorage<string[]>(
      SS_FILTER_STATUSES,
      readSessionStorage<string[]>(SS_FILTER_STATUSES, []),
    ).filter((v) => VALID_STATUS_VALUES.has(v))
  );
  const [filterCategories, setFilterCategories] = useState<string[]>(() =>
    readLocalStorage<string[]>(LS_FILTER_CATEGORIES, []).filter((v) =>
      VALID_CATEGORY_VALUES.has(v),
    )
  );

  // 監聽其他分頁（設定頁）對篩選條件的更新，讓本區塊數字即時同步
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === SS_FILTER_PROVIDERS) {
        setFilterProviderIds(
          readLocalStorage<string[]>(
            SS_FILTER_PROVIDERS,
            readSessionStorage<string[]>(SS_FILTER_PROVIDERS, []),
          )
        );
      } else if (e.key === SS_FILTER_STATUSES) {
        setFilterStatuses(
          readLocalStorage<string[]>(
            SS_FILTER_STATUSES,
            readSessionStorage<string[]>(SS_FILTER_STATUSES, []),
          ).filter((v) => VALID_STATUS_VALUES.has(v))
        );
      } else if (e.key === LS_FILTER_CATEGORIES) {
        setFilterCategories(
          readLocalStorage<string[]>(LS_FILTER_CATEGORIES, []).filter((v) =>
            VALID_CATEGORY_VALUES.has(v),
          )
        );
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Auto-select first document when list changes
  useEffect(() => {
    if (transcriptDocs.length > 0 && !transcriptDocs.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(transcriptDocs[0].id);
      setParseError(null);
      setNoOcrModelError(false);
    }
  }, [transcriptDocs, selectedDocId]);

  // Restore last local Python parse result per document from localStorage
  useEffect(() => {
    if (!selectedDocId) {
      setLocalParseResult(null);
      setLocalParseError(null);
      return;
    }
    const stored = readLocalStorage<string | null>(`${LS_LOCAL_PARSE_PREFIX}${selectedDocId}`, null);
    if (!stored) {
      setLocalParseResult(null);
      setLocalParseError(null);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      setLocalParseResult(parsed);
      setLocalParseError(null);
    } catch {
      setLocalParseResult(null);
    }
  }, [selectedDocId]);

  // Restore last parse result from DB when opening page or switching document (so user sees saved result without re-parsing).
  // 僅依賴 selectedDocId，避免 transcriptDocs 每次新陣列參考導致重複執行或覆蓋已還原的結果。
  useEffect(() => {
    if (!selectedDocId) {
      setParseResult(null);
      setParseMetadata(null);
      return;
    }
    let cancelled = false;
    getDocumentParseResult(selectedDocId).then((res) => {
      if (cancelled) return;
      if (res?.parsedResult != null) {
        setParseResult(res.parsedResult);
        setParseMetadata(res.consensusMetadata ?? null);
      } else {
        setParseResult(null);
        setParseMetadata(null);
      }
    });
    return () => { cancelled = true; };
  }, [selectedDocId]);

  // Compute configured models from AI settings
  const ocrParseModule = useMemo(
    () =>
      aiModules.find((m) => m.module_key === 'online_ocr_parse') ||
      aiModules.find((m) => m.module_key === 'online_ocr'),
    [aiModules],
  );
  const ocrJudgeModule = useMemo(
    () => aiModules.find((m) => m.module_key === 'online_ocr_judge'),
    [aiModules],
  );

  // 與「API 金鑰與模型設定」#ocr 同步的模型數量（全部可選 / 篩選後可選 / 已選被測＋解析組）
  const currentKeys = useMemo(
    () => savedKeys.map((k) => ({ id: k.id, provider: k.provider })),
    [savedKeys],
  );
  // 與「API 金鑰與模型設定」#ocr 完全同步：
  // - 全部公司可選模型數：allRows.length
  // - 篩選後可選模型數：rowsAfterProvider / 狀態 / 分類篩選後的 rows 長度
  // - 已選被測模型數：同一 rows 範圍內、仍在可選名單中的勾選模型數
  const ocrModelStats = useMemo(() => {
    if (savedKeys.length === 0) {
      return { total: 0, filteredTotal: 0, selected: 0, assigned: ocrParseModule?.assigned_models?.length ?? 0 };
    }

    const allRows = getAvailableModelsListWithStaticFallback(validationCacheByKeyId, currentKeys);
    const total = allRows.length;

    // 1) 依 provider 篩選
    let rowsAfterProvider = allRows;
    if (filterProviderIds.length > 0) {
      const set = new Set(filterProviderIds);
      rowsAfterProvider = allRows.filter((r) => set.has(r.providerId));
    }

    // 評估結果對照表（provider::model → ModelEvaluation）
    const evaluationMap = new Map<string, typeof evaluations[number]>();
    for (const ev of evaluations ?? []) {
      evaluationMap.set(`${ev.provider}::${ev.model_id}`, ev);
    }

    // 2) 依狀態篩選（OCR可用/LLM可用/不可用/尚未測試）
    let rowsAfterStatus = rowsAfterProvider;
    if (filterStatuses.length > 0) {
      const set = new Set(filterStatuses);
      rowsAfterStatus = rowsAfterProvider.filter((r) => {
        const key = `${r.providerId}::${r.modelId}`;
        const ev = evaluationMap.get(key);
        const statusDisplay = getStatusDisplay(key, ev, {}, { [key]: ev?.notes ?? '' }, true);
        return set.has(statusDisplay.type);
      });
    }

    // 3) 依模型分類篩選（VLM / LLM / unknown）
    let rowsAfterCategory = rowsAfterStatus;
    if (filterCategories.length > 0) {
      const set = new Set(filterCategories);
      rowsAfterCategory = rowsAfterStatus.filter((r) => {
        const key = `${r.providerId}::${r.modelId}`;
        const ev = evaluationMap.get(key);
        const outputText = (ev?.notes ?? '').trim();
        const category = detectCategoryFromOutput(outputText);
        return set.has(category);
      });
    }

    const filteredTotal = rowsAfterCategory.length;

    // 已選被測模型數：同一 rows 範圍內、仍在可選名單中的勾選模型
    const selectedSet = new Set<string>(
      (savedModels as SavedModel[]).map((m) => `${m.provider}::${m.model_id}`),
    );
    const allSelectedCount = allRows.filter((r) =>
      selectedSet.has(`${r.providerId}::${r.modelId}`),
    ).length;
    const filteredSelectedCount = rowsAfterCategory.filter((r) =>
      selectedSet.has(`${r.providerId}::${r.modelId}`),
    ).length;
    const selected =
      rowsAfterCategory.length !== allRows.length ? filteredSelectedCount : allSelectedCount;

    const assigned = ocrParseModule?.assigned_models?.length ?? 0;
    return { total, filteredTotal, selected, assigned };
  }, [
    savedKeys.length,
    validationCacheByKeyId,
    currentKeys,
    ocrParseModule?.assigned_models?.length,
    evaluations,
    savedModels,
    filterProviderIds,
    filterStatuses,
    filterCategories,
  ]);

  const [dbPrompts, setDbPrompts] = useState<DbSavedPrompt[]>([]);

  // Fetch all saved_prompts (not just active system ones)
  useEffect(() => {
    listSavedPrompts().then((res) => {
      if (res.data) setDbPrompts(res.data);
    });
  }, []);

  const storedParsePrompt = useMemo(() => {
    const lookupKey = parseScenarioKey ?? salesMode;
    // 1. 優先從 saved_prompts 依情境鍵或銷售模式比對名稱，例如 (single_building_number)、(building_only)
    if (lookupKey && dbPrompts.length > 0) {
      const modeMatch = dbPrompts.find(
        (p) =>
          p.name?.includes(`(${lookupKey})`) &&
          p.content?.trim(),
      );
      if (modeMatch) return modeMatch.content;
    }

    // 2. Fallback: 尋找最新版本的 online_ocr_parse Prompt（即原本的「設為系統 Prompt」邏輯）
    // 注意：這裡使用 useAISettings() 的 prompts (來自 ai_system_prompts 表)
    const matched = prompts
      .filter((p) => p.module_key === 'online_ocr_parse' && p.prompt_content?.trim())
      .sort((a, b) => b.version - a.version);
    return matched[0]?.prompt_content ?? '';
  }, [prompts, salesMode, parseScenarioKey, dbPrompts]);
  const effectiveParsePrompt = storedParsePrompt || TRANSCRIPT_PARSE_PROMPT;
  const isCustomPromptOverridden =
    isPromptDirty && customPrompt.trim().length > 0 && customPrompt.trim() !== effectiveParsePrompt.trim();
  const enabledParserCount = parserModelSelection.filter((m) => m.enabled).length;
  const effectiveParserConcurrency = resolveParserConcurrency(
    parserConcurrency,
    enabledParserCount || parserModelSelection.length || 1,
  );

  // 若使用者尚未輸入過任何 Prompt（localStorage 為空），第一次載入或切換模式時自動載入對應 Prompt
  useEffect(() => {
    if (!isPromptDirty) {
      setCustomPrompt(effectiveParsePrompt);
    }
  }, [effectiveParsePrompt, isPromptDirty]);

  // When Prompt 管理 is opened in a new tab (e.g. "在新分頁開啟"), 載入 sends postMessage; we apply it here
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PROMPT_LOAD_MESSAGE_TYPE || !event.data?.content) return;
      setCustomPrompt(event.data.content);
      setIsPromptDirty(true);
      writeLocalStorage(LS_LAST_CUSTOM_PROMPT, event.data.content);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // 解析此輪要使用的裁判模型：
  // 1) 優先使用 online_ocr_judge 模組中綁定的第一個模型
  // 2) 若讀不到（或尚未設定），fallback 為目前勾選的解析模型中的第一個
  const effectiveJudgeModel = useMemo(
    () => {
      if (ocrJudgeModule && Array.isArray(ocrJudgeModule.assigned_models) && ocrJudgeModule.assigned_models.length > 0) {
        const j = ocrJudgeModule.assigned_models[0];
        return { provider: j.provider, model: j.model };
      }
      const firstEnabled = parserModelSelection.find((m) => m.enabled) ?? parserModelSelection[0];
      return firstEnabled ? { provider: firstEnabled.provider, model: firstEnabled.model } : null;
    },
    [ocrJudgeModule, parserModelSelection],
  );

  // Sync per-run parser model selection：單一事實來源 = 「雲端OCR謄本解析（解析組）」模組綁定
  useEffect(() => {
    if (ocrParseModule && Array.isArray(ocrParseModule.assigned_models) && ocrParseModule.assigned_models.length > 0) {
      setParserModelSelection(
        ocrParseModule.assigned_models.map((m) => ({
          provider: m.provider,
          model: m.model,
          priority: m.priority,
          enabled: true,
        })),
      );
      return;
    }

    setParserModelSelection([]);
  }, [ocrParseModule]);

  // SSE event dispatcher
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'init':
      case 'downloading':
      case 'consensus':
      case 'saving':
        setPhaseLabel(event.message);
        break;

      case 'models_loaded':
        setModelProgress(
          event.parserModels.map((m) => ({ provider: m.provider, model: m.model, status: 'pending' as const })),
        );
        setPhaseLabel('準備中…');
        break;

      case 'parse_start':
        setPhaseLabel(`解析中（同時 ${event.concurrency} 個）…`);
        break;

      case 'model_start':
        setModelProgress((prev) =>
          prev.map((p, i) => (i === event.index ? { ...p, status: 'running' as const } : p)),
        );
        break;

      case 'model_result':
        setModelProgress((prev) =>
          prev.map((p, i) =>
            i === event.index
              ? { ...p, status: event.success ? ('success' as const) : ('error' as const), duration_ms: event.duration_ms, error: event.error }
              : p,
          ),
        );
        break;

      case 'model_cancelled':
        setModelProgress((prev) =>
          prev.map((p, i) =>
            i === event.index
              ? { ...p, status: 'cancelled' as const }
              : p,
          ),
        );
        break;

      case 'model_skipped':
        setModelProgress((prev) =>
          prev.map((p, i) =>
            i === event.index
              ? { ...p, status: 'skipped' as const }
              : p,
          ),
        );
        break;

      case 'judge_start':
        setPhaseLabel(event.message);
        break;

      case 'judge_done':
        setPhaseLabel(event.success ? '裁判完成' : '裁判無法解決，保留共識結果');
        break;

      case 'complete':
        setParseResult(event.result);
        setParseMetadata(event.metadata);
        setPhaseLabel('');
        break;

      case 'error':
        setParseError(event.message);
        break;
    }
  }, []);

  async function handleParse() {
    if (!selectedDocId || !aiUserId || isParsing) return;

    // Guard: no models assigned at all (regardless of is_enabled flag).
    // is_enabled is a separate module-level toggle and should not block parsing
    // when models are actually assigned.
    if (parserModelSelection.length === 0) {
      setNoOcrModelError(true);
      setParseError(null);
      return;
    }
    const enabledParserModels = parserModelSelection.filter((m) => m.enabled);
    if (enabledParserModels.length === 0) {
      setNoOcrModelError(true);
      setParseError(null);
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    parseRunIdRef.current += 1;
    const runId = parseRunIdRef.current;

    setNoOcrModelError(false);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    setParseMetadata(null);
    setShowConflicts(false);
    setModelProgress([]);
    setPhaseLabel('初始化中…');

    // P1.1: Include local parse result in consensus if one is available.
    // The local result (now in TranscriptParseOutput unified schema) participates
    // as a virtual "local/local-regex-parser" model in Phase 2 majority voting.
    const localResultForConsensus =
      localParseResult && 'kind' in localParseResult
        ? (localParseResult as unknown as import('@/lib/types/transcript').TranscriptParseOutput & { field_confidences?: Record<string, number> })
        : undefined;

    try {
      const response = await fetch('/api/transcript-parse/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocId,
          userId: aiUserId,
          customPrompt: isCustomPromptOverridden ? customPrompt.trim() : undefined,
          parserConcurrency,
          overrideParserModels:
            enabledParserModels.length > 0
              ? enabledParserModels.map((m) => ({ provider: m.provider, model: m.model }))
              : undefined,
          overrideJudgeModel: effectiveJudgeModel ?? undefined,
          injectedLocalResult: localResultForConsensus,
        }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        setParseError(`串流請求失敗 (${response.status})`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processBuffer() {
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            if (parseRunIdRef.current !== runId) continue;
            handleSSEEvent(JSON.parse(chunk.slice(6)) as SSEEvent);
          } catch {
            // Ignore malformed events
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }
        if (done) {
          // 串流結束後處理 buffer 內剩餘內容，避免漏掉最後的 complete 事件
          if (buffer.trim()) {
            const chunks = buffer.split('\n\n');
            for (const chunk of chunks) {
              if (!chunk.startsWith('data: ')) continue;
              try {
                if (parseRunIdRef.current !== runId) break;
                handleSSEEvent(JSON.parse(chunk.slice(6)) as SSEEvent);
              } catch {
                // Ignore malformed events
              }
            }
          }
          break;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      if (parseRunIdRef.current !== runId) return;
      setParseError(e instanceof Error ? e.message : '解析失敗');
    } finally {
      if (abortRef.current === abort && parseRunIdRef.current === runId) {
        abortRef.current = null;
        setIsParsing(false);
        setPhaseLabel('');
      }
    }
  }

  async function handleLocalParse() {
    if (!selectedDocId || isLocalParsing) return;
    setIsLocalParsing(true);
    setLocalParseResult(null);
    setLocalParseError(null);
    try {
      const response = await fetch('/api/transcript-parse/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocId }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        const errMsg = (data.error as string) ?? `請求失敗 (${response.status})`;
        // P0.2: Auto-fallback to cloud when PDF has no text layer
        const isNoTextLayer =
          response.status === 422 &&
          (errMsg.includes('無可提取的文字層') || errMsg.includes('請改用雲端解析'));
        if (isNoTextLayer) {
          setLocalParseError(`${errMsg}（已自動啟動雲端解析）`);
          void handleParse();
        } else {
          setLocalParseError(errMsg);
        }
        return;
      }
      setLocalParseResult(data);
      writeLocalStorage(`${LS_LOCAL_PARSE_PREFIX}${selectedDocId}`, JSON.stringify(data));
    } catch (e) {
      setLocalParseError(e instanceof Error ? e.message : '地端解析失敗');
    } finally {
      setIsLocalParsing(false);
    }
  }

  function handleCopy() {
    if (!parseResult) return;
    void navigator.clipboard.writeText(JSON.stringify(parseResult, null, 2));
  }

  function buildReportMarkdown(): string {
    const lines: string[] = [];
    lines.push('# 謄本解析報告');
    lines.push('');
    lines.push(`生成時間：${new Date().toISOString()}`);
    lines.push('');
    if (parseMetadata) {
      lines.push('## 共識摘要');
      lines.push('');
      lines.push(`- **策略**：${parseMetadata.strategy === 'consensus' ? '多模型共識' : '單模型'}`);
      lines.push(`- **總信心**：${Math.round(parseMetadata.total_confidence * 100)}%`);
      lines.push(`- **耗時**：${(parseMetadata.total_duration_ms / 1000).toFixed(1)} 秒`);
      lines.push(`- **解析模型**：${parseMetadata.models_used.map((m) => `${m.provider}/${m.model}`).join(', ')}`);
      if (parseMetadata.judge_used) {
        lines.push(`- **裁判模型**：${parseMetadata.judge_used.provider}/${parseMetadata.judge_used.model}`);
      }
      lines.push('');
    }
    lines.push('## 解析結果 (JSON)');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(parseResult, null, 2));
    lines.push('```');
    lines.push('');
    if (parseMetadata && parseMetadata.conflicts.length > 0) {
      lines.push('## 衝突欄位詳情');
      lines.push('');
      parseMetadata.conflicts.forEach((c, i) => {
        const conf = parseMetadata.field_confidences[c.field_path];
        lines.push(`### ${i + 1}. \`${c.field_path}\``);
        if (conf !== undefined) {
          lines.push(`- **該欄位信心**：${Math.round(conf * 100)}%`);
        }
        lines.push(`- **解決方式**：${c.resolved_by === 'majority' ? '多數決' : c.resolved_by === 'judge' ? '裁判仲裁' : '未解決'}`);
        if (c.final_value !== undefined) {
          lines.push(`- **最終取值**：\`${JSON.stringify(c.final_value)}\``);
        }
        lines.push('- **各模型輸出**：');
        c.values.forEach((v) => {
          lines.push(`  - ${v.provider}/${v.model}: \`${JSON.stringify(v.value)}\``);
        });
        lines.push('');
      });
    }
    return lines.join('\n');
  }

  function handleDownloadReport() {
    if (!parseResult) return;
    const md = buildReportMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `謄本解析報告_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-dashed border-border-default rounded-md p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <Brain size={14} className="text-accent" />
          AI 解析{targetLabel}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!showSettings) refreshSilent?.();
            setShowSettings((v) => {
              const next = !v;
              writeLocalStorage(LS_SHOW_SETTINGS, next);
              return next;
            });
          }}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          title="解析設定"
        >
          <Settings2 size={12} />
          解析設定
          {showSettings ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span>
          全部公司可選模型數：
          <span className="font-medium text-text-primary">{ocrModelStats.total}</span>
          ，篩選後可選模型數：
          <span className="font-medium text-text-primary">{ocrModelStats.filteredTotal}</span>
          ，已選被測模型數：
          <span className="font-medium text-text-primary">{ocrModelStats.selected}</span>
        </span>
        <Link
          href={OCR_SETTINGS_HREF}
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          title="與設定頁 #ocr 同一資料源與 OCR可用 判定，進入本頁會自動拉最新驗證快取"
        >
          <ExternalLink size={12} aria-hidden />
          與 API 金鑰與模型設定 #ocr 同步
        </Link>
      </div>

      <p className="text-xs text-text-muted">
        選擇已上傳的{targetLabel}，由「雲端OCR謄本解析」指定之 AI 模型解析，輸出重要資訊 JSON。若為 PDF，會一併傳給 Claude、Gemini、OpenAI、Grok、DeepSeek 等；若某家 API 回報不支援，可改傳 JPG/PNG。
      </p>

      {/* 統一測試 vs 雲端解析謄本 說明：避免誤解「統一測試通過」=「單一物件解析一定成功」 */}
      <div className="rounded-md border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600/40 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
        <p className="font-medium">為什麼「統一測試」通過，但這裡雲端解析{targetLabel}沒結果或信心很低？</p>
        <ul className="list-disc list-inside space-y-0.5 text-text-muted dark:text-amber-200/90">
          <li><strong>統一測試</strong>：只測「已選被測模型」能否連線並回覆一句話，不跑謄本解析。</li>
          <li><strong>雲端解析謄本</strong>：只用「雲端OCR謄本解析（解析組）」<strong>已指派的模型</strong>，對本謄本檔案跑多模型共識；若解析組未指派任何模型，會無法執行。</li>
          <li>若下方「解析模型」為空，請至 OCR 解析設定 為「雲端OCR謄本解析（解析組）」<strong>指派</strong>至少一個模型（在該模組欄位加入模型，不是只勾選「勾選被測模型」）。</li>
          <li>若信心度很低（例如 30%），可能是檔案模糊、PDF 某家不支援、或各模型輸出格式不一致；可改傳 JPG/PNG 或減少解析模型數量再試。</li>
        </ul>
      </div>

      {/* ── Pre-execution settings panel ─────────────────────────────── */}
      {showSettings && (
        <div className="bg-bg-tertiary border border-border-default rounded-md p-3 space-y-3 text-xs">
          {/* 與 API 金鑰與模型設定 #ocr 單一來源同步說明 */}
          <p className="text-[11px] text-text-muted">
            以下解析／裁判模型與「AI 服務 → API 金鑰與模型設定」分頁 <strong>OCR 解析設定</strong> 同步；新增、刪除或排序請至該頁操作。
          </p>

          {/* Parser models */}
          <div className="space-y-1">
            <p className="font-medium text-text-secondary flex items-center gap-1">
              <Info size={11} className="text-accent" />
              解析模型（雲端OCR謄本解析（解析組））
            </p>
            {parserModelSelection.length > 0 ? (
              <>
                {parserModelSelection.length > 10 && (
                  <p className="pl-3 text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    若此數量與設定頁顯示不符，請至「OCR 解析設定」重新儲存解析組，以單一來源為準。
                  </p>
                )}
                <ul className="pl-3 space-y-0.5 max-h-40 overflow-y-auto">
                  {parserModelSelection.map((m, i) => (
                    <li key={`${m.provider}/${m.model}/${i}`} className="text-text-muted">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3 h-3 rounded border border-border-default text-accent focus:ring-0"
                          checked={m.enabled}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setParserModelSelection((prev) =>
                              prev.map((x) =>
                                x.provider === m.provider && x.model === m.model
                                  ? { ...x, enabled: checked }
                                  : x,
                              ),
                            );
                          }}
                        />
                        <span className="text-text-secondary font-mono">
                          {m.provider} / {m.model}
                        </span>
                        {m.priority === 1 && (
                          <span className="ml-1.5 text-accent text-[10px]">（主要）</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="pl-3 text-amber-600 flex items-center gap-1">
                <AlertTriangle size={11} />
                尚未設定解析模型，請至「AI 服務 → API 金鑰與模型設定」→ OCR 解析設定，為「雲端OCR謄本解析（解析組）」指定模型
              </p>
            )}
          </div>

          {/* Judge model */}
          <div className="space-y-1">
            <p className="font-medium text-text-secondary flex items-center gap-1">
              <Scale size={11} className="text-accent" />
              裁判模型（衝突解決，選填）
            </p>
            {effectiveJudgeModel ? (
              <ul className="pl-3 space-y-0.5">
                <li className="text-text-muted">
                  •{' '}
                  <span className="text-text-secondary font-mono">
                    {effectiveJudgeModel.provider} / {effectiveJudgeModel.model}
                  </span>
                  {!ocrJudgeModule ||
                    !ocrJudgeModule.assigned_models ||
                    ocrJudgeModule.assigned_models.length === 0 ? (
                      <span className="ml-1.5 text-[10px] text-text-muted">
                        （本次暫時沿用解析模型作為裁判，不會寫入 AI 設定）
                      </span>
                    ) : null}
                </li>
              </ul>
            ) : (
              <p className="pl-3 text-text-muted">（未設定，衝突欄位將以多數決解決）</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="font-medium text-text-secondary flex items-center gap-1">
              <Info size={11} className="text-accent" />
              同時解析模型數
            </p>
            <div className="pl-3">
              <select
                value={parserConcurrency}
                onChange={(e) => setParserConcurrency(Number(e.target.value))}
                className="border border-border-default rounded-md px-2 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent"
                disabled={isParsing}
              >
                {PARSER_CONCURRENCY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    同時 {value} 個
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                系統會同時呼叫全部已勾選模型，有幾個成功就算幾個，不設最低成功數限制。
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                依目前已勾選模型數，本次實際同時最多會跑 {effectiveParserConcurrency} 個。
              </p>
            </div>
          </div>

          {/* Custom prompt override */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-secondary">此次解析 Prompt（已預填，可修改）</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromptManager(true)}
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                  title="開啟 Prompt 管理（彈窗）"
                >
                  <BookMarked size={11} />
                  Prompt 管理
                </button>
                <a
                  href="/superadmin/settings/prompt-management?source=transcript-parse"
                  target="_blank"
                  rel="opener"
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                  title="在新分頁開啟 Prompt 管理，載入的 Prompt 會自動填到此欄位"
                >
                  <ExternalLink size={11} />
                  在新分頁開啟
                </a>
              </div>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setIsPromptDirty(true);
                writeLocalStorage(LS_LAST_CUSTOM_PROMPT, e.target.value);
              }}
              placeholder="留空則使用 AI 設定中已儲存的 Prompt（若無則使用預設 Prompt）"
              rows={4}
              className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs resize-y focus:outline-none focus:border-accent placeholder:text-text-muted"
              disabled={isParsing}
            />
            {!isPromptDirty && customPrompt.trim().length === 0 && (
              <p className="text-text-muted">
                目前預填的是 {storedParsePrompt ? 'AI 設定中已儲存的 Prompt' : '系統預設 Prompt'}。
              </p>
            )}
            {isCustomPromptOverridden && (
              <p className="text-amber-600 flex items-center gap-1">
                <AlertTriangle size={10} />
                此次解析將使用你剛修改的 Prompt，不影響 AI 設定中儲存的 Prompt
              </p>
            )}
          </div>

          {/* Link to AI settings — 直連 OCR 分頁，與解析／裁判模型單一來源一致 */}
          <a
            href="/superadmin/settings/api_key_and_model_setting#ocr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <ExternalLink size={11} />
            前往 AI 服務設定 → OCR 解析設定（管理解析組／裁判組與 Prompt）
          </a>
        </div>
      )}

      {/* Document selector */}
      <div>
        <label className="block text-xs text-text-muted mb-1">選擇謄本文件</label>
        <select
          value={selectedDocId}
          onChange={(e) => {
            setSelectedDocId(e.target.value);
            setParseResult(null);
            setParseError(null);
          }}
          className="w-full border border-border-default rounded-md px-2 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent"
          disabled={isParsing}
        >
          <option value="">請選擇</option>
          {transcriptDocs.map((d) => (
            <option key={d.id} value={d.id}>{d.documentName}</option>
          ))}
        </select>
      </div>

      {/* Parse button + dynamic concurrency indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleParse}
          disabled={!selectedDocId || isParsing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {isParsing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          {isParsing ? (phaseLabel || '解析中…') : `雲端解析${targetLabel}`}
        </button>
        <button
          type="button"
          onClick={handleLocalParse}
          disabled={!selectedDocId || isLocalParsing || isParsing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-40"
          title="使用本機 Python regex 解析器（需啟動 backend/ocr_service）"
        >
          {isLocalParsing ? <Loader2 size={12} className="animate-spin" /> : <FileCode size={12} />}
          {isLocalParsing ? '解析中…' : `地端解析${targetLabel}`}
        </button>
        {!isParsing && parserModelSelection.length > 0 && (
          <span className="text-[11px] text-text-muted">
            同時 {effectiveParserConcurrency} 個
            {effectiveParserConcurrency < parserConcurrency && (
              <span className="ml-0.5 text-amber-600">（已選 {parserConcurrency}，依模型數上限為 {effectiveParserConcurrency}）</span>
            )}
          </span>
        )}
      </div>

      {/* ── Real-time model progress ──────────────────────────────────── */}
      {(isParsing || parseError || parseResult) && modelProgress.length > 0 && (
        <div className="border border-border-default rounded-md p-2.5 space-y-1.5 bg-bg-tertiary">
          <p className="text-xs font-medium text-text-secondary">解析進度</p>
          {modelProgress.map((m, i) => (
            <ModelProgressRow key={i} item={m} />
          ))}
          {phaseLabel && !modelProgress.every((m) => m.status !== 'pending' && m.status !== 'running') && (
            <p className="text-xs text-text-muted pl-1">{phaseLabel}</p>
          )}
        </div>
      )}

      {/* Phase label when no model list yet (init / downloading) */}
      {isParsing && modelProgress.length === 0 && phaseLabel && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Loader2 size={11} className="animate-spin" />
          {phaseLabel}
        </div>
      )}

      {/* Error */}
      {noOcrModelError && (
        <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 space-y-1">
          <p className="font-medium flex items-center gap-1">
            <AlertTriangle size={13} className="shrink-0" />
            尚未設定 OCR 解析模型
          </p>
          <p>
            請前往{' '}
            <Link
              href={OCR_SETTINGS_HREF}
              className="underline underline-offset-2 hover:text-amber-700 font-medium"
              target="_blank"
            >
              API 金鑰與模型設定 › OCR 解析
            </Link>{' '}
            為「雲端 OCR 謄本解析（解析組）」指派至少一個模型，再回來執行解析。
          </p>
        </div>
      )}

      {parseError && (
        <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
          {parseError}
        </p>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {parseResult && (
        <div className="space-y-2">
          {parseMetadata && (
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <ConfidenceBadge confidence={parseMetadata.total_confidence} />
              <span className="text-text-muted">策略: {parseMetadata.strategy === 'consensus' ? '多模型共識' : '單模型'}</span>
              <span className="text-text-muted">耗時: {(parseMetadata.total_duration_ms / 1000).toFixed(1)}s</span>
              <span className="text-text-muted">
                模型: {parseMetadata.models_used.map((m) => `${m.provider}/${m.model}`).join(', ')}
              </span>
              {parseMetadata.judge_used && (
                <span className="text-amber-600 flex items-center gap-0.5">
                  <Scale size={10} />
                  裁判: {parseMetadata.judge_used.provider}/{parseMetadata.judge_used.model}
                </span>
              )}
              {parseMetadata.conflicts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConflicts((v) => !v)}
                  className="flex items-center gap-0.5 text-amber-600 hover:text-amber-700 underline"
                >
                  <AlertTriangle size={10} />
                  {parseMetadata.conflicts.length} 個衝突欄位
                </button>
              )}
            </div>
          )}

          {showConflicts && parseMetadata && parseMetadata.conflicts.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2 space-y-1.5">
              <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <AlertTriangle size={12} /> 衝突欄位詳情
              </p>
              {parseMetadata.conflicts.map((c, i) => (
                <ConflictItem key={i} conflict={c} confidence={parseMetadata.field_confidences[c.field_path]} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">雲端解析結果</span>
              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary"
              >
                <Download size={12} /> 下載解析報告.md
              </button>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary"
              >
                <Copy size={12} /> 複製
              </button>
              {onTranscribe && (
                <button
                  type="button"
                  onClick={() => {
                    if (!parseResult) return;
                    onTranscribe(transcriptDataForTranscribeFromParseOutput(parseResult, kind));
                  }}
                  disabled={!parseResult}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary disabled:opacity-50"
                  title={`將解析結果謄寫至下方${kind === 'building' ? '建物' : '土地'}全部欄位`}
                >
                  <PenLine size={12} /> 謄寫
                </button>
              )}
            </div>
          </div>
          <pre className="text-xs bg-bg-tertiary border border-border-default rounded-md p-3 overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap break-words">
            {JSON.stringify(parseResult, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Local Python parse error ───────────────────────────────────── */}
      {localParseError && (
        <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
          地端解析錯誤：{localParseError}
        </p>
      )}

      {/* ── Local Python parse result ──────────────────────────────────── */}
      {localParseResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
              <FileCode size={12} />
              地端Python解析結果（{(localParseResult.transcript_type as string) ?? (localParseResult.kind as string) ?? ''}）
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      localParseResult.parsed ??
                      (localParseResult.kind === 'building' ? localParseResult.buildingTranscript : localParseResult.landTranscript) ??
                      localParseResult,
                      null, 2,
                    ),
                  )
                }
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary"
              >
                <Copy size={12} /> 複製
              </button>
              {onTranscribe && (
                <button
                  type="button"
                  onClick={() => {
                    // New unified schema: pick the matching transcript field based on kind; legacy format: .parsed
                    const parsed = localParseResult as Record<string, unknown>;
                    const source = (kind === 'land'
                      ? (parsed.landTranscript ?? parsed.buildingTranscript)
                      : (parsed.buildingTranscript ?? parsed.landTranscript))
                      ?? parsed.parsed
                      ?? localParseResult;

                    if (kind === 'land') {
                      onTranscribe(normalizeLocalParsedToLandTranscriptData(source));
                    } else {
                      onTranscribe(normalizeLocalParsedToBuildingTranscriptData(source));
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary"
                  title={`將解析結果謄寫至下方${kind === 'land' ? '土地' : '建物'}全部欄位`}
                >
                  <PenLine size={12} /> 謄寫
                </button>
              )}
            </div>
          </div>
          <pre className="text-xs bg-bg-tertiary border border-emerald-600/20 rounded-md p-3 overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap break-words">
            {JSON.stringify(
              localParseResult.parsed ??
              (localParseResult.kind === 'building' ? localParseResult.buildingTranscript : localParseResult.landTranscript) ??
              localParseResult,
              null, 2,
            )}
          </pre>
        </div>
      )}

      {/* Prompt Manager Modal */}
      {showPromptManager && (
        <PromptManagerModal
          onClose={() => setShowPromptManager(false)}
          onLoad={(content) => {
            setCustomPrompt(content);
            setIsPromptDirty(true);
            writeLocalStorage(LS_LAST_CUSTOM_PROMPT, content);
            setShowPromptManager(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModelProgressRow({ item }: { item: ModelProgressItem }) {
  const icons: Record<ModelProgressItem['status'], React.ReactNode> = {
    pending: <Clock size={11} className="text-text-muted" />,
    running: <Loader2 size={11} className="animate-spin text-accent" />,
    success: <CheckCircle2 size={11} className="text-green-500" />,
    error: <XCircle size={11} className="text-red-500" />,
    cancelled: <Clock size={11} className="text-text-muted" />,
    skipped: <Clock size={11} className="text-text-muted" />,
  };
  const labels: Record<ModelProgressItem['status'], string> = {
    pending: '等待中',
    running: '解析中…',
    success: item.duration_ms ? `完成 (${(item.duration_ms / 1000).toFixed(1)}s)` : '完成',
    error: item.error ? `失敗：${item.error}` : '失敗',
    cancelled: '已停止',
    skipped: '已略過',
  };
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="mt-0.5 shrink-0">{icons[item.status]}</span>
      <span className="font-mono text-text-secondary shrink-0">{item.provider}/{item.model}</span>
      <span className={`text-text-muted ${item.status === 'error' ? 'text-red-500' : ''}`}>
        {labels[item.status]}
      </span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let colorClass = 'bg-red-500/10 text-red-600 border-red-500/20';
  let icon = <AlertTriangle size={10} />;
  if (confidence >= 0.8) {
    colorClass = 'bg-green-500/10 text-green-600 border-green-500/20';
    icon = <CheckCircle2 size={10} />;
  } else if (confidence >= 0.5) {
    colorClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    icon = <AlertTriangle size={10} />;
  }
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border ${colorClass}`}>
      {icon} 信心 {pct}%
    </span>
  );
}

function ConflictItem({ conflict, confidence }: { conflict: ConflictDetail; confidence?: number }) {
  return (
    <div className="bg-bg-primary rounded p-1.5 text-xs space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-accent">{conflict.field_path}</span>
        {confidence !== undefined && <ConfidenceBadge confidence={confidence} />}
        <span className={`px-1 py-0.5 rounded text-[10px] ${
          conflict.resolved_by === 'judge'
            ? 'bg-blue-500/10 text-blue-600'
            : conflict.resolved_by === 'majority'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-red-500/10 text-red-600'
        }`}>
          {conflict.resolved_by === 'judge' ? '裁判判定' : conflict.resolved_by === 'majority' ? '多數決' : '未解決'}
        </span>
      </div>
      <div className="pl-2 space-y-0.5">
        {conflict.values.map((v, j) => (
          <div key={j} className="text-text-muted">
            <span className="text-text-secondary">{v.provider}/{v.model}:</span>{' '}
            <span className="font-mono">{JSON.stringify(v.value)}</span>
          </div>
        ))}
        {conflict.final_value !== undefined && (
          <div className="text-green-600 font-medium">
            → 最終值: <span className="font-mono">{JSON.stringify(conflict.final_value)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
