'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Loader2, Send, ExternalLink, CheckCircle2, Copy, GitBranch, Trash2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { PromptContext, IDEOption, ProgressRow } from './types';
import { IDE_OPTIONS, buildPromptContext } from './types';
import { buildIssuePayload, isValidPaperclipRole } from '@/lib/paperclip/buildIssuePayload';
import type { BuildIssuePayloadResult } from '@/lib/paperclip/buildIssuePayload';
import { getPaperclipConfig } from '@/lib/paperclip/config';
// PaperclipSubmission no longer used directly — BuildIssuePayloadResult
// extends it with optional autoRoute info.
import type {
  CreateIssueResult,
  PaperclipIssueResource,
  FetchIssueStatusResult,
  PaperclipIssueStatusSnapshot,
  FetchIssueCostResult,
  PaperclipIssueCostSnapshot,
  FetchIssueRunLogResult,
  PaperclipIssueRunLogSnapshot,
} from '@/lib/paperclip/client';
import type { WorktreePaths } from '@/lib/paperclip/worktree';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';

// -- Shared tail lines appended to every category prompt --
function tddTail(ctx: PromptContext): string {
  return [
    `單元與整合測試：${ctx.unitFolder}`,
    `E2E 測試：${ctx.e2eFolder}`,
    '',
    '完成後請新增或更新 TDD Progress Report (.md)。',
    '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
  ].join('\n');
}

function header(ctx: PromptContext, desc: string): string {
  return [
    `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」${desc}。`,
    '請先閱讀：',
    `1) Feature Spec (.md)：${ctx.featureSpec}`,
    `2) TDD Spec (.md)：${ctx.tddSpec}`,
    '',
  ].join('\n');
}

// Status badge style + label for Paperclip issue states used in live polling.
const STATUS_BADGE_STYLE: Record<PaperclipIssueStatus, { label: string; className: string }> = {
  backlog:     { label: 'Backlog',     className: 'bg-bg-secondary text-text-muted border-border-default' },
  todo:        { label: 'Queued',      className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/40' },
  in_progress: { label: 'In Progress', className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/40' },
  in_review:   { label: 'In Review',   className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/40' },
  done:        { label: 'Done',        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' },
  blocked:     { label: 'Blocked',     className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/40' },
};

const WORK_CATEGORY_OPTIONS: { id: string; label: string; getPrompt: (ctx: PromptContext) => string }[] = [
  { id: 'fullstack', label: '全棧工程師', getPrompt: (ctx) => [
    header(ctx, '開始進行全棧開發與測試'),
    '角色重點：前後端功能一併考量（Next.js / React、Server Actions、Supabase 整合）。請嚴格遵守 TDD：先撰寫測試再實作，並依專案規範（TypeScript strict、docs/ 與 .claude/rules/）進行。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'database', label: '資料庫工程師', getPrompt: (ctx) => [
    header(ctx, '開始進行資料庫相關開發與測試'),
    '角色重點：Migration 設計（supabase/migrations/，檔名 YYYYMMDDHHMMSS_描述.sql）、RLS 政策、索引與觸發器、storage_quotas / behavior_logs 等表結構。請遵循 .claude/rules/backend/supabase.md，並撰寫對應單元與整合測試。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'qa', label: 'TDD 測試工程師 / QA 工程師', getPrompt: (ctx) => [
    header(ctx, '以測試為先進行開發與驗證'),
    '角色重點：先撰寫單元與整合測試（Vitest）與 E2E（Playwright），覆蓋 Happy Path、邊界條件與錯誤路徑，再撰寫實作以通過測試。目標覆蓋率 80%+，並確保 TDD 報告中列出所有測試案例與執行結果。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'devops', label: 'DevOps / 站台可靠性工程師', getPrompt: (ctx) => [
    header(ctx, '開始進行 DevOps / 可靠性相關工作'),
    '角色重點：部署流程（Vercel / Supabase）、環境變數與密鑰、監控與日誌、健康檢查與 runbook。本專案為 monorepo，apps/web (Port 3000)、apps/superadmin (Port 3001)，請依 docs/deployment-guides 與三階段部署策略執行，並撰寫或更新相關測試與文件。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'architect', label: '技術總監 / 架構師', getPrompt: (ctx) => [
    header(ctx, '從架構與技術決策角度進行檢視與實作'),
    '角色重點：架構一致性、擴展性、安全性與技術選型；與既有 docs/、.claude/rules/ 及 docs/technical-selection 對齊。必要時產出或更新架構說明、決策記錄與風險評估。仍須依 TDD 撰寫測試並更新 TDD Progress Report (.md)。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'uiux', label: 'UI/UX 設計師', getPrompt: (ctx) => [
    header(ctx, '開始進行 UI/UX 與前端實作'),
    '角色重點：依 docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md 與既有設計系統實作元件與頁面；注意 RWD、無障礙與一致性。本專案為 Next.js + React，主要為 apps/web 與 apps/superadmin。請依 TDD 撰寫元件與單元/整合及 E2E 測試，完成後更新 TDD Progress Report (.md)。',
    tddTail(ctx),
  ].join('\n') },
];

// -- Default prompt (no work category selected) --
function getDefaultPrompt(ctx: PromptContext): string {
  return [
    `請根據專案進度儀表板（Development Tab）中工作編號 Row ID「${ctx.rowId}」與選定的 IDE「${ctx.ideLabel}」，開始或繼續進行開發與測試。`,
    '', '【必讀文件】', '在撰寫程式碼前，請先完整閱讀並理解：',
    `• Feature Spec (.md)：${ctx.featureSpec}`, `• TDD Spec (.md)：${ctx.tddSpec}`,
    '', '【TDD 流程】',
    '• 若已有測試腳本：先執行並更新既有測試，待全部通過後，再視需要撰寫新測試。',
    '• 嚴格依循「紅 → 綠 → 重構」循環。',
    '', '【測試路徑】',
    `• 單元與整合測試：${ctx.unitFolder}`, `• E2E / 驗收測試：${ctx.e2eFolder}`,
    '', '【報告流程】', 'TDD 測試完成後，請新增或更新對應的 TDD Progress Report (.md)，內容至少包含：',
    '• 主要實作變更檔案清單與變更摘要', '• 測試範圍與各測試案例說明', '• 測試執行結果（含失敗重試與修正狀況）',
    '', '【完成條件】',
    '確認 TDD Progress Report (.md) 已完成、所有測試通過後，請 git commit 並 push 至 GitHub repo。',
  ].join('\n');
}

// -- Props --
interface PromptEngineerModalProps {
  row: ProgressRow;
  rowKey: string;
  userId: string;
  currentIDE: IDEOption;
  onIdeChange: (rowKey: string, ide: IDEOption) => void;
  onClose: () => void;
}

// -- Component --
export default function PromptEngineerModal({
  row, rowKey, userId, currentIDE, onIdeChange, onClose,
}: PromptEngineerModalProps) {
  const [promptConfigIDE, setPromptConfigIDE] = useState<IDEOption>(currentIDE);
  const [promptConfigWorkCategory, setPromptConfigWorkCategory] = useState('');
  const [promptText, setPromptText] = useState(() => getDefaultPrompt(buildPromptContext(row, row.__rowId, currentIDE)));
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskStatus, setCurrentTaskStatus] = useState<string | null>(null);
  const [currentTaskLogs, setCurrentTaskLogs] = useState<string[]>([]);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [paperclipPreview, setPaperclipPreview] = useState<BuildIssuePayloadResult | null>(null);
  const [paperclipSending, setPaperclipSending] = useState(false);
  const [paperclipResult, setPaperclipResult] = useState<
    | { ok: true; issue: PaperclipIssueResource; issueUrl: string; worktree?: WorktreePaths }
    | { ok: false; error: string }
    | null
  >(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [cleanupState, setCleanupState] = useState<
    | { phase: 'idle' }
    | { phase: 'sending' }
    | { phase: 'done' }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });
  const [liveStatus, setLiveStatus] = useState<PaperclipIssueStatusSnapshot | null>(null);
  const [cost, setCost] = useState<PaperclipIssueCostSnapshot | null>(null);
  const [runLog, setRunLog] = useState<PaperclipIssueRunLogSnapshot | null>(null);
  const [showRunLog, setShowRunLog] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Task polling
  useEffect(() => {
    if (!currentTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/dev-tasks/${currentTaskId}`, { headers: { 'x-user-id': userId } });
        if (!res.ok) return;
        const json = (await res.json()) as { task?: { status: 'queued' | 'running' | 'succeeded' | 'failed'; logs?: string[] } | null };
        if (!json.task || cancelled) return;
        setCurrentTaskStatus(json.task.status);
        if (Array.isArray(json.task.logs)) setCurrentTaskLogs(json.task.logs);
      } catch { /* ignore */ }
    };
    void poll();
    const id = window.setInterval(() => { void poll(); }, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [currentTaskId, userId]);

  // Execute prompt
  const handleExecutePrompt = useCallback(async () => {
    if (!promptText.trim()) return;
    if (!promptConfigIDE) { setPromptError('請先選擇 IDE 開發工具（例如 Cursor）再送出。'); return; }
    if (!userId) { setPromptError('尚未取得使用者資訊，請確認已登入 superadmin。'); return; }
    setPromptError(null);
    setIsExecutingPrompt(true);
    try {
      const rowId = row.__rowId;
      onIdeChange(rowKey, promptConfigIDE);
      const res = await fetch('/api/dev-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          rowId, featureName: row.name, ide: promptConfigIDE, prompt: promptText,
          metadata: {
            featureSpecDocPath: row.featureSpecDocPath?.trim() || null,
            tddSpecDocPath: row.tddSpecDocPath?.trim() || null,
            unitTestFolder: `apps/superadmin/unit_and_integration_test/${rowId}`,
            e2eFolder: `apps/superadmin/e2e/${rowId}`,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to create dev task', text); // eslint-disable-line no-console
        setPromptError(`建立開發任務失敗：${res.status} ${res.statusText}`);
        return;
      }
      const data = (await res.json()) as { taskId: string; status: 'queued' | 'running' | 'succeeded' | 'failed' };
      setCurrentTaskId(data.taskId);
      setCurrentTaskStatus(data.status);
      setPromptError(null);
      try { await navigator.clipboard.writeText(promptText); } catch { /* no clipboard */ }
      try { await fetch(`http://127.0.0.1:3847/wake?ide=${encodeURIComponent(promptConfigIDE)}`, { method: 'GET', signal: AbortSignal.timeout(2000) }); } catch { /* agent not running */ }
    } finally { setIsExecutingPrompt(false); }
  }, [promptText, promptConfigIDE, userId, row, rowKey, onIdeChange]);

  // IDE change — regenerate prompt
  const handleIDEChange = useCallback((newIDE: IDEOption) => {
    setPromptConfigIDE(newIDE);
    const ctx = buildPromptContext(row, row.__rowId, newIDE);
    if (promptConfigWorkCategory) {
      const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === promptConfigWorkCategory);
      if (opt) setPromptText(opt.getPrompt(ctx));
    } else { setPromptText(getDefaultPrompt(ctx)); }
  }, [row, promptConfigWorkCategory]);

  // Work category change
  const handleCategoryChange = useCallback((id: string) => {
    setPromptConfigWorkCategory(id);
    if (id) {
      const opt = WORK_CATEGORY_OPTIONS.find(o => o.id === id);
      if (opt) setPromptText(opt.getPrompt(buildPromptContext(row, row.__rowId, promptConfigIDE)));
    }
  }, [row, promptConfigIDE]);

  // Paperclip preview — frontend-only dry run, no network
  const handlePreviewPaperclip = useCallback(() => {
    const config = getPaperclipConfig();
    const roleId = isValidPaperclipRole(promptConfigWorkCategory) ? promptConfigWorkCategory : '';
    const submission = buildIssuePayload({
      rowId: row.__rowId,
      featureName: row.name,
      ideLabel: promptConfigIDE,
      roleId,
      promptText,
      baseUrl: config.baseUrl,
      mapping: config.mapping,
    });
    setPaperclipPreview(submission);
    setPaperclipResult(null);
    setCleanupState({ phase: 'idle' });
    setLiveStatus(null);
    setCost(null);
    setRunLog(null);
  }, [row, promptConfigIDE, promptConfigWorkCategory, promptText]);

  // Live Paperclip issue status polling. Kicks in after successful send and
  // runs every 5s until the issue hits a terminal state (done / cancelled),
  // the modal closes, or 30 minutes elapse (safety cap).
  useEffect(() => {
    if (!paperclipResult?.ok) return;
    const issueId = paperclipResult.issue.id;
    if (!issueId) return;
    let cancelled = false;
    const startedAt = Date.now();
    const MAX_POLL_MS = 30 * 60 * 1000;

    // Tracks whether we've already fetched cost for this issue's terminal
    // state — prevents repeated hits while the interval is still clearing.
    let costFetched = false;

    const fetchCostOnce = async () => {
      if (costFetched || cancelled) return;
      costFetched = true;
      try {
        const res = await fetch(`/api/paperclip/issues/${encodeURIComponent(issueId)}/cost`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) return;
        const json = (await res.json()) as FetchIssueCostResult;
        if (cancelled || !json.ok) return;
        setCost(json.snapshot);
      } catch {
        /* ignore — cost display is best-effort */
      }
    };

    // Cache the discovered runId so subsequent polls (especially after Paperclip
    // clears executionRunId on the issue) can go straight to the run endpoint.
    let cachedRunId: string | undefined;

    const fetchRunLog = async () => {
      if (cancelled) return;
      const params = new URLSearchParams();
      if (cachedRunId) params.set('runId', cachedRunId);
      try {
        const url = `/api/paperclip/issues/${encodeURIComponent(issueId)}/run-log?${params}`;
        const res = await fetch(url, { headers: { 'x-user-id': userId } });
        if (!res.ok) return;
        const json = (await res.json()) as FetchIssueRunLogResult;
        if (cancelled || !json.ok) return;
        setRunLog(json.snapshot);
        // Cache for future polls.
        if (json.snapshot.runId && !cachedRunId) {
          cachedRunId = json.snapshot.runId;
        }
      } catch {
        /* ignore — best effort */
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > MAX_POLL_MS) return;
      try {
        const res = await fetch(`/api/paperclip/issues/${encodeURIComponent(issueId)}/status`, {
          headers: { 'x-user-id': userId },
        });
        if (!res.ok) return;
        const json = (await res.json()) as FetchIssueStatusResult;
        if (cancelled || !json.ok) return;
        setLiveStatus(json.snapshot);
        // Pull the live run-log on every tick — cheap (two Paperclip GETs)
        // and lets us show stdout progress while the run is active.
        void fetchRunLog();
        if (json.snapshot.terminal) {
          // Final cost once the run is done. Fire-and-forget.
          void fetchCostOnce();
          return;
        }
      } catch {
        /* transient network error — try again next tick */
      }
    };

    void tick(); // immediate fetch
    const interval = window.setInterval(() => {
      if (liveStatus?.terminal) {
        window.clearInterval(interval);
        return;
      }
      void tick();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // We intentionally depend only on issueId; liveStatus changes would cause
    // re-creation of the interval and double-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperclipResult?.ok ? paperclipResult.issue.id : null, userId]);

  // Real send to Paperclip — goes through server route handler
  const handleSendPaperclip = useCallback(async () => {
    if (!paperclipPreview) return;
    // Explicit confirmation — this creates a real issue in Paperclip
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(
        `確定要建立 Paperclip Issue？\n\n` +
          `Title: ${paperclipPreview.payload.title}\n` +
          `Assignee: ${paperclipPreview.payload.assigneeAgentId ?? '(unassigned)'}\n\n` +
          `A git worktree + feature branch will be created automatically.`,
      );
    if (!confirmed) return;

    setPaperclipSending(true);
    setPaperclipResult(null);
    try {
      const res = await fetch('/api/paperclip/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(paperclipPreview.payload),
      });
      // Route handler's response may include a `worktree` field alongside
      // the CreateIssueResult union when ok=true.
      const json = (await res.json()) as CreateIssueResult & { worktree?: WorktreePaths };
      if (json.ok) {
        setPaperclipResult({
          ok: true,
          issue: json.issue,
          issueUrl: json.issueUrl,
          worktree: json.worktree,
        });
      } else {
        setPaperclipResult({ ok: false, error: json.error || `HTTP ${res.status}` });
      }
    } catch (err) {
      setPaperclipResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown network error',
      });
    } finally {
      setPaperclipSending(false);
    }
  }, [paperclipPreview, userId]);

  // Copy a string to clipboard and show a short confirmation per-command
  const handleCopyCommand = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(key);
      window.setTimeout(() => setCopiedCmd(null), 1500);
    } catch {
      /* clipboard may be unavailable — no-op */
    }
  }, []);

  // Ask the server to `git worktree remove` + `git branch -D` this task's
  // worktree. Irreversible — gate behind a confirm.
  const handleCleanupWorktree = useCallback(async () => {
    if (!paperclipResult?.ok || !paperclipResult.worktree) return;
    const { slug, branchName } = paperclipResult.worktree;
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(
        `確定要刪除這個 worktree + branch？\n\n` +
          `slug  : ${slug}\n` +
          `branch: ${branchName}\n\n` +
          `⚠️ 這會執行 git worktree remove + git branch -D，branch 上任何未 merge 的 commit 都會遺失。`,
      );
    if (!confirmed) return;

    setCleanupState({ phase: 'sending' });
    try {
      const res = await fetch('/api/paperclip/worktrees/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ slug, deleteBranch: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setCleanupState({ phase: 'done' });
      } else {
        setCleanupState({ phase: 'error', message: json.error ?? `HTTP ${res.status}` });
      }
    } catch (err) {
      setCleanupState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown network error',
      });
    }
  }, [paperclipResult, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-border-default bg-bg-primary shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Prompt Engineer 設定</p>
            <p className="mt-0.5 text-xs text-text-muted truncate">Row ID {row.__rowId} &ndash; {row.name}</p>
          </div>
          <button type="button" onClick={onClose} className="ml-3 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary">關閉</button>
        </div>
        {/* Body */}
        <div className="space-y-4 px-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-text-secondary">Row ID</p>
              <p className="rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs font-mono text-text-primary">{row.__rowId}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-ide">IDE 開發工具</label>
              <select id="prompt-config-ide" className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={promptConfigIDE} onChange={e => handleIDEChange(e.target.value as IDEOption)}>
                <option value="">請選擇 IDE</option>
                {IDE_OPTIONS.filter(opt => opt !== '').map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-work-category">今日工作類別</label>
              <select id="prompt-config-work-category" className="w-full rounded-md border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={promptConfigWorkCategory} onChange={e => handleCategoryChange(e.target.value)}>
                <option value="">請選擇工作類別（可選，預填 Prompt）</option>
                {WORK_CATEGORY_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary" htmlFor="prompt-config-text">要送往 IDE / Agent 的 Prompt</label>
            <textarea id="prompt-config-text" className="min-h-[160px] w-full resize-y rounded-md border border-border-default bg-bg-secondary px-2 py-2 text-xs text-text-primary placeholder-text-muted focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={promptText} onChange={e => setPromptText(e.target.value)} placeholder="請輸入要送給 IDE / Agent 的完整指令 Prompt..." />
            <p className="mt-1 text-[10px] text-text-muted">
              建議內容：針對目前這筆 Row 的工作 ID 與選定的 IDE，說明要開發與測試的 feature，要求先閱讀 Feature Spec (.md) / TDD Spec (.md)，依 TDD 流程撰寫 unit test 與 e2e test，並在完成後更新對應的 TDD Progress Report (.md)（變更摘要、測試範圍、執行結果）。
            </p>
          </div>
          {paperclipPreview && (
            <div className="rounded-md border border-border-default bg-bg-secondary p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium text-text-secondary">
                  Paperclip Issue 預覽（尚未送出）
                </p>
                <button
                  type="button"
                  onClick={() => setPaperclipPreview(null)}
                  className="text-[10px] text-text-muted hover:text-text-primary"
                >
                  關閉預覽
                </button>
              </div>
              <p className="mb-2 text-[10px] text-text-muted">
                <span className="font-semibold text-text-secondary">POST </span>
                <span className="font-mono break-all">{paperclipPreview.endpoint}</span>
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-bg-primary p-2 text-[10px] font-mono text-text-primary">
                {JSON.stringify(paperclipPreview.payload, null, 2)}
              </pre>
              {!paperclipPreview.companyId && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠️ 尚未設定 <code className="font-mono">NEXT_PUBLIC_PAPERCLIP_COMPANY_ID</code>；此 endpoint 目前無效。
                </p>
              )}
              {paperclipPreview.autoRoute && (
                <p className="mt-2 text-[10px] text-sky-600 dark:text-sky-400">
                  🤖 未選擇角色，系統自動指派：
                  <span className="font-semibold">{paperclipPreview.autoRoute.role}</span>
                  {paperclipPreview.autoRoute.source === 'keyword' && paperclipPreview.autoRoute.matchedKeyword && (
                    <span>（關鍵字 match：「{paperclipPreview.autoRoute.matchedKeyword}」）</span>
                  )}
                  {paperclipPreview.autoRoute.source === 'fallback' && (
                    <span>（無關鍵字 match → 交由架構師 triage）</span>
                  )}
                </p>
              )}
              {paperclipPreview.companyId && !paperclipPreview.payload.assigneeAgentId && promptConfigWorkCategory && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠️ 未找到 <code className="font-mono">NEXT_PUBLIC_PAPERCLIP_AGENT_{promptConfigWorkCategory.toUpperCase()}</code>；Issue 將以無 assignee 方式建立。
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-light pt-2">
                <p className="text-[10px] text-text-muted">
                  檢查無誤後可按右側按鈕建立真正的 Paperclip Issue。
                </p>
                <button
                  type="button"
                  onClick={handleSendPaperclip}
                  disabled={paperclipSending || !paperclipPreview.companyId}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-white transition-colors',
                    paperclipSending || !paperclipPreview.companyId
                      ? 'bg-amber-600/50 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700',
                  )}
                  title="建立真正的 Paperclip Issue（會呼叫 Paperclip API）"
                >
                  {paperclipSending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>送出中...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>送出到 Paperclip</span>
                    </>
                  )}
                </button>
              </div>
              {paperclipResult?.ok && (
                <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Paperclip Issue 已建立
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cost && (cost.costUsd !== undefined || cost.inputTokens !== undefined) && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2 py-0.5 text-[9px] font-mono text-text-secondary"
                          title={
                            `model: ${cost.model ?? 'unknown'}\n` +
                            `input tokens: ${cost.inputTokens?.toLocaleString() ?? '?'}\n` +
                            `output tokens: ${cost.outputTokens?.toLocaleString() ?? '?'}\n` +
                            `cached input: ${cost.cachedInputTokens?.toLocaleString() ?? '?'}\n` +
                            `runId: ${cost.runId ?? '-'}`
                          }
                        >
                          {cost.costUsd !== undefined
                            ? `$${cost.costUsd.toFixed(4)}`
                            : '$—'}
                          {cost.inputTokens !== undefined && cost.outputTokens !== undefined && (
                            <span className="text-text-muted">
                              · {cost.inputTokens.toLocaleString()}→{cost.outputTokens.toLocaleString()}
                            </span>
                          )}
                        </span>
                      )}
                      {liveStatus && (
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium',
                            STATUS_BADGE_STYLE[liveStatus.status].className,
                          )}
                          title={`Paperclip status · 最後更新 ${liveStatus.updatedAt ?? ''}`}
                        >
                          {!liveStatus.terminal && (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                          )}
                          {STATUS_BADGE_STYLE[liveStatus.status].label}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    ID: <span className="font-mono">{paperclipResult.issue.issueKey ?? paperclipResult.issue.id}</span>
                  </p>
                  <a
                    href={paperclipResult.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    在 Paperclip 開啟
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {/* Live run log — streams stdout while the agent is working */}
                  {runLog && (runLog.stdoutExcerpt || runLog.runStatus) && (
                    <div className="mt-2 rounded border border-indigo-500/30 bg-bg-primary/60 p-2">
                      <button
                        type="button"
                        onClick={() => setShowRunLog((s) => !s)}
                        className="flex w-full items-center justify-between text-left"
                        aria-expanded={showRunLog}
                      >
                        <div className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                          <Terminal className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Live run log</span>
                          {runLog.runStatus && (
                            <span className="font-mono text-[9px] text-text-muted">
                              · {runLog.runStatus}
                            </span>
                          )}
                          {runLog.runId && (
                            <span className="font-mono text-[9px] text-text-muted">
                              · {runLog.runId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        {showRunLog ? (
                          <ChevronUp className="h-3 w-3 text-text-muted" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-text-muted" />
                        )}
                      </button>
                      {showRunLog && (
                        <>
                          {runLog.stdoutExcerpt ? (
                            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-bg-secondary p-1.5 text-[9px] font-mono leading-snug text-text-secondary">
                              {runLog.stdoutExcerpt}
                            </pre>
                          ) : (
                            <p className="mt-1 text-[10px] italic text-text-muted">
                              (等待 agent 產生輸出…)
                            </p>
                          )}
                          {runLog.stderrExcerpt && (
                            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-red-500/10 p-1.5 text-[9px] font-mono leading-snug text-red-700 dark:text-red-400">
                              {runLog.stderrExcerpt}
                            </pre>
                          )}
                          {runLog.exitCode !== undefined && (
                            <p className="mt-1 text-[9px] text-text-muted">
                              exit code: <span className="font-mono">{runLog.exitCode}</span>
                              {runLog.startedAt && runLog.finishedAt && (
                                <span>
                                  {' · '}
                                  duration:{' '}
                                  {Math.round(
                                    (Date.parse(runLog.finishedAt) - Date.parse(runLog.startedAt)) / 1000,
                                  )}
                                  s
                                </span>
                              )}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {paperclipResult.worktree && (
                    <div className="mt-2 rounded border border-emerald-500/30 bg-bg-primary/60 p-2">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                        <GitBranch className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Git Worktree 已建立</span>
                      </div>
                      <dl className="mt-1 space-y-0.5 text-[10px] text-text-secondary">
                        <div className="flex gap-1">
                          <dt className="shrink-0 text-text-muted">branch:</dt>
                          <dd className="truncate font-mono" title={paperclipResult.worktree.branchName}>
                            {paperclipResult.worktree.branchName}
                          </dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="shrink-0 text-text-muted">container cwd:</dt>
                          <dd className="truncate font-mono" title={paperclipResult.worktree.containerPath}>
                            {paperclipResult.worktree.containerPath}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-1.5 space-y-1">
                        {[
                          { key: 'log', label: 'git log', cmd: `git log ${paperclipResult.worktree.branchName}` },
                          { key: 'diff', label: 'git diff vs main', cmd: `git diff main..${paperclipResult.worktree.branchName}` },
                          { key: 'checkout', label: 'checkout to review', cmd: `git checkout ${paperclipResult.worktree.branchName}` },
                        ].map(({ key, label, cmd }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <code className="flex-1 truncate rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-text-secondary" title={cmd}>
                              {cmd}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyCommand(key, cmd)}
                              className="inline-flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 text-[9px] text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                              title={`複製：${label}`}
                              aria-label={`複製 ${label}`}
                            >
                              <Copy className="h-2.5 w-2.5" />
                              {copiedCmd === key ? '已複製' : '複製'}
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[9px] text-text-muted">
                        Agent 會在 branch <code className="font-mono">{paperclipResult.worktree.branchName}</code> 上 commit，main 不會被碰到。審核後由你手動 merge / push。
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-emerald-500/20 pt-1.5">
                        {cleanupState.phase === 'done' ? (
                          <p className="text-[10px] text-text-muted">
                            Worktree + branch 已刪除。
                          </p>
                        ) : cleanupState.phase === 'error' ? (
                          <p className="truncate text-[10px] text-red-600 dark:text-red-400" title={cleanupState.message}>
                            刪除失敗：{cleanupState.message}
                          </p>
                        ) : (
                          <p className="text-[10px] text-text-muted">
                            完成審核後可一鍵清除 worktree + branch：
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleCleanupWorktree}
                          disabled={cleanupState.phase === 'sending' || cleanupState.phase === 'done'}
                          className={clsx(
                            'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors',
                            cleanupState.phase === 'sending' || cleanupState.phase === 'done'
                              ? 'cursor-not-allowed border-border-default text-text-muted'
                              : 'border-red-500/50 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
                          )}
                          title="git worktree remove + git branch -D"
                        >
                          {cleanupState.phase === 'sending' ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              刪除中
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3" />
                              刪除 worktree
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {paperclipResult && !paperclipResult.ok && (
                <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 p-2">
                  <p className="text-[11px] font-medium text-red-700 dark:text-red-300">
                    送出失敗
                  </p>
                  <p className="mt-1 text-[10px] text-text-secondary break-words">
                    {paperclipResult.error}
                  </p>
                </div>
              )}
              {!paperclipResult && (
                <p className="mt-2 text-[10px] text-text-muted">
                  此為本地預覽。按右上「送出到 Paperclip」才會呼叫 API 建立真正的 Issue。
                </p>
              )}
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-light px-4 py-3 bg-bg-secondary/60">
          <div className="flex flex-col gap-1 text-[10px] text-text-muted">
            {promptError && <p className="text-[10px] text-red-500">{promptError}</p>}
            {currentTaskId ? (
              <>
                <p>任務 ID：<span className="font-mono text-[10px]">{currentTaskId}</span></p>
                <p>狀態：{currentTaskStatus ?? 'queued'}</p>
                {currentTaskStatus === 'running' && (
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                    完成 TDD Report、測試通過並 git commit &amp; push 後，在專案根目錄執行：<br />
                    <code className="text-[10px] bg-bg-secondary px-1 rounded">./scripts/complete-dev-task.sh {currentTaskId} succeeded</code>
                  </p>
                )}
                {currentTaskLogs.length > 0 && <p className="max-w-xs truncate" title={currentTaskLogs.join('\n')}>最近 log：{currentTaskLogs[currentTaskLogs.length - 1]}</p>}
              </>
            ) : (
              <>
                <p>按下「送出 Prompt」後會建立任務、<strong>自動複製 Prompt 到剪貼簿</strong>，並嘗試喚醒本地 Agent。</p>
                <p className="mt-1 text-text-muted">若已執行 <code className="text-[10px] bg-bg-secondary px-1 rounded">cd tools/local-agent &amp;&amp; npm run cursor</code>，Agent 會自動開啟 Cursor 並注入 Composer（Cmd+I → Cmd+V）；否則請手動切換到 Cursor 貼上 (Cmd+V) 開始執行。</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary">取消</button>
            <button
              type="button"
              onClick={handlePreviewPaperclip}
              disabled={!promptText.trim()}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                !promptText.trim()
                  ? 'cursor-not-allowed border-border-default text-text-muted'
                  : 'border-sky-500 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40',
              )}
              title="產生 Paperclip Issue 預覽（不實際送出）"
            >
              <Send className="h-3.5 w-3.5" />
              <span>預覽送到 Paperclip</span>
            </button>
            <button type="button" onClick={handleExecutePrompt} disabled={isExecutingPrompt || !promptText.trim()} className={clsx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors', isExecutingPrompt || !promptText.trim() ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>
              {isExecutingPrompt ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>執行中...</span></>) : (<><Play className="h-3.5 w-3.5" /><span>送出 Prompt</span></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
