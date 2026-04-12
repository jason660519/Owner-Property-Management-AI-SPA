# Prompt and IDE Setting 升級（Manual/Auto 雙模式）Dev Spec

日期: 2026-04-13  
任務 ID: 132  
範圍: `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/PromptEngineerModal.tsx` 與相關 API/型別

## 1. 目標

將現有單一路徑的 Prompt 設定流程升級為兩種執行模式：

- Manual: 維持既有「預覽/送出 Paperclip issue」流程
- Auto: 以可控策略自動觸發 heartbeat 與追蹤結果

同時新增失敗熔斷、重試與可觀測欄位，避免 Adapter failed 無限擴散。

## 2. 問題陳述

目前流程以手動送單為主，雖可看到 run log/status，但缺少：

- 明確的自動化策略設定（重試、冷卻、熔斷）
- 執行結果標準化回寫（runId/reason/attempt）
- 失敗後自動保護（自動 pause agent）

## 3. 功能需求

1. 在 Modal 新增執行模式切換（Manual / Auto）
2. Auto 模式新增策略欄位：
   - `maxAttempts`（預設 2）
   - `cooldownSeconds`（預設 30）
   - `circuitBreakerThreshold`（預設 3）
3. 每次 Auto run 記錄：
   - `lastRunId`
   - `lastRunStatus`
   - `lastFailureReason`
   - `attemptCount`
4. 連續失敗達門檻時：
   - 暫停該 agent（Pause）
   - 在 UI 顯示「已熔斷」提示
5. 不改變既有 worktree 安全護欄與 preview/send API 介面

## 4. 非功能需求

- TypeScript strict，禁止 `any`
- 不新增 root 層臨時檔
- 既有 Paperclip route 測試不可回歸
- UI 操作應在 2 秒內可回應（非 run 完成）

## 5. 主要設計

### 5.1 前端狀態模型

在 Modal 中引入 `executionMode` 與 `autoPolicy` 狀態，並增加 `autoExecutionState`：

- idle / running / cooling_down / tripped

### 5.2 執行流程

1. 使用者選擇 Auto 模式並儲存策略
2. 系統送出 issue 或 heartbeat
3. 輪詢 run status
4. 若失敗：
   - 記錄原因與 attempt+1
   - 若未達上限，冷卻後重試
   - 若達熔斷門檻，切 pause 並標記 tripped

### 5.3 可觀測性

Modal 顯示：

- 最近 runId（可點開）
- 目前 attempt / maxAttempts
- 上次失敗原因
- 是否熔斷

## 6. 影響檔案（預估）

- `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/PromptEngineerModal.tsx`
- `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/types.ts`
- `apps/superadmin/app/api/paperclip/issues/[issueId]/status/route.ts`（若需補充欄位）
- `apps/superadmin/app/api/paperclip/issues/[issueId]/run-log/route.ts`（若需補充欄位）

## 7. 風險與緩解

- 風險: Auto 模式導致 run 洪水  
  緩解: 強制上限、冷卻時間、熔斷門檻

- 風險: 與既有 Manual 流程互相污染  
  緩解: 模式切換後明確 reset 臨時狀態，保留現有 API 契約

## 8. 完成定義（DoD）

- Manual/Auto 兩模式可切換且功能可用
- Auto 策略可生效（重試、冷卻、熔斷）
- 失敗時可追溯 runId 與原因
- 單元測試與 E2E 測試全綠
