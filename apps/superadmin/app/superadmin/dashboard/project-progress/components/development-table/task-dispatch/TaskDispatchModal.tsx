'use client';

// Lightweight modal for configuring and dispatching a Paperclip issue.
// Closes automatically after a successful send — live status is tracked
// inline by TaskStatusChip / TaskDetailPanel, not by this modal.

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { PromptContext, IDEOption, ProgressRow } from '../types';
import { RUNTIME_OPTIONS, buildPromptContext } from '../types';
import { buildIssuePayload, isValidPaperclipRole } from '@/lib/paperclip/buildIssuePayload';
import type { BuildIssuePayloadResult } from '@/lib/paperclip/buildIssuePayload';
import { getPaperclipConfig } from '@/lib/paperclip/config';
import type { CreateIssueResult, PaperclipIssueResource } from '@/lib/paperclip/client';
import type { WorktreePaths } from '@/lib/paperclip/worktree';
import { formatPaperclipErrorWithHint } from '@/lib/paperclip/api-error-meta';
import { ADAPTER_OPTIONS, getModelForAdapter } from '@/lib/paperclip/adapter-models';
import { WORK_CATEGORY_OPTIONS, getDefaultPrompt } from './prompt-templates';

export interface TaskCreatedPayload {
  issue: PaperclipIssueResource;
  issueUrl: string;
  worktree?: WorktreePaths;
}

interface TaskDispatchModalProps {
  row: ProgressRow;
  rowKey: string;
  userId: string;
  currentIDE: IDEOption;
  onIdeChange: (rowKey: string, ide: IDEOption) => void;
  onTaskCreated: (payload: TaskCreatedPayload) => void;
  onClose: () => void;
}

