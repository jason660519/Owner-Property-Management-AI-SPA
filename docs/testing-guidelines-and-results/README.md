# 測試指導文件使用說明

本文件說明如何使用 `testing-guidelines-and-results` 資料夾中的測試策略、模板與成果歸檔規範，協助你從環境建置、測試執行到結果分析與問題追蹤，形成閉環流程。

## 目錄結構

- testing-guidelines.md：專案測試策略、類型、環境與指令總覽
- test-results/：集中存放測試執行結果（coverage、E2E 報告、驗收報告）
- testing-templates/：
  - test-case-template.md：撰寫個別測試案例的標準格式
  - test-script-template.sh：通用測試腳本（支援 unit/coverage/e2e）與自動歸檔
  - bug-report-template.md：錯誤回報模板，便於追蹤與修復

## 環境建置

1. 於專案根目錄安裝依賴
   
   ```bash
   npm ci
   ```
2. 若需執行 E2E，安裝 Playwright 瀏覽器
   
   ```bash
   npx playwright install --with-deps
   ```
3. 設定必要公開環境變數（E2E）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 測試執行流程

1. 選擇工作區（apps/web 或 apps/superadmin），在專案根目錄執行
   - 單元/整合測試（web）
     
     ```bash
     npm run test --workspace web
     ```
   - 覆蓋率（web）
     
     ```bash
     npm run test:coverage --workspace web
     ```
   - E2E（web）
     
     ```bash
     npm run test:e2e --workspace web
     npm run test:e2e:report --workspace web
     ```
   - 單元/整合測試（superadmin）
     
     ```bash
     npm run test --workspace superadmin
     ```

2. 亦可使用模板腳本（自動歸檔）
   
   ```bash
  cd "docs/testing-guidelines-and-results/testing-templates"
   chmod +x ./test-script-template.sh
   ./test-script-template.sh web coverage
   ./test-script-template.sh web e2e
   ```

## 結果分析方法

- Coverage（apps/web）
  - 來源：`apps/web/coverage/`
  - 重點：覆蓋率是否達標（branches/functions/lines/statements）
  - 建議：優先補齊關鍵路徑、錯誤處理與高風險模組
- E2E 報告（Playwright）
  - 使用 `playwright show-report` 或開啟歸檔目錄中的 HTML 報告
  - 檢視：失敗案例、截圖、影片、traces 以定位問題
- 驗收報告
  - 在 `test-results/acceptance/YYYYMMDD/` 編寫階段性驗收報告（範圍、結論、風險）

## 問題追蹤與修復

1. 以 bug-report-template.md 建立回報
   - 附上重現步驟、環境、相關測試案例與報告連結
2. 修復後新增或更新對應測試
   - 確保問題不再發生（避免回歸）
3. 本地重新執行測試並更新歸檔
   - coverage：`test-results/coverage/<timestamp>/`
   - e2e：`test-results/e2e/<timestamp>/`

## 撰寫與維護建議

- 嚴格使用模板：案例、腳本與回報一律依模板撰寫
- 小步快跑：每次改動對應最小可測單元，及早發現問題
- 可重現與可追溯：所有結果均需歸檔並在回報中附連結
- 與 CI 對齊：命令與目錄盡量對應 CI 腳本與慣例

若需擴充效能測試、靜態分析等內容，請新增對應小節與腳本，並遵循相同歸檔規範。
