// Pure prompt template functions extracted from PromptEngineerModal.
// No React dependencies — safe to import from any context.

import type { PromptContext } from '../types';

// -- Shared tail lines appended to every category prompt --
const COST_AND_API_DISCIPLINE = [
  '',
  '【成本與 API 節制（Paperclip／LLM）】',
  '• 優先完成最小可驗證變更，再擴大範圍；避免一次丟過大上下文或重複全倉搜尋。',
  '• 測試先跑與本次改動相關的子集（例如單一 jest 檔或 `--testPathPattern`），通過後再跑較大套件。',
  '• 若任務可分段，請在說明中標註階段與完成定義，減少來回與無效 dispatch。',
].join('\n');

export function tddTail(ctx: PromptContext): string {
  return [
    `單元與整合測試：${ctx.unitFolder}`,
    `E2E 測試：${ctx.e2eFolder}`,
    '',
    '完成後請新增或更新 TDD Progress Report (.md)。',
    '確認完成今日的 TDD Progress Report (.md)、測試腳本全部通過後，請自行 git commit and push to github repo。',
    COST_AND_API_DISCIPLINE,
  ].join('\n');
}

export function promptHeader(ctx: PromptContext, desc: string): string {
  return [
    `請針對這一筆工作（Row ID「${ctx.rowId}」）以及選定的 IDE「${ctx.ideLabel}」${desc}。`,
    '請先閱讀：',
    `1) Feature Spec (.md)：${ctx.featureSpec}`,
    `2) TDD Spec (.md)：${ctx.tddSpec}`,
    '',
  ].join('\n');
}

export interface WorkCategoryOption {
  id: string;
  label: string;
  getPrompt: (ctx: PromptContext) => string;
}

export const WORK_CATEGORY_OPTIONS: WorkCategoryOption[] = [
  { id: 'fullstack', label: '全棧工程師', getPrompt: (ctx) => [
    promptHeader(ctx, '開始進行全棧開發與測試'),
    '角色重點：前後端功能一併考量（Next.js / React、Server Actions、Supabase 整合）。請嚴格遵守 TDD：先撰寫測試再實作，並依專案規範（TypeScript strict、docs/ 與 .claude/rules/）進行。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'database', label: '資料庫工程師', getPrompt: (ctx) => [
    promptHeader(ctx, '開始進行資料庫相關開發與測試'),
    '角色重點：Migration 設計（supabase/migrations/，檔名 YYYYMMDDHHMMSS_描述.sql）、RLS 政策、索引與觸發器、storage_quotas / behavior_logs 等表結構。請遵循 .claude/rules/backend/supabase.md，並撰寫對應單元與整合測試。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'sdet', label: 'SDET / Quality Platform Engineer', getPrompt: (ctx) => [
    promptHeader(ctx, '以測試為先進行開發與驗證'),
    '角色重點：以品質平台觀點先建立或更新測試治理資產（manifest、runner、coverage gate、flaky 隔離策略），再補齊單元/整合（Vitest）與 E2E（Playwright）覆蓋。請覆蓋 Happy Path、邊界條件與錯誤路徑，目標覆蓋率 80%+，並在 TDD 報告中列出測試案例、執行結果與風險。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'devops', label: 'DevOps / 站台可靠性工程師', getPrompt: (ctx) => [
    promptHeader(ctx, '開始進行 DevOps / 可靠性相關工作'),
    '角色重點：部署流程（Vercel / Supabase）、環境變數與密鑰、監控與日誌、健康檢查與 runbook。本專案為 monorepo，apps/web (Port 3000)、apps/superadmin (Port 3001)，請依 docs/deployment-guides 與三階段部署策略執行，並撰寫或更新相關測試與文件。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'architect', label: '技術總監 / 架構師', getPrompt: (ctx) => [
    promptHeader(ctx, '從架構與技術決策角度進行檢視與實作'),
    '角色重點：架構一致性、擴展性、安全性與技術選型；與既有 docs/、.claude/rules/ 及 docs/technical-selection 對齊。必要時產出或更新架構說明、決策記錄與風險評估。仍須依 TDD 撰寫測試並更新 TDD Progress Report (.md)。',
    tddTail(ctx),
  ].join('\n') },
  { id: 'uiux', label: 'UI/UX 設計師', getPrompt: (ctx) => [
    promptHeader(ctx, '開始進行 UI/UX 與前端實作'),
    '角色重點：依 docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md 與既有設計系統實作元件與頁面；注意 RWD、無障礙與一致性。本專案為 Next.js + React，主要為 apps/web 與 apps/superadmin。請依 TDD 撰寫元件與單元/整合及 E2E 測試，完成後更新 TDD Progress Report (.md)。',
    tddTail(ctx),
  ].join('\n') },
];

export function getDefaultPrompt(ctx: PromptContext): string {
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
    COST_AND_API_DISCIPLINE,
  ].join('\n');
}
