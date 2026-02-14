# 測試指導方針（Testing Guidelines）

本文件定義本專案的整體測試策略、測試類型與範圍、環境建置步驟，以及各類測試的標準執行命令與輸出歸檔位置。目標是讓所有工程師以一致、可追溯的方式撰寫、執行與分析測試。

## 測試總覽

- 技術棧（前端工作區）
  - Unit/Integration：Jest + Testing Library（apps/web、apps/superadmin）
  - E2E：Playwright（apps/web）
- Monorepo 工作區（npm workspaces）
  - 根目錄 scripts 會代理至各 workspace
  - apps/web 與 apps/superadmin 均提供測試腳本

## 測試類型與範圍

- 單元測試（Unit Test）
  - 驗證函式、hook、React 組件等最小單元的邏輯正確性。
  - 位置建議：`__tests__`、與來源檔案同層或相鄰。
  - 檔名範例：`*.test.ts(x)`。
- 整合測試（Integration Test）
  - 驗證多個模組/組件串接後的行為（可搭配 mock/stub）。
  - 檔名範例：`*.integration.test.ts(x)`。
- 端對端測試（E2E）
  - 以使用者視角從瀏覽器操作 UI，到驗證應用回饋的整體流程。
  - 位置建議：`apps/web/e2e/**`。
  - 檔名範例：`*.spec.ts`。

## 環境建置

1. Node 與依賴
   - 建議 Node 20；使用 root 的 npm workspaces。
   - 在專案根目錄：
     
     ```bash
     npm ci
     ```

2. Playwright 瀏覽器
   - 僅當執行 E2E 時需要：
     
     ```bash
     npx playwright install --with-deps
     ```

3. 必要環境變數（E2E）
   - 某些 E2E 測試需使用公開的 Supabase 參數：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 可於本機 shell 匯出，或建立 `.env.local`（依專案現行做法）：
     
     ```bash
     export NEXT_PUBLIC_SUPABASE_URL=...
     export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
     ```

## 執行命令總表

- 根目錄（代理至工作區）
  - 所有工作區測試：
    
    ```bash
    npm run test
    ```
  - Lint（如工作區提供）：
    
    ```bash
    npm run lint
    ```

- apps/web
  - 單元/整合測試：
    
    ```bash
    npm run test --workspace web
    ```
  - 監看模式：
    
    ```bash
    npm run test:watch --workspace web
    ```
  - 覆蓋率：
    
    ```bash
    npm run test:coverage --workspace web
    ```
  - 更詳細輸出：
    
    ```bash
    npm run test:verbose --workspace web
    ```
  - E2E 測試：
    
    ```bash
    npm run test:e2e --workspace web
    ```
  - 查看 E2E 報告（Playwright）：
    
    ```bash
    npm run test:e2e:report --workspace web
    ```
  - E2E 除錯界面：
    
    ```bash
    npm run test:e2e:debug --workspace web
    ```

- apps/superadmin
  - 單元/整合測試：
    
    ```bash
    npm run test --workspace superadmin
    ```

## 輸出與歸檔

- Coverage（apps/web/jest）
  - 預設輸出於 `apps/web/coverage/`。
  - 歸檔規範：將執行後產出複製至
    `docs/testing-guidelines and results/test-results/coverage/YYYYMMDD-HHMM/`。
  - 建議保留 `lcov.info` 與 `html` 報告。

- E2E 報告（Playwright）
  - 預設輸出於 `apps/web/playwright-report/`，或以 `playwright show-report` 查看。
  - 歸檔規範：將整個報告目錄複製至
    `docs/testing-guidelines and results/test-results/e2e/YYYYMMDD-HHMM/`。

- 測試驗收報告
  - 請於 `test-results/acceptance/YYYYMMDD/` 建立驗收報告（格式與欄位可自行擴充）。
  - 建議附：測試範圍、環境資訊、版本編號、關鍵指標、風險與例外。

## 撰寫原則（摘要）

- 描述清楚意圖與預期行為；避免模糊測試名稱。
- 儘量以使用者可見屬性選取元素（text、role）提升 E2E 韌性。
- 非同步行為使用 `await`；避免硬等待，優先使用條件與期望。
- 減少對實作細節的耦合；介面契約優先。
- 變更後先本地通過測試再推送。

## 常見問題（FAQ）

- E2E 執行無瀏覽器
  - 先執行 `npx playwright install --with-deps`。
- 覆蓋率為空
  - 確認測試檔名與匹配規則、被測目錄是否包含於 `collectCoverageFrom`。
- 找不到工作區命令
  - 確認在專案根目錄執行，並確保 `apps/*` 已安裝依賴（`npm ci`）。

