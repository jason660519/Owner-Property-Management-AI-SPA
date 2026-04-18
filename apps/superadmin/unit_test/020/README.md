# Row 020 測試說明（聯絡我們>發送訊息功能）

## 目的

驗證聯絡頁面（`/contact`）的三個核心能力：

1. 來源參數（`sourcePath`、`entryPoint`、`propertyId`、`propertyTitle`）的安全清洗邏輯。
2. 詢問類型選項完整性與 `getSourceSummary` 輔助函式正確性。
3. 表單送出後的 DB 寫入、Email 發送及錯誤隔離機制。

## 對應測試

### 單元 / 整合測試（Jest — superadmin 環境）

- `apps/superadmin/unit_and_integration_test/020/contact-action.test.ts`
  - 驗證 `sanitizeSourcePath`、`sanitizeEntryPoint`、`sanitizePropertyId`、`sanitizePropertyTitle` 的正反向案例
  - 驗證 `inquiryOptions` 的完整性
  - 驗證 `getEntryPointLabel` 與 `getSourceSummary` 輔助函式

### Web 層測試（Jest — apps/web 環境）

- `apps/web/app/contact/__tests__/utils.test.ts` — Utils 完整測試
- `apps/web/app/contact/__tests__/page.test.tsx` — 頁面渲染與來源摘要顯示
- `apps/web/lib/actions/__tests__/contact.test.ts` — Server Action 整合測試（DB + Email 模擬）

### E2E / 驗收測試（Playwright）

- `apps/superadmin/e2e/020/contact-submit.spec.ts` — 端對端驗收（瀏覽器操作 localhost:3000/contact）
- `apps/web/e2e/flows/public/contact-submit.spec.ts` — 公開頁面 Lead 捕捉流程

## 執行方式

### 單元 / 整合測試

```bash
# 在 apps/superadmin 執行 Row 020 專屬測試
npx jest --config=jest.row-001.config.js unit_and_integration_test/020 --no-coverage

# 在 apps/web 執行聯絡功能相關測試
npm test -- --testPathPattern="contact" --no-coverage
```

### E2E 測試

```bash
# 啟動 web app（須先在另一個 terminal 執行）
# cd apps/web && npm run dev

# 執行 Row 020 E2E 測試
npx playwright test e2e/020/contact-submit.spec.ts

# 執行 web 端公開頁面 E2E
cd apps/web && npx playwright test e2e/flows/public/contact-submit.spec.ts
```
