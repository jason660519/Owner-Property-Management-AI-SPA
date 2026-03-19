'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  CopyPlus,
  Download,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  type DescriptionGenerationGoal,
  type DescriptionGenerationLength,
  type DescriptionGenerationTone,
} from '@/lib/actions/propertyAI';

type TracePhase =
  | 'collecting_context'
  | 'loading_prompt'
  | 'selecting_model'
  | 'building_prompt'
  | 'sending_request'
  | 'waiting_response'
  | 'completed';

type TraceEvent =
  | { type: 'phase'; phase: TracePhase; message: string }
  | { type: 'resources'; resources: Array<{ label: string; value: string }> }
  | {
      type: 'prompt_loaded';
      promptName: string;
      promptSource: 'ai_system_prompt' | 'saved_prompt' | 'default';
      moduleKey?: string | null;
      templatePreview: string;
      finalPromptPreview: string;
    }
  | {
      type: 'model_selected';
      provider: string;
      model: string;
      apiKeySource: 'ai_settings' | 'env' | 'missing';
      moduleKey?: string | null;
      selectionSource?: 'ai_module' | 'default';
    }
  | { type: 'response_meta'; status: number; durationMs: number }
  | {
      type: 'complete';
      description: string;
      durationMs: number;
      usage?: { inputTokens?: number; outputTokens?: number };
    }
  | { type: 'error'; message: string };

