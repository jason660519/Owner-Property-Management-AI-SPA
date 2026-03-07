// filepath: apps/superadmin/components/admin/properties/TranscriptParseSection.tsx
// created: 2026-03-04 | creator: Claude Sonnet 4.6
// AI 謄本解析區塊 — pre-execution settings panel + real-time per-model progress + results display.
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Loader2, ChevronDown, ChevronUp, Settings2,
  AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink,
  Copy, Download, Scale, Info, PenLine,
} from 'lucide-react';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';
import {
  DEFAULT_PARSER_CONCURRENCY,
  PARSER_CONCURRENCY_OPTIONS,
  resolveParserConcurrency,
} from '@/lib/utils/parser-concurrency';
import { getDocumentParseResult } from '@/lib/actions/properties';
import type { PropertyDocumentItem } from '@/lib/types/properties';
import type { LandRegistryParsedResult, ConsensusMetadata, ConflictDetail } from '@/lib/types/transcript';

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
  | { type: 'complete'; result: LandRegistryParsedResult; metadata: ConsensusMetadata }
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
  /** When provided, show "謄寫" button and call with parse result to fill building form below */
  onTranscribe?: (result: LandRegistryParsedResult) => void;
}

export function TranscriptParseSection({ transcriptDocs, onTranscribe }: Props) {
  const { userId: aiUserId, modules: aiModules, prompts } = useAISettings();

  // Document selection
  const [selectedDocId, setSelectedDocId] = useState('');

  // Pre-execution settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isPromptDirty, setIsPromptDirty] = useState(false);
  const [parserConcurrency, setParserConcurrency] = useState<number>(DEFAULT_PARSER_CONCURRENCY);
  type ParserModelSelection = { provider: string; model: string; priority?: number; enabled: boolean };
  const [parserModelSelection, setParserModelSelection] = useState<ParserModelSelection[]>([]);

  // Parse state
  const [isParsing, setIsParsing] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [modelProgress, setModelProgress] = useState<ModelProgressItem[]>([]);

  // Results
  const [parseResult, setParseResult] = useState<LandRegistryParsedResult | null>(null);
  const [parseMetadata, setParseMetadata] = useState<ConsensusMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);

  // AbortController for cancelling the fetch stream
  const abortRef = useRef<AbortController | null>(null);
  const parseRunIdRef = useRef(0);

  // Auto-select first document when list changes
  useEffect(() => {
    if (transcriptDocs.length > 0 && !transcriptDocs.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(transcriptDocs[0].id);
      setParseError(null);
    }
  }, [transcriptDocs, selectedDocId]);

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
    () => aiModules.find((m) => m.module_key === 'online_ocr_parse' || m.module_key === 'online_ocr'),
    [aiModules],
  );
  const ocrJudgeModule = useMemo(
    () => aiModules.find((m) => m.module_key === 'online_ocr_judge'),
    [aiModules],
  );
  const storedParsePrompt = useMemo(() => {
    const matched = prompts
      .filter((p) => p.module_key === 'online_ocr_parse' && p.prompt_content.trim())
      .sort((a, b) => b.version - a.version);
    return matched[0]?.prompt_content ?? '';
  }, [prompts]);
  const effectiveParsePrompt = storedParsePrompt || TRANSCRIPT_PARSE_PROMPT;
  const isCustomPromptOverridden = isPromptDirty && customPrompt.trim() !== effectiveParsePrompt.trim();
  const enabledParserCount = parserModelSelection.filter((m) => m.enabled).length;
  const effectiveParserConcurrency = resolveParserConcurrency(
    parserConcurrency,
    enabledParserCount || parserModelSelection.length || 1,
  );

  useEffect(() => {
    if (!isPromptDirty) {
      setCustomPrompt(effectiveParsePrompt);
    }
  }, [effectiveParsePrompt, isPromptDirty]);

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
        setPhaseLabel(`解析中（同時最多 ${event.concurrency} 個，目標成功 ${event.targetSuccessCount} 個）…`);
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

    const enabledParserModels = parserModelSelection.filter((m) => m.enabled);
    if (parserModelSelection.length > 0 && enabledParserModels.length === 0) {
      setParseError('請至少勾選一個解析模型，或在 AI 設定中為「雲端OCR謄本解析」設定解析模型。');
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    parseRunIdRef.current += 1;
    const runId = parseRunIdRef.current;

    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    setParseMetadata(null);
    setShowConflicts(false);
    setModelProgress([]);
    setPhaseLabel('初始化中…');

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
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
          AI 解析謄本
        </p>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          title="解析設定"
        >
          <Settings2 size={12} />
          解析設定
          {showSettings ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      <p className="text-xs text-text-muted">
        選擇已上傳的謄本，由「雲端OCR謄本解析」指定之 AI 模型解析，輸出重要資訊 JSON。
      </p>

      {/* ── Pre-execution settings panel ─────────────────────────────── */}
      {showSettings && (
        <div className="bg-bg-tertiary border border-border-default rounded-md p-3 space-y-3 text-xs">
          {/* Parser models */}
          <div className="space-y-1">
            <p className="font-medium text-text-secondary flex items-center gap-1">
              <Info size={11} className="text-accent" />
              解析模型（雲端OCR謄本解析）
            </p>
            {parserModelSelection.length > 0 ? (
              <>
                <ul className="pl-3 space-y-0.5">
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
                <p className="pl-3 text-[11px] text-text-muted mt-1">
                  僅影響本次解析會呼叫哪些模型，不會修改「AI 服務設定」中的模組綁定。
                </p>
              </>
            ) : (
              <p className="pl-3 text-amber-600 flex items-center gap-1">
                <AlertTriangle size={11} />
                尚未設定解析模型，解析將失敗
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
                系統會先平行呼叫這麼多模型，失敗就立即補下一個，累積 5 個成功結果後停止。
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                依目前已勾選模型數，本次實際同時最多會跑 {effectiveParserConcurrency} 個。
              </p>
            </div>
          </div>

          {/* Custom prompt override */}
          <div className="space-y-1.5">
            <p className="font-medium text-text-secondary">此次解析 Prompt（已預填，可修改）</p>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setIsPromptDirty(true);
              }}
              placeholder="留空則使用 AI 設定中已儲存的 Prompt（若無則使用預設 Prompt）"
              rows={4}
              className="w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs resize-y focus:outline-none focus:border-accent placeholder:text-text-muted"
              disabled={isParsing}
            />
            {!isPromptDirty && (
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

          {/* Link to AI settings */}
          <a
            href="/superadmin/settings/api_key_and_model_setting#evaluations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <ExternalLink size={11} />
            前往 AI 服務設定配置模型與 Prompt
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

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={!selectedDocId || isParsing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
      >
        {isParsing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
        {isParsing ? (phaseLabel || '解析中…') : '雲端解析謄本'}
      </button>

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
              <span className="text-xs font-medium text-text-secondary">解析結果 (JSON)</span>
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
                  onClick={() => parseResult && onTranscribe(parseResult)}
                  disabled={!parseResult}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border-default hover:bg-bg-tertiary text-text-secondary disabled:opacity-50"
                  title="將解析結果謄寫至下方建物全部欄位"
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
