# TDD Spec - Prompt and IDE Setting 升級（Manual/Auto 雙模式）

日期: 2026-04-13  
任務 ID: 132

## 1. 測試策略

採 Red -> Green -> Refactor，分三層：

1. Unit: 狀態機與策略計算
2. Integration: Modal + API polling 行為
3. E2E: 實際 UI 操作與 run 狀態呈現

## 2. Unit Tests

目錄: `apps/superadmin/unit_test/132/`

### 2.1 策略與狀態機

- `should default to manual mode`
- `should switch to auto mode and persist policy in component state`
- `should increment attempt count on failed run`
- `should enter cooling_down between retries`
- `should enter tripped after threshold reached`
- `should reset auto execution state when mode switches back to manual`

### 2.2 結果解析

- `should parse succeeded status and stop retry loop`
- `should parse failed/errored/cancelled as terminal failure`
- `should keep pending/running as non-terminal`

## 3. Integration Tests

建議檔案：

- `PromptEngineerModal.auto-mode.test.tsx`

案例：

- 切換 Auto 模式後顯示策略欄位
- 首次失敗後顯示 attempt=1 與失敗原因
- 重試成功時顯示 succeeded 並停止重試
- 超過熔斷門檻時顯示 tripped 提示
- 熔斷時觸發 pause action（mock API）

## 4. E2E Tests

目錄: `apps/superadmin/e2e/132/`

案例：

1. 進入 project-progress，開啟 Prompt modal
2. 切到 Auto 模式，設定 `maxAttempts=2`
3. 模擬第一次失敗，確認進入 cooldown
4. 模擬第二次成功，確認狀態轉為 succeeded
5. 另一條路徑：連續失敗達閾值，確認顯示熔斷與 paused

## 5. Mock 與測試資料

- 使用既有 Paperclip API mock 風格
- 固定回傳 heartbeat-runs 的 status 序列以重現重試/熔斷
- 不依賴真實第三方 API key

## 6. 驗收門檻

- Unit + Integration + E2E 全綠
- 不得降低既有 ID 130 相關測試覆蓋
- 無新增 lint/type error

## 7. 退出條件

以下任一成立即可視為完成：

- Auto 模式全流程可通過上述測試案例
- Manual 模式既有功能無回歸（preview/send/worktree/run log）
