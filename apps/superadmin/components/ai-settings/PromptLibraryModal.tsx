'use client';

// Component: PromptLibraryModal
// Two modes:
//   • 'save'  — prompt user for a name, then save current content to Supabase
//   • 'load'  — list saved prompts, load one into the editor

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, Check, Loader2, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  deleteSavedPrompt,
  listSavedPrompts,
  savePrompt,
  type SavedPrompt,
} from '@/app/superadmin/settings/evaluations-global-test/promptActions';

// ─── types ────────────────────────────────────────────────────────────────────

export type PromptLibraryMode = 'save' | 'load';

interface PromptLibraryModalProps {
  mode: PromptLibraryMode;
  currentContent: string;        // used in 'save' mode
  onLoad: (content: string) => void; // called in 'load' mode
  onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── component ────────────────────────────────────────────────────────────────

export function PromptLibraryModal({
  mode,
  currentContent,
  onLoad,
  onClose,
}: PromptLibraryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // SSR-safe portal mount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Auto-focus save name input
  useEffect(() => {
    if (mode === 'save' && mounted) {
      setTimeout(() => nameInputRef.current?.focus(), 60);
    }
  }, [mode, mounted]);

  // Fetch list when in load mode
  const fetchPrompts = useCallback(async () => {
    setLoadingList(true);
    const result = await listSavedPrompts();
    setLoadingList(false);
    if (result.error) {
      setFeedback({ type: 'err', msg: result.error });
    } else {
      setPrompts(result.data ?? []);
    }
  }, []);

  useEffect(() => {
    if (mode === 'load') fetchPrompts();
  }, [mode, fetchPrompts]);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── save handler ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!saveName.trim()) {
      setFeedback({ type: 'err', msg: '請輸入 Prompt 名稱' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const result = await savePrompt(saveName, currentContent);
    setSaving(false);
    if (result.error) {
      setFeedback({ type: 'err', msg: result.error });
    } else {
      setFeedback({ type: 'ok', msg: `「${result.data!.name}」已儲存` });
      setSaveName('');
      setTimeout(() => onClose(), 900);
    }
  };

  // ── load handler ────────────────────────────────────────────────────────────

  const handleLoad = (prompt: SavedPrompt) => {
    setLoadedId(prompt.id);
    onLoad(prompt.content);
    setTimeout(() => onClose(), 400);
  };

  // ── delete handler ──────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteSavedPrompt(id);
    setDeletingId(null);
    if (result.error) {
      setFeedback({ type: 'err', msg: result.error });
    } else {
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (!mounted) return null;

  const title = mode === 'save' ? '儲存 Prompt' : '載入 Prompt';

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        className="bg-black/60"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
        className="flex items-center justify-center p-4"
      >
        <div
          style={{ pointerEvents: 'auto' }}
          className="w-full max-w-lg bg-bg-primary border border-border-default rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {mode === 'save' ? (
                <Save size={16} className="text-accent" />
              ) : (
                <BookMarked size={16} className="text-accent" />
              )}
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="關閉"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {/* ── Save mode ── */}
            {mode === 'save' && (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary">
                  為目前的 Prompt 取一個名稱，方便之後快速載入。
                </p>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text-secondary">
                    名稱 <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSave();
                    }}
                    placeholder="例：建物謄本解析 v1"
                    maxLength={80}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Preview */}
                <div className="space-y-1">
                  <span className="text-xs text-text-muted">
                    Prompt 預覽（前 200 字）
                  </span>
                  <div className="rounded border border-border-subtle bg-bg-secondary px-3 py-2 text-xs text-text-secondary font-mono leading-relaxed max-h-28 overflow-hidden">
                    {currentContent.slice(0, 200)}
                    {currentContent.length > 200 && (
                      <span className="text-text-muted">…</span>
                    )}
                  </div>
                </div>

                {feedback && (
                  <p
                    className={`text-xs ${feedback.type === 'ok' ? 'text-green-500' : 'text-red-400'}`}
                  >
                    {feedback.msg}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void handleSave()}
                    isLoading={saving}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    <span className="ml-1.5">儲存</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Load mode ── */}
            {mode === 'load' && (
              <div className="space-y-3">
                {loadingList ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-text-muted text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    載入中…
                  </div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-10 text-text-muted text-sm">
                    尚未儲存任何 Prompt
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {prompts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-2 rounded border border-border-subtle bg-bg-secondary p-3 hover:border-accent/50 transition-colors group"
                      >
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted font-mono leading-snug line-clamp-2">
                            {p.content.slice(0, 120)}
                            {p.content.length > 120 && '…'}
                          </p>
                          <p className="mt-1 text-[10px] text-text-muted">
                            {formatDate(p.updated_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleLoad(p)}
                            title="載入此 Prompt"
                            className="p-1.5 rounded text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                          >
                            {loadedId === p.id ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <BookMarked size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => void handleDelete(p.id)}
                            title="刪除此 Prompt"
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                          >
                            {deletingId === p.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {feedback && (
                  <p
                    className={`text-xs ${feedback.type === 'ok' ? 'text-green-500' : 'text-red-400'}`}
                  >
                    {feedback.msg}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    關閉
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
