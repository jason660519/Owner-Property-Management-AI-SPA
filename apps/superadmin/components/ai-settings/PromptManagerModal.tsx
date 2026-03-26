'use client';

// Component: PromptManagerModal
// Full-screen modal for managing named prompt templates (CRUD).
// When `onLoad` is provided, each prompt row shows a "載入" button that
// calls onLoad(content, name) and closes the modal — used by evaluations pages.
// Standalone page can pass onLoad that postMessages to window.opener; openers listen for PROMPT_LOAD_MESSAGE_TYPE.

export const PROMPT_LOAD_MESSAGE_TYPE = 'PROMPT_LOAD' as const;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookMarked,
  FilePen,
  Loader2,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  deleteSavedPrompt,
  listSavedPrompts,
  savePrompt,
  updatePrompt,
  type SavedPrompt,
} from '@/app/superadmin/settings/evaluations-global-test/promptActions';
import type { TranscriptParsePreset } from '@/lib/transcript-parse-scenario-prompts';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Editor Panel ─────────────────────────────────────────────────────────────

interface EditorPanelProps {
  prompt: SavedPrompt | null; // null = creating new
  onSaved: (prompt: SavedPrompt) => void;
  onDiscard: () => void;
}

function EditorPanel({ prompt, onSaved, onDiscard }: EditorPanelProps) {
  const [name, setName] = useState(prompt?.name ?? '');
  const [content, setContent] = useState(prompt?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(prompt?.name ?? '');
    setContent(prompt?.content ?? '');
    setError(null);
    if (!prompt) setTimeout(() => nameRef.current?.focus(), 60);
  }, [prompt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = prompt
    ? name !== prompt.name || content !== prompt.content
    : name.trim() !== '' || content.trim() !== '';

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    const result = prompt
      ? await updatePrompt(prompt.id, name, content)
      : await savePrompt(name, content);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSaved(result.data!);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle shrink-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <FilePen size={14} className="text-accent" />
          {prompt ? '編輯 Prompt' : '新增 Prompt'}
        </h3>
        <button
          onClick={onDiscard}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="關閉編輯"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary">
            名稱 <span className="text-red-400">*</span>
          </label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：建物謄本解析 v1"
            maxLength={80}
            className="w-full px-3 py-2 text-sm border border-border-default rounded bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary">
            Prompt 內容 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此輸入 Prompt 正文…"
            rows={16}
            className="w-full px-3 py-2 text-sm border border-border-default rounded bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono leading-relaxed resize-y"
          />
          <p className="text-[11px] text-text-muted text-right">
            {content.length.toLocaleString()} 字元
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-subtle shrink-0">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          取消
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => void handleSubmit()}
          disabled={saving || !isDirty}
          isLoading={saving}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          <span className="ml-1.5">{prompt ? '儲存變更' : '建立 Prompt'}</span>
        </Button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface PromptManagerModalProps {
  onClose: () => void;
  /** If provided, each prompt row shows a "載入" button that calls this and closes the modal. */
  onLoad?: (content: string, name: string) => void;
  /** Shown in header when no onLoad (e.g. standalone page without opener) to explain how to get 載入. */
  noOpenerHint?: string;
  /**
   * 謄本解析四情境範本（單一建號／多建號／獨立車位／公設車位），一鍵寫入 saved_prompts。
   * 名稱含 (scenarioKey) 供物件謄本頁自動套用。
   */
  transcriptParsePresets?: readonly TranscriptParsePreset[];
}

export function PromptManagerModal({
  onClose,
  onLoad,
  noOpenerHint,
  transcriptParsePresets,
}: PromptManagerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creatingPresetId, setCreatingPresetId] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);

  const selectedPrompt = prompts.find((p) => p.id === selectedId) ?? null;
  const isEditorOpen = isCreating || selectedId !== null;

  const filtered = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase()),
  );

  // SSR-safe
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch list
  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const result = await listSavedPrompts();
    setLoading(false);
    if (result.error) {
      setFetchError(result.error);
    } else {
      setPrompts(result.data ?? []);
    }
  }, []);

  useEffect(() => {
    void fetchPrompts();
  }, [fetchPrompts]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleSaved = (saved: SavedPrompt) => {
    setPrompts((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    setIsCreating(false);
    setSelectedId(saved.id);
  };

  const handleDiscard = () => {
    setIsCreating(false);
    setSelectedId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteSavedPrompt(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!result.error) {
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleLoadPrompt = (p: SavedPrompt) => {
    onLoad?.(p.content, p.name);
    // Defer close so parent state (e.g. setCustomPrompt) can commit before unmount
    requestAnimationFrame(() => onClose());
  };

  const handleCreateFromTranscriptPreset = async (preset: TranscriptParsePreset) => {
    // If a prompt with the same name already exists, select it instead of creating a duplicate
    const existing = prompts.find((p) => p.name === preset.suggestedName);
    if (existing) {
      setIsCreating(false);
      setSelectedId(existing.id);
      return;
    }

    setPresetError(null);
    setCreatingPresetId(preset.id);
    const result = await savePrompt(preset.suggestedName, preset.content);
    setCreatingPresetId(null);
    if (result.error) {
      setPresetError(result.error);
      return;
    }
    if (result.data) handleSaved(result.data);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        className="bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prompt 管理"
        style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
        className="flex items-center justify-center p-6"
      >
        <div
          style={{ pointerEvents: 'auto', height: 'min(88vh, 760px)' }}
          className="w-full max-w-5xl bg-bg-primary border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
              <BookMarked size={17} className="text-accent" />
              Prompt 管理
            </h2>
            <div className="flex items-center gap-3 max-w-md">
              {onLoad && (
                <p className="text-xs text-text-muted">
                  點擊列表右側「載入」可載入至目前頁面
                </p>
              )}
              {noOpenerHint && (
                <p className="text-xs text-text-muted" title={noOpenerHint}>
                  {noOpenerHint}
                </p>
              )}
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="關閉"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body: split panel */}
          <div className="flex flex-1 min-h-0">
            {/* ── Left: List ── */}
            <div
              className={`flex flex-col border-r border-border-subtle transition-all duration-200 ${
                isEditorOpen ? 'w-80 shrink-0' : 'flex-1'
              }`}
            >
              {/* Search + New */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
                <div className="relative flex-1">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋名稱或內容…"
                    className="w-full pl-8 pr-7 py-1.5 text-sm border border-border-default rounded bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedId(null);
                    setIsCreating(true);
                  }}
                >
                  <Plus size={13} />
                  <span className="ml-1">新增</span>
                </Button>
              </div>

              {/* Stats */}
              <div className="px-4 py-1.5 bg-bg-secondary border-b border-border-subtle text-[11px] text-text-muted">
                共 {prompts.length} 個{search && ` · 篩選後 ${filtered.length} 個`}
              </div>

              {transcriptParsePresets && transcriptParsePresets.length > 0 && (() => {
                const uncreatdPresets = transcriptParsePresets.filter(
                  (p) => !prompts.some((sp) => sp.name === p.suggestedName),
                );
                if (uncreatdPresets.length === 0) return null;
                return (
                  <div className="px-4 py-3 border-b border-border-subtle bg-bg-tertiary/40">
                    <p className="text-[11px] font-semibold text-text-secondary mb-1.5">
                      謄本解析情境 Prompt
                    </p>
                    <p className="text-[10px] text-text-muted leading-relaxed mb-2">
                      建立後名稱會含 <code className="text-[10px] text-accent">(scenarioKey)</code>，物件謄本頁會依單一建號／多建號／獨立車位／公設車位自動套用。
                    </p>
                    {presetError && (
                      <p className="text-[11px] text-red-400 mb-2">{presetError}</p>
                    )}
                    <ul className="space-y-1.5">
                      {uncreatdPresets.map((preset) => (
                        <li key={preset.id}>
                          <button
                            type="button"
                            disabled={!!creatingPresetId}
                            onClick={() => void handleCreateFromTranscriptPreset(preset)}
                            className="w-full text-left rounded-md px-2.5 py-2 border border-border-default bg-bg-primary hover:border-accent/40 hover:bg-bg-secondary transition-colors disabled:opacity-50"
                          >
                            <span className="flex items-center gap-2 text-xs font-medium text-text-primary">
                              {creatingPresetId === preset.id && (
                                <Loader2 size={12} className="animate-spin shrink-0 text-text-muted" />
                              )}
                              {preset.label}
                            </span>
                            <span className="block text-[10px] text-text-muted mt-0.5 line-clamp-2">
                              {preset.description}
                            </span>
                            <span className="block text-[10px] text-text-muted/80 mt-1 font-mono truncate">
                              {preset.suggestedName}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-text-muted text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    載入中…
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                    <p className="text-sm text-red-400">{fetchError}</p>
                    <Button size="sm" variant="ghost" onClick={() => void fetchPrompts()}>
                      重試
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                    {search ? (
                      <p className="text-sm text-text-muted">沒有符合「{search}」的結果</p>
                    ) : (
                      <>
                        <BookMarked size={30} className="text-text-muted opacity-40" />
                        <p className="text-sm text-text-muted">尚未儲存任何 Prompt</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedId(null);
                            setIsCreating(true);
                          }}
                        >
                          <Plus size={13} />
                          <span className="ml-1">建立第一個 Prompt</span>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle">
                    {filtered.map((p) => (
                      <li
                        key={p.id}
                        className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                          selectedId === p.id
                            ? 'bg-accent/8 border-l-2 border-accent'
                            : 'hover:bg-bg-secondary border-l-2 border-transparent'
                        }`}
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedId(p.id === selectedId ? null : p.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {p.name}
                            </p>
                            {!isEditorOpen && (
                              <p className="mt-0.5 text-[11px] text-text-secondary font-mono leading-snug line-clamp-2">
                                {p.content.slice(0, 120)}
                                {p.content.length > 120 && '…'}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-text-muted">
                              {formatDate(p.updated_at)}
                            </p>
                          </div>

                          {/* Row actions */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Load to caller */}
                            {onLoad && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadPrompt(p);
                                }}
                                title="載入此 Prompt 至目前頁面"
                                className="px-2 py-1 text-[11px] rounded text-text-secondary hover:text-green-500 hover:bg-green-500/10 transition-colors"
                              >
                                載入
                              </button>
                            )}

                            {/* Copy */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleCopy(p.content, p.id);
                              }}
                              title="複製內容至剪貼簿"
                              className="px-2 py-1 text-[11px] rounded text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                            >
                              {copiedId === p.id ? (
                                <span className="text-green-500">已複製</span>
                              ) : (
                                <span>複製</span>
                              )}
                            </button>

                            {/* Delete */}
                            {confirmDeleteId === p.id ? (
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => void handleDelete(p.id)}
                                  disabled={deletingId === p.id}
                                  className="px-2 py-0.5 text-[11px] rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === p.id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    '確認刪除'
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 text-[11px] rounded border border-border-default text-text-secondary hover:text-text-primary transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(p.id);
                                }}
                                title="刪除"
                                className="px-2 py-1 text-[11px] rounded text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                刪除
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ── Right: Editor ── */}
            {isEditorOpen && (
              <div className="flex-1 min-w-0">
                <EditorPanel
                  prompt={isCreating ? null : selectedPrompt}
                  onSaved={handleSaved}
                  onDiscard={handleDiscard}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
