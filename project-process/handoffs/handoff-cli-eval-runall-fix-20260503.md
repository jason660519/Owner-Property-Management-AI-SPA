# Handoff — CLI Eval 全測按鈕修正

**日期**：2026-05-03  
**PR**：[#64 fix(cli-eval): 修正全測按鈕未依 shouldTest 篩選及缺乏 loading 狀態](https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/64)  
**狀態**：已 merge 到 main

---

## 變更摘要

### 問題

用戶新增 `shouldTest`（是否測試）功能後，點擊「全測（CLI）」按鈕，即使勾選了全部列，仍無反應：

1. **預設值錯誤**：`createCliCapabilityBaselineRow` 中 `shouldTest: codingTool !== 'copilot'` 導致 copilot 預設為 `false`，不納入全測
2. **靜默 return**：`runAll` 在無可執行列時直接 return，沒有任何使用者回饋
3. **無 loading 狀態**：全測執行中按鈕不禁用、不顯示進度

### 修正

**`cli-capability-row-state.ts` (line 98)**
```diff
- shouldTest: codingTool !== 'copilot',
+ shouldTest: true,
```

**`CliCapabilityEvaluationPanel.tsx`**
- 新增 `isRunningAll` / `runAllHint` state
- `runAll` 加 try/finally 管理 loading state；無列時顯示 amber 提示 3 秒
- 按鈕執行中顯示 spinner + 「執行中…」並 disabled

---

## 測試結果

- CI 全綠（Critical dependency guard / Typecheck / Lint / GitGuardian）
- 瀏覽器驗證：`hasDisabledClass: true` 在執行中確認按鈕 disabled
- localStorage `ai-settings:cli-capability:rows-v2` 清除後重整，所有 4 個 baseline 列 shouldTest 為 `true`

---

## 阻塞與注意事項

無阻塞。

**變更性質**：前端 UI bug fix，無後端影響，無資料庫變更。

---

## 下一步（無明確待辦）

此 fix 屬完整交付，無後續必做任務。若未來要調整 CLI 評測功能，參考：
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/cli-capability-row-state.ts`
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/CliCapabilityEvaluationPanel.tsx`
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/cli-eval-tool-config.ts`（工具清單與 status）
