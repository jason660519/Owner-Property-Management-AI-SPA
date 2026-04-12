# PromptEngineer 重建 — TDD-SPEC

**Row ID**: 135
**版本**: 0.1
**日期**: 2026/04/13
**狀態**: 開發中

---

## 1. 測試策略

### P0 測試範圍

| 測試類型 | 目標 | 檔案 |
|----------|------|------|
| 純函數測試 | prompt-templates.ts 所有函數 | `unit_test/135/prompt-templates.test.ts` |
| Hook 測試 | usePaperclipTaskStatus 輪詢行為 | `unit_test/135/usePaperclipTaskStatus.test.ts` |
| 元件測試 | TaskDispatchModal 開啟/選擇/送出 | `unit_test/135/TaskDispatchModal.test.tsx` |
| 元件測試 | TaskStatusChip badge 渲染 | `unit_test/135/TaskStatusChip.test.tsx` |
| 元件測試 | TaskDetailPanel run log + cleanup | `unit_test/135/TaskDetailPanel.test.tsx` |

### P1 測試範圍

| 測試類型 | 目標 | 檔案 |
|----------|------|------|
| API 測試 | task-queue CRUD + 防重複 | `unit_test/135/task-queue-api.test.ts` |
| API 測試 | poll route 重試邏輯 | `unit_test/135/task-queue-poll.test.ts` |
| Hook 測試 | usePaperclipTasks 全表查詢 | `unit_test/135/usePaperclipTasks.test.ts` |

### P2 測試範圍

| 測試類型 | 目標 | 檔案 |
|----------|------|------|
| API 測試 | claim / assign 端點 | `unit_test/135/claim-assign.test.ts` |
| 元件測試 | AssigneeColumn 領取/指派 | `unit_test/135/AssigneeColumn.test.tsx` |

---

## 2. 測試案例（P0 詳細）

### 2.1 prompt-templates.test.ts

```
describe('getDefaultPrompt')
  - returns string containing rowId and IDE label
  - includes COST_AND_API_DISCIPLINE section
  - handles empty IDE label gracefully

describe('WORK_CATEGORY_OPTIONS')
  - each category getPrompt returns string containing header and tddTail
  - all categories include cost discipline section

describe('header')
  - includes rowId and IDE label in output
  - includes feature spec and tdd spec paths
```

### 2.2 usePaperclipTaskStatus.test.ts

```
describe('usePaperclipTaskStatus')
  - does not poll when issueId is null
  - starts polling when issueId is provided
  - calls getPaperclipIssuePollDelayMs with correct args
  - stops polling when status is terminal
  - sets pollStopped=true after POLL_CONSECUTIVE_ERROR_LIMIT errors
  - retriggerPoll resets and restarts polling
  - cleans up on unmount (no lingering timers)
  - fetches cost once when status becomes terminal
  - fetches run log on each poll cycle
```

### 2.3 TaskDispatchModal.test.tsx

```
describe('TaskDispatchModal')
  - renders IDE select with all options
  - renders work category select
  - IDE change regenerates prompt text
  - category change updates prompt text
  - "Preview" button generates Paperclip preview
  - "Send" button calls confirm dialog
  - successful send calls onTaskCreated and onClose
  - failed send shows error with formatPaperclipErrorWithHint
  - disables send when companyId is empty
```

### 2.4 TaskStatusChip.test.tsx

```
describe('TaskStatusChip')
  - renders loading state when status is null
  - renders correct badge for each PaperclipIssueStatus
  - shows cost when available
  - shows pollStopped warning with retry button
  - onClick fires when provided
```

### 2.5 TaskDetailPanel.test.tsx

```
describe('TaskDetailPanel')
  - renders run log stdout excerpt
  - renders run log stderr in error style
  - shows worktree branch and container path
  - copy buttons copy correct git commands
  - cleanup button shows confirm dialog
  - cleanup success shows "已刪除" state
  - cleanup failure shows error with hint
  - onClose fires when close button clicked
```

---

## 3. 覆蓋率目標

| 類型 | 目標 |
|------|------|
| 純函數 | 100% |
| Hooks | 90%+ |
| 元件（渲染+互動） | 80%+ |
| API routes (P1) | 80%+ |

---

## 4. 測試工具

- Jest + @testing-library/react
- vi.useFakeTimers() for polling tests
- msw or manual fetch mock for API calls

---

## 5. 變更紀錄

| 日期 | 說明 |
|------|------|
| 2026/04/13 | 初版 TDD 規格 |
