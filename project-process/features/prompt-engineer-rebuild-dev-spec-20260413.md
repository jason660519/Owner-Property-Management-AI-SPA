# PromptEngineer 重建 — 多人協作任務派遣系統 DEV-SPEC

**Row ID**: 135
**版本**: 0.1 (審查稿)
**日期**: 2026/04/13
**狀態**: 開發中
**關聯**: 延伸 Row 130 (Paperclip 開發流程整合), Row 133 (Paperclip 優化)

---

## 1. 目標與範圍

重建 `PromptEngineerModal.tsx`（1235 行單體元件），拆分為可獨立演進的子元件與 server-side 任務佇列，達成：

1. **壓低 API 帳單** — Server-side 唯一索引防重複送單、共用輪詢 hook 減少 API call
2. **減少卡住 / 重試** — Server-side 重試狀態機取代瀏覽器 useEffect，關閉 Modal 不影響重試
3. **24h 穩定** — 任務狀態持久化到 Supabase，不依賴瀏覽器 tab
4. **系統自動指派** — 沿用既有 `auto-route.ts` 關鍵字匹配，fallback 架構師 triage
5. **多人協作** — 任務鎖定、工程師領取/指派、IDE 偏好記憶

### 1.1 範圍內

- `apps/superadmin` 的 PromptEngineerModal 拆分為 TaskDispatchModal + TaskStatusChip + TaskDetailPanel
- 共用 hook `usePaperclipTaskStatus`
- Supabase `paperclip_tasks` 表 + API routes
- 多人協作欄位（工程師 profiles、領取、指派）

### 1.2 範圍外

- Paperclip 平台本體修改
- LLM provider 層面的 budget 設定（需在 Paperclip UI 手動設定）

---

## 2. 三階段實作

### P0: 拆 Modal + 內嵌狀態顯示

| 新檔案 | 行數 | 職責 |
|--------|------|------|
| `task-dispatch/TaskDispatchModal.tsx` | ~200 | IDE+角色+prompt 編輯+預覽+送出（送完即關） |
| `task-dispatch/TaskStatusChip.tsx` | ~100 | 表格 row 內嵌 status badge + cost |
| `task-dispatch/TaskDetailPanel.tsx` | ~250 | 展開面板：run log、worktree、cleanup |
| `task-dispatch/prompt-templates.ts` | ~120 | prompt 範本純函數 |
| `task-dispatch/status-styles.ts` | ~20 | STATUS_BADGE_STYLE 常數 |
| `lib/hooks/usePaperclipTaskStatus.ts` | ~150 | 共用輪詢 hook |

刪除：`PromptEngineerModal.tsx`

### P1: Server-side Task Queue

- Supabase migration: `paperclip_tasks` 表（含 partial unique index 防重複）
- API routes: `/api/paperclip/task-queue/` (CRUD + poll)
- 修改 `/api/paperclip/issues/route.ts`：issue 建立後自動 INSERT paperclip_tasks

### P2: 多人協作

- Supabase migration: `engineer_profiles` 表 + `paperclip_tasks` 加 `claimed_by`/`claimed_at`
- API routes: claim + assign
- 表格新增 2 欄：負責人、Paperclip 狀態

---

## 3. 技術約束

- TypeScript strict，禁 `any`
- 單檔不超過 500 行
- CSS token 色彩（text-text-primary、bg-bg-secondary）
- 複用既有純函數：`polling.ts`、`buildIssuePayload.ts`、`auto-route.ts`、`api-error-meta.ts`

---

## 4. 驗收條件

### P0
- [ ] TaskDispatchModal 可開啟、選 IDE/角色、預覽、送出、送完自動關閉
- [ ] 表格 row 顯示 TaskStatusChip（live status + cost）
- [ ] 點擊 chip 展開 TaskDetailPanel（run log + worktree info + cleanup）
- [ ] 所有既有 paperclip 測試通過
- [ ] 新元件各有對應測試
- [ ] PromptEngineerModal.tsx 已刪除

### P1
- [ ] `paperclip_tasks` 表建立成功
- [ ] 同一 rowId 無法建立兩個 active task（409 Conflict）
- [ ] Server-side poll 可更新 task 狀態、觸發重試
- [ ] 關閉瀏覽器後重新開啟，task 狀態仍然正確

### P2
- [ ] 工程師可領取未指派任務
- [ ] 已領取任務對其他人顯示「已被 XXX 領取」
- [ ] 管理員可手動指派

---

## 5. 審查清單

- [ ] P0/P1/P2 範圍與優先順序同意
- [ ] 與 Row 130/133 邊界清楚
- [ ] 驗收條件可測可逐項勾

---

## 6. 變更紀錄

| 日期 | 說明 |
|------|------|
| 2026/04/13 | 初版規格 |
