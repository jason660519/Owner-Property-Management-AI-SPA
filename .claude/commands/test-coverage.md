為指定的檔案或元件產生測試，並確認通過。

## 輸入

`$ARGUMENTS` — 目標檔案路徑或元件名稱。若未提供，根據最近的 git diff 找出需要測試的變更檔案。

## 流程

### 1. 分析目標

- 讀取目標檔案，理解其功能、props、dependencies
- 確認所在 app（`apps/web` 或 `apps/superadmin`），決定測試目錄
- 檢查是否已有測試檔案（同目錄 `__tests__/` 下）

### 2. 產生測試

依專案慣例建立測試：

**單元測試（Jest + Testing Library）**
- 位置：同目錄下 `__tests__/FileName.test.tsx`
- 框架：Jest + `@testing-library/react`
- 必須 mock Supabase client（`@/utils/supabase/client` 或 `/server`）
- 必須 mock `next/navigation`（useRouter, useSearchParams 等）
- TypeScript strict：測試資料要正確標型別，避免 `as any`

**E2E 測試（Playwright）**（僅限 `apps/web`，且使用者明確要求時）
- 位置：`apps/web/e2e/flows/{module}/filename.spec.ts`
- 框架：Playwright

### 3. 測試結構

每個測試檔應包含：
- **渲染測試**：元件是否正常渲染
- **互動測試**：按鈕點擊、表單輸入等行為
- **邊界案例**：空值、錯誤狀態、loading 狀態
- **條件渲染**：不同 props/state 下的顯示邏輯

### 4. 驗證

- 在對應 app 目錄下執行：`npx jest path/to/file.test.tsx`
- 確認所有測試通過
- 如有失敗，讀取錯誤訊息並修復，重跑直到全過

## 注意事項

- TypeScript strict mode，禁止 `any`
- 測試資料用 `as const` 或明確型別標注
- Mock 只 mock 外部依賴，不 mock 被測元件內部邏輯
- 測試命名用英文，describe/it 描述清晰
