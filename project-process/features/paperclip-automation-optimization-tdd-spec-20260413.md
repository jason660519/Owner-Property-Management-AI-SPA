# Paperclip 全自動開發流程優化 — TDD SPEC

**功能代號（測試目錄／manifest）**: 133  
**功能名稱**: Paperclip 全自動開發流程優化（API 成本／卡住與重試／Mac mini 24h 穩定）  
**備註**: 儀表板顯示之 Row ID 以 `project-progress` 為準（與代號 133 可能不同）。  
**版本**: 1.0  
**日期**: 2026/04/13  
**測試框架**: Jest（superadmin workspace）+ 可選 Playwright（E2E）  
**狀態**: 已實作；核心新增測試見 `lib/paperclip/__tests__/polling.test.ts`、`api-error-meta.test.ts`

---

## 1. 測試目標

在 Row 130 既有基線上，確保本次優化：

1. **輪詢與 backoff** 行為可單元測試或可預測（避免無限高頻請求）。
2. **錯誤分類與訊息** 不回歸現有 `createIssue` / `fetchIssue*` 的 union 型別與 HTTP 語意。
3. **既有 Paperclip 路由與 lib** 全套測試持續綠燈；新增測試僅覆蓋本次變更點。

---

## 2. 測試資產配置

| 類型 | 路徑（預設） |
|------|----------------|
| 單元／整合測試目錄 | `apps/superadmin/unit_test/133/` |
| 延伸既有測試 | `apps/superadmin/lib/paperclip/__tests__/`、`apps/superadmin/app/api/paperclip/**/__tests__/`、`apps/superadmin/.../PromptEngineerModal*.test.tsx`（依實際改動檔案增補） |
| E2E（可選） | `apps/superadmin/e2e/133/`（若新增，沿用 mock `/api/paperclip/*` 策略，避免依賴真實 Paperclip） |

---

## 3. 建議測試案例（審查通過後實作）

### 3.1 輪詢與 backoff

- 給定 issue status 為 terminal（`done` / `cancelled`），輪詢 hook 或元件在 N 次後停止或降頻（實作時鎖定常數並寫入測試）。
- 給定 `blocked` 或非 terminal，行為符合產品預期（不誤判為停止）。

### 3.2 錯誤分類

- 模擬 `fetch` 網路錯誤 → 預期 `status: 0` 與可辨識訊息前綴（與現有 `client.ts` 一致或延伸）。
- 模擬 401 / 422 / 500 → UI 或上層不丟未處理例外；訊息含 HTTP 或 body `error` 欄位時優先顯示。

### 3.3 迴歸

- 執行：`npm run test --workspace superadmin -- paperclip --runInBand`  
  - 審查通過後，**不得**降低 Row 130 已達成的通過數作為合併條件。
- 若改動 Modal：至少跑 `PromptEngineerModal` 相關測試檔與 `prompt-auto-loop` 測試。

---

## 4. test-manifest.json

- `id: "133"`：`unitPaths` 含 `polling.test.ts`、`api-error-meta.test.ts`；`linkedToolScripts` 含 `tools/paperclip/health-check.sh`；已通過 `validate-test-manifest.sh`。

---

## 5. 完成定義（Definition of Done）

- [x] DEV-SPEC 驗收條件已勾選完成項。
- [x] `npm run test --workspace superadmin -- paperclip --runInBand` 全綠（含本項新增測試）。
- [x] `tools/testing/validate-test-manifest.sh` 通過。
- [x] `roadmap.ts` 已更新進度、Testing 欄位與 `docPath`。

---

## 6. 變更紀錄

| 日期 | 說明 |
|------|------|
| 2026/04/13 | 初版 TDD 規格（審查稿） |