interface TraceStep {
  phase: TracePhase;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface TraceDetails {
  resources: Array<{ label: string; value: string }>;
  promptName: string | null;
  promptSource: 'ai_system_prompt' | 'saved_prompt' | 'default' | null;
  promptModuleKey: string | null;
  templatePreview: string;
  finalPromptPreview: string;
  provider: string | null;
  model: string | null;
  apiKeySource: 'ai_settings' | 'env' | 'missing' | null;
  modelModuleKey: string | null;
  selectionSource: 'ai_module' | 'default' | null;
  responseStatus: number | null;
  durationMs: number | null;
  usage?: { inputTokens?: number; outputTokens?: number };
}

interface TraceReportInput {
  phaseMessage: string;
  traceSteps: TraceStep[];
  traceDetails: TraceDetails;
  generatedDraft: string;
  generationError: string | null;
}

const TRACE_PHASES: Array<{ phase: TracePhase; label: string }> = [
  { phase: 'collecting_context', label: '蒐集物件資料' },
  { phase: 'loading_prompt', label: '載入 Prompt 模板' },
  { phase: 'selecting_model', label: '選擇 LLM 與金鑰' },
  { phase: 'building_prompt', label: '建立最終 Prompt' },
  { phase: 'sending_request', label: '送出 AI 請求' },
  { phase: 'waiting_response', label: '等待模型回應' },
  { phase: 'completed', label: '草稿完成' },
];

function createInitialTraceSteps(): TraceStep[] {
  return TRACE_PHASES.map((item) => ({ phase: item.phase, label: item.label, status: 'pending' }));
}

function getInitialTraceDetails(): TraceDetails {
  return {
    resources: [],
    promptName: null,
    promptSource: null,
    promptModuleKey: null,
    templatePreview: '',
    finalPromptPreview: '',
    provider: null,
    model: null,
    apiKeySource: null,
    modelModuleKey: null,
    selectionSource: null,
    responseStatus: null,
    durationMs: null,
    usage: undefined,
  };
}

function formatTraceReport({
  phaseMessage,
  traceSteps,
  traceDetails,
  generatedDraft,
  generationError,
}: TraceReportInput): string {
  const sections: string[] = [];

  sections.push('物件介紹 AI 生成 Trace');
  sections.push(`狀態摘要：${generationError ?? (phaseMessage || '—')}`);
  sections.push('');
  sections.push('流程狀態');
  sections.push(...traceSteps.map((step) => `- ${step.label}: ${step.status}`));
  sections.push('');
  sections.push('LLM 資訊');
  sections.push(`- Provider: ${traceDetails.provider ?? '—'}`);
  sections.push(`- Model: ${traceDetails.model ?? '—'}`);
  sections.push(`- Module Key: ${traceDetails.modelModuleKey ?? '—'}`);
  sections.push(
    `- 模型來源: ${
      traceDetails.selectionSource === 'ai_module'
        ? 'AI Module Assignment'
        : traceDetails.selectionSource === 'default'
          ? '系統預設'
          : '—'
    }`
  );
  sections.push(
    `- 金鑰來源: ${
      traceDetails.apiKeySource === 'ai_settings'
        ? 'AI 服務 / API KEY'
        : traceDetails.apiKeySource === 'env'
          ? '.env'
          : '—'
    }`
  );
  sections.push(`- HTTP 狀態: ${traceDetails.responseStatus ?? '—'}`);
  sections.push(
    `- 耗時: ${traceDetails.durationMs != null ? `${(traceDetails.durationMs / 1000).toFixed(1)}s` : '—'}`
  );
  if (traceDetails.usage?.inputTokens || traceDetails.usage?.outputTokens) {
    sections.push(`- Tokens: in ${traceDetails.usage?.inputTokens ?? 0} / out ${traceDetails.usage?.outputTokens ?? 0}`);
  }
  sections.push('');
  sections.push('Prompt 資訊');
  sections.push(`- 名稱: ${traceDetails.promptName ?? '—'}`);
  sections.push(`- Module Key: ${traceDetails.promptModuleKey ?? '—'}`);
  sections.push(
    `- 來源: ${
      traceDetails.promptSource === 'ai_system_prompt'
        ? 'ai_system_prompts'
        : traceDetails.promptSource === 'saved_prompt'
        ? 'saved_prompts'
        : traceDetails.promptSource === 'default'
          ? '系統預設'
          : '—'
    }`
  );
  sections.push('');

  if (traceDetails.resources.length > 0) {
    sections.push('本次使用的資源');
    sections.push(...traceDetails.resources.map((resource) => `- ${resource.label}: ${resource.value}`));
    sections.push('');
  }

  if (traceDetails.finalPromptPreview) {
    sections.push('最終 Prompt 預覽');
    sections.push(traceDetails.finalPromptPreview);
    sections.push('');
  }

  if (generatedDraft) {
    sections.push('AI 草稿');
    sections.push(generatedDraft);
    sections.push('');
  }

  if (generationError) {
    sections.push('錯誤');
    sections.push(generationError);
  }

  return sections.join('\n');
}

const toneOptions: Array<{ value: DescriptionGenerationTone; label: string }> = [
  { value: 'professional', label: '專業銷售' },
  { value: 'warm', label: '溫暖居家' },
  { value: 'investment', label: '投資導向' },
];

const lengthOptions: Array<{ value: DescriptionGenerationLength; label: string }> = [
  { value: 'short', label: '精簡版' },
  { value: 'medium', label: '標準版' },
  { value: 'long', label: '完整說服版' },
];

const goalOptions: Array<{ value: DescriptionGenerationGoal; label: string }> = [
  { value: 'listing', label: '物件介紹' },
  { value: 'ad', label: '廣告文案' },
  { value: 'summary', label: '網站摘要' },
];

interface PropertyDescriptionAIAssistantProps {
  listingType: 'sale' | 'rental';
  title: string;
  propertyType: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  livingRooms: number;
  parkingSpaces: number;
  price: number;
  monthlyRent: number;
  addressCity: string;
  addressDistrict: string;
  addressStreet: string;
  addressNumber: string;
  addressFloor: string;
  addressUnit: string;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function PropertyDescriptionAIAssistant({
  listingType,
  title,
  propertyType,
  area,
  bedrooms,
  bathrooms,
  livingRooms,
  parkingSpaces,
  price,
  monthlyRent,
  addressCity,
  addressDistrict,
  addressStreet,
  addressNumber,
  addressFloor,
  addressUnit,
  description,
  onDescriptionChange,
}: PropertyDescriptionAIAssistantProps) {
  const [tone, setTone] = useState<DescriptionGenerationTone>('professional');
  const [length, setLength] = useState<DescriptionGenerationLength>('medium');
  const [goal, setGoal] = useState<DescriptionGenerationGoal>('listing');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastAppliedDescription, setLastAppliedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>(createInitialTraceSteps);
  const [traceDetails, setTraceDetails] = useState<TraceDetails>(getInitialTraceDetails);
  const [showTraceDetails, setShowTraceDetails] = useState(false);
  const [traceActionMessage, setTraceActionMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dataSignals = useMemo(
    () => [
      { label: '標題', ready: Boolean(title.trim()) },
      { label: '物件類型', ready: Boolean(propertyType.trim()) },
      { label: '價格', ready: listingType === 'sale' ? price > 0 : monthlyRent > 0 },
      { label: '格局', ready: bedrooms > 0 || bathrooms > 0 || livingRooms > 0 },
      { label: '面積', ready: area > 0 },
      { label: '地址', ready: Boolean(addressCity || addressDistrict || addressStreet || addressNumber) },
      { label: '樓層', ready: Boolean(addressFloor.trim()) },
    ],
    [
      title,
      propertyType,
      listingType,
      price,
      monthlyRent,
      bedrooms,
      bathrooms,
      livingRooms,
      area,
      addressCity,
      addressDistrict,
      addressStreet,
      addressNumber,
      addressFloor,
    ],
  );

  const missingFields = useMemo(
    () => dataSignals.filter((signal) => !signal.ready).map((signal) => signal.label),
    [dataSignals],
  );

  const hasTraceData =
    isGenerating ||
    traceDetails.resources.length > 0 ||
    Boolean(traceDetails.promptName) ||
    Boolean(traceDetails.model) ||
    Boolean(phaseMessage) ||
    Boolean(generatedDraft) ||
    Boolean(generationError);

  const traceReport = hasTraceData
    ? formatTraceReport({
        phaseMessage,
        traceSteps,
        traceDetails,
        generatedDraft,
        generationError,
      })
    : '';

  const updateTracePhase = (phase: TracePhase, status: 'running' | 'completed' | 'error') => {
    const currentIndex = TRACE_PHASES.findIndex((item) => item.phase === phase);
    setTraceSteps((prev) =>
      prev.map((step, index) => {
        if (index < currentIndex) {
          return step.status === 'error' ? step : { ...step, status: 'completed' };
        }
        if (step.phase === phase) {
          return { ...step, status };
        }
        if (status === 'error' && step.status === 'running') {
          return { ...step, status: 'error' };
        }
        return step;
      })
    );
  };

  const handleTraceEvent = (event: TraceEvent) => {
    switch (event.type) {
      case 'phase':
        setPhaseMessage(event.message);
        updateTracePhase(event.phase, event.phase === 'completed' ? 'completed' : 'running');
        break;
      case 'resources':
        setTraceDetails((prev) => ({ ...prev, resources: event.resources }));
        break;
      case 'prompt_loaded':
        setTraceDetails((prev) => ({
          ...prev,
          promptName: event.promptName,
          promptSource: event.promptSource,
          promptModuleKey: event.moduleKey ?? null,
          templatePreview: event.templatePreview,
          finalPromptPreview: event.finalPromptPreview,
        }));
        break;
      case 'model_selected':
        setTraceDetails((prev) => ({
          ...prev,
          provider: event.provider,
          model: event.model,
          apiKeySource: event.apiKeySource,
          modelModuleKey: event.moduleKey ?? null,
          selectionSource: event.selectionSource ?? null,
        }));
        break;
      case 'response_meta':
        setTraceDetails((prev) => ({
          ...prev,
          responseStatus: event.status,
          durationMs: event.durationMs,
        }));
        break;
      case 'complete':
        setGeneratedDraft(event.description);
        setTraceDetails((prev) => ({
          ...prev,
          durationMs: event.durationMs,
          usage: event.usage,
        }));
        setPhaseMessage('AI 草稿已完成');
        updateTracePhase('completed', 'completed');
        break;
      case 'error':
        setGenerationError(event.message);
        setPhaseMessage(event.message);
        setTraceSteps((prev) => {
          const runningStep = [...prev].reverse().find((step) => step.status === 'running');
          if (!runningStep) {
            return prev;
          }
          return prev.map((step) =>
            step.phase === runningStep.phase ? { ...step, status: 'error' } : step
          );
        });
        break;
    }
  };

  const handleGenerate = async () => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setGeneratedDraft('');
    setGenerationError(null);
    setTraceActionMessage(null);
    setPhaseMessage('初始化中…');
    setTraceSteps(createInitialTraceSteps());
    setTraceDetails(getInitialTraceDetails());
    setShowTraceDetails(true);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/property-description/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingType,
          title: title || undefined,
          propertyType: propertyType || undefined,
          area: area > 0 ? area : undefined,
          bedrooms: bedrooms || undefined,
          bathrooms: bathrooms || undefined,
          livingRooms: livingRooms || undefined,
          parkingSpaces: parkingSpaces || undefined,
          price: price || undefined,
          monthlyRent: monthlyRent || undefined,
          addressCity: addressCity || undefined,
          addressDistrict: addressDistrict || undefined,
          addressStreet: addressStreet || undefined,
          addressNumber: addressNumber || undefined,
          addressFloor: addressFloor || undefined,
          addressUnit: addressUnit || undefined,
          currentDescription: description.trim() || undefined,
          generationTone: tone,
          generationLength: length,
          generationGoal: goal,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        setGenerationError(`串流請求失敗 (${response.status})`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processBuffer = () => {
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            handleTraceEvent(JSON.parse(chunk.slice(6)) as TraceEvent);
          } catch {
            // Ignore malformed events
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }
        if (done) {
          if (buffer.trim()) {
            const chunks = buffer.split('\n\n');
            for (const chunk of chunks) {
              if (!chunk.startsWith('data: ')) continue;
              try {
                handleTraceEvent(JSON.parse(chunk.slice(6)) as TraceEvent);
              } catch {
                // Ignore malformed events
              }
            }
          }
          break;
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setGenerationError(error instanceof Error ? error.message : 'AI 生成失敗');
      }
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
      setIsGenerating(false);
    }
  };

  const applyDraft = () => {
    setLastAppliedDescription(description);
    onDescriptionChange(generatedDraft);
  };

  const appendDraft = () => {
    setLastAppliedDescription(description);
    onDescriptionChange(description.trim() ? `${description.trim()}\n\n${generatedDraft}` : generatedDraft);
  };

  const restoreLastApplied = () => {
    if (lastAppliedDescription === null) {
      return;
    }

    onDescriptionChange(lastAppliedDescription);
    setLastAppliedDescription(null);
  };

  const copyTraceReport = async () => {
    if (!traceReport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(traceReport);
      setTraceActionMessage('已複製 trace');
    } catch {
      setTraceActionMessage('無法複製 trace，請確認瀏覽器權限');
    }
  };

  const downloadTraceReport = () => {
    if (!traceReport) {
      return;
    }

    const blob = new Blob([traceReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `property-description-trace-${timestamp}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setTraceActionMessage('已下載 trace');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-default bg-bg-primary/40 p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>AI 協作撰稿</span>
            </div>
            <p className="text-xs text-text-muted">
              AI 會先產生草稿預覽，不會直接覆蓋目前文案。
            </p>
          </div>
          <a
            href="/superadmin/settings/prompt-management"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
            title="管理「物件描述文案」Prompt 範本"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>管理 Prompt</span>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs text-text-muted">
            <span className="block">文案風格</span>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as DescriptionGenerationTone)}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {toneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs text-text-muted">
            <span className="block">輸出長度</span>
            <select
              value={length}
              onChange={(event) => setLength(event.target.value as DescriptionGenerationLength)}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {lengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs text-text-muted">
            <span className="block">使用目的</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as DescriptionGenerationGoal)}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">本次會使用的資料</span>
            {dataSignals.map((signal) => (
              <span
                key={signal.label}
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
                  signal.ready
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}
              >
                {signal.label}
              </span>
            ))}
          </div>

          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>建議先補齊 {missingFields.join('、')}，文案會更準。</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? '草稿產生中…' : '產生 AI 草稿'}
          </button>
          <span className="text-xs text-text-muted">生成後先預覽，再決定是否套用到最終文案。</span>
        </div>

        {hasTraceData && (
          <div className="rounded-lg border border-border-default bg-bg-tertiary/60 p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">生成過程追蹤</p>
                <p className="text-xs text-text-muted">
                  {phaseMessage || '系統會在這裡即時顯示本次生成使用的資源、Prompt 與 LLM。'}
                </p>
                {traceActionMessage && <p className="text-xs text-accent">{traceActionMessage}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyTraceReport();
                  }}
                  disabled={!traceReport}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CopyPlus className="h-3.5 w-3.5" />
                  複製 trace
                </button>
                <button
                  type="button"
                  onClick={downloadTraceReport}
                  disabled={!traceReport}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  下載 trace
                </button>
                <button
                  type="button"
                  onClick={() => setShowTraceDetails((value) => !value)}
                  className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  {showTraceDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showTraceDetails ? '收合詳細 trace' : '展開詳細 trace'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {traceSteps.map((step) => (
                <TraceStepRow key={step.phase} step={step} />
              ))}
            </div>

            {showTraceDetails && (
              <div className="space-y-3 rounded-md border border-border-default bg-bg-primary px-3 py-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-text-secondary">LLM 資訊</p>
                    <p className="text-text-muted">Provider: {traceDetails.provider ?? '—'}</p>
                    <p className="text-text-muted">Model: {traceDetails.model ?? '—'}</p>
                    <p className="text-text-muted">Module Key: {traceDetails.modelModuleKey ?? '—'}</p>
                    <p className="text-text-muted">
                      模型來源: {traceDetails.selectionSource === 'ai_module' ? 'AI Module Assignment' : traceDetails.selectionSource === 'default' ? '系統預設' : '—'}
                    </p>
                    <p className="text-text-muted">
                      金鑰來源:{' '}
                      {traceDetails.apiKeySource === 'ai_settings'
                        ? 'AI 服務 / API KEY'
                        : traceDetails.apiKeySource === 'env'
                          ? '.env'
                          : '—'}
                    </p>
                    <p className="text-text-muted">HTTP 狀態: {traceDetails.responseStatus ?? '—'}</p>
                    <p className="text-text-muted">
                      耗時: {traceDetails.durationMs != null ? `${(traceDetails.durationMs / 1000).toFixed(1)}s` : '—'}
                    </p>
                    {(traceDetails.usage?.inputTokens || traceDetails.usage?.outputTokens) && (
                      <p className="text-text-muted">
                        Tokens: in {traceDetails.usage?.inputTokens ?? 0} / out {traceDetails.usage?.outputTokens ?? 0}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-text-secondary">Prompt 資訊</p>
                    <p className="text-text-muted">名稱: {traceDetails.promptName ?? '—'}</p>
                    <p className="text-text-muted">Module Key: {traceDetails.promptModuleKey ?? '—'}</p>
                    <p className="text-text-muted">
                      來源:{' '}
                      {traceDetails.promptSource === 'ai_system_prompt'
                        ? 'ai_system_prompts'
                        : traceDetails.promptSource === 'saved_prompt'
                        ? 'saved_prompts'
                        : traceDetails.promptSource === 'default'
                          ? '系統預設'
                          : '—'}
                    </p>
                  </div>
                </div>

                {traceDetails.resources.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-text-secondary">本次使用的資源</p>
                    <div className="flex flex-wrap gap-2">
                      {traceDetails.resources.map((resource) => (
                        <span
                          key={`${resource.label}-${resource.value}`}
                          className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
                        >
                          {resource.label}：{resource.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {traceDetails.finalPromptPreview && (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-text-secondary">最終 Prompt 預覽</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-xs text-text-muted">
                      {traceDetails.finalPromptPreview}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {generationError && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {generationError}
          </div>
        )}

        {generatedDraft && (
          <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">AI 草稿預覽</p>
                <p className="text-xs text-text-muted">先檢查內容，再決定覆蓋、附加或重新生成。</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyDraft}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  套用草稿
                </button>
                <button
                  type="button"
                  onClick={appendDraft}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
                >
                  <CopyPlus className="h-3.5 w-3.5" />
                  附加到文案
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  重新生成
                </button>
                {lastAppliedDescription !== null && (
                  <button
                    type="button"
                    onClick={restoreLastApplied}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    還原上次套用
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border-default bg-bg-primary px-3 py-3 text-sm leading-6 text-text-primary whitespace-pre-wrap">
              {generatedDraft}
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="property-description" className="mb-1.5 block text-sm font-medium text-text-secondary">
          最終物件介紹
        </label>
        <textarea
          id="property-description"
          rows={6}
          placeholder="輸入最終物件介紹，或先用 AI 產生草稿後再手動調整..."
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="w-full resize-y rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}

function TraceStepRow({ step }: { step: TraceStep }) {
  const iconMap: Record<TraceStep['status'], React.ReactNode> = {
    pending: <Clock3 className="h-3.5 w-3.5 text-text-muted" />,
    running: <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  };

  const labelMap: Record<TraceStep['status'], string> = {
    pending: '等待中',
    running: '進行中',
    completed: '已完成',
    error: '失敗',
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-xs">
      {iconMap[step.status]}
      <span className="font-medium text-text-secondary">{step.label}</span>
      <span className={`ml-auto ${step.status === 'error' ? 'text-red-500' : 'text-text-muted'}`}>
        {labelMap[step.status]}
      </span>
    </div>
  );
}