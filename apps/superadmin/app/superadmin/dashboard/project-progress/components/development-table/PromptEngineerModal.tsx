'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { PromptContext, IDEOption, ProgressRow } from './types';
import { IDE_OPTIONS, buildPromptContext } from './types';

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
            <button type="button" onClick={handleExecutePrompt} disabled={isExecutingPrompt || !promptText.trim()} className={clsx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors', isExecutingPrompt || !promptText.trim() ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>
              {isExecutingPrompt ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>執行中...</span></>) : (<><Play className="h-3.5 w-3.5" /><span>送出 Prompt</span></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