export default function TaskDispatchModal({
  row, rowKey, userId, currentIDE, onIdeChange, onTaskCreated, onClose,
}: TaskDispatchModalProps) {
  const [ide, setIde] = useState<IDEOption>(currentIDE);
  const [adapterType, setAdapterType] = useState(() => {
    const rt = RUNTIME_OPTIONS.find(o => o.id === currentIDE);
    return rt?.adapterType ?? '';
  });
  const [model, setModel] = useState(() => adapterType ? getModelForAdapter(adapterType) : '');
  const [workCategory, setWorkCategory] = useState('');
  const [promptText, setPromptText] = useState(() =>
    getDefaultPrompt(buildPromptContext(row, row.__rowId, currentIDE)),
  );
  const [preview, setPreview] = useState<BuildIssuePayloadResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // IDE change — regenerate prompt + auto-set adapter
  const handleIDEChange = useCallback((newIDE: IDEOption) => {
    setIde(newIDE);
    const rt = RUNTIME_OPTIONS.find(o => o.id === newIDE);
    if (rt?.adapterType) {
      setAdapterType(rt.adapterType);
      setModel(getModelForAdapter(rt.adapterType));
    }
    const ctx = buildPromptContext(row, row.__rowId, newIDE);
    if (workCategory) {
      const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === workCategory);
      if (opt) setPromptText(opt.getPrompt(ctx));
    } else {
      setPromptText(getDefaultPrompt(ctx));
    }
  }, [row, workCategory]);

  // Work category change
  const handleCategoryChange = useCallback((id: string) => {
    setWorkCategory(id);
    if (id) {
      const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === id);
      if (opt) setPromptText(opt.getPrompt(buildPromptContext(row, row.__rowId, ide)));
    }
  }, [row, ide]);

  // Generate preview (no network call)
  const handlePreview = useCallback(() => {
    const config = getPaperclipConfig();
    const roleId = isValidPaperclipRole(workCategory) ? workCategory : '';
    const result = buildIssuePayload({
      rowId: row.__rowId,
      featureName: row.name,
      ideLabel: ide,
      roleId,
      promptText,
      baseUrl: config.baseUrl,
      mapping: config.mapping,
    });
    setPreview(result);
    setError(null);
  }, [row, ide, workCategory, promptText]);

  // Send to Paperclip
  const handleSend = useCallback(async () => {
    if (!preview) return;
    const confirmed = window.confirm(
      `確定要建立 Paperclip Issue？\n\nTitle: ${preview.payload.title}\nAssignee: ${preview.payload.assigneeAgentId ?? '(unassigned)'}\n\nA git worktree + feature branch will be created automatically.`,
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/paperclip/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          ...preview.payload,
          _taskMeta: {
            adapter_type: adapterType || undefined,
            model: model || undefined,
          },
        }),
      });
      const json = (await res.json()) as CreateIssueResult & { worktree?: WorktreePaths };
      if (json.ok) {
        onIdeChange(rowKey, ide);
        onTaskCreated({
          issue: json.issue,
          issueUrl: json.issueUrl,
          worktree: json.worktree,
        });
        onClose();
      } else {
        setError(formatPaperclipErrorWithHint({
          httpStatus: res.status,
          message: json.error || `HTTP ${res.status}`,
        }));
      }
    } catch (err) {
      setError(formatPaperclipErrorWithHint({
        httpStatus: 0,
        message: err instanceof Error ? err.message : 'Unknown network error',
      }));
    } finally {
      setSending(false);
    }
  }, [preview, userId, rowKey, ide, onIdeChange, onTaskCreated, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-border-default bg-bg-primary shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">任務派遣</p>
            <p className="mt-0.5 text-xs text-text-muted truncate">Row {row.__rowId} &ndash; {row.name}</p>
          </div>
          <button type="button" onClick={onClose} className="ml-3 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary">關閉</button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Config row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-text-secondary">Row ID</p>
              <p className="rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs font-mono text-text-primary">{row.__rowId}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-ide">執行環境</label>
              <select id="dispatch-ide" className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={ide} onChange={e => handleIDEChange(e.target.value as IDEOption)}>
                <option value="">請選擇執行環境</option>
                <optgroup label="AI Coding Agent">
                  {RUNTIME_OPTIONS.filter(o => o.group === 'agent').map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="IDE（手動模式）">
                  {RUNTIME_OPTIONS.filter(o => o.group === 'ide').map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-category">工作類別</label>
              <select id="dispatch-category" className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={workCategory} onChange={e => handleCategoryChange(e.target.value)}>
                <option value="">（自動指派）</option>
                {WORK_CATEGORY_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* Adapter / Model config */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-adapter">Adapter</label>
              <select
                id="dispatch-adapter"
                className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={adapterType}
                onChange={e => {
                  const a = e.target.value;
                  setAdapterType(a);
                  setModel(a ? getModelForAdapter(a) : '');
                }}
              >
                <option value="">（依執行環境自動）</option>
                {ADAPTER_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label} ({opt.billing})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-model">Model</label>
              <input
                id="dispatch-model"
                type="text"
                className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs font-mono text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="auto"
              />
            </div>
          </div>

          {/* Prompt editor */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary" htmlFor="dispatch-prompt">Prompt</label>
            <textarea id="dispatch-prompt" className="min-h-[140px] w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs text-text-primary placeholder-text-muted focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={promptText} onChange={e => setPromptText(e.target.value)} />
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-md border border-border-default bg-bg-secondary p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium text-text-secondary">Paperclip Issue 預覽</p>
                <button type="button" onClick={() => setPreview(null)} className="text-[10px] text-text-muted hover:text-text-primary">關閉預覽</button>
              </div>
              <p className="mb-2 text-[10px] text-text-muted">
                <span className="font-semibold text-text-secondary">POST </span>
                <span className="font-mono break-all">{preview.endpoint}</span>
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-bg-primary p-2 text-[10px] font-mono text-text-primary">
                {JSON.stringify(preview.payload, null, 2)}
              </pre>
              {!preview.companyId && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                  未設定 <code className="font-mono">NEXT_PUBLIC_PAPERCLIP_COMPANY_ID</code>
                </p>
              )}
              {preview.autoRoute && (
                <p className="mt-2 text-[10px] text-sky-600 dark:text-sky-400">
                  自動指派：<span className="font-semibold">{preview.autoRoute.role}</span>
                  {preview.autoRoute.source === 'keyword' && preview.autoRoute.matchedKeyword && (
                    <span>（match：「{preview.autoRoute.matchedKeyword}」）</span>
                  )}
                  {preview.autoRoute.source === 'fallback' && (
                    <span>（fallback → 架構師 triage）</span>
                  )}
                </p>
              )}

              {/* Send button */}
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border-light pt-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !preview.companyId}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-white transition-colors',
                    sending || !preview.companyId
                      ? 'bg-amber-600/50 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700',
                  )}
                >
                  {sending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>送出中...</span></>
                  ) : (
                    <><Send className="h-3.5 w-3.5" /><span>送出到 Paperclip</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2">
              <p className="text-[11px] font-medium text-red-700 dark:text-red-300">送出失敗</p>
              <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-text-secondary">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border-light px-4 py-3 bg-bg-secondary/60">
          <button type="button" onClick={onClose} className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary">取消</button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!promptText.trim()}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              !promptText.trim()
                ? 'cursor-not-allowed border-border-default text-text-muted'
                : 'border-sky-500 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40',
            )}
          >
            <Send className="h-3.5 w-3.5" />
            <span>預覽 Paperclip Issue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
