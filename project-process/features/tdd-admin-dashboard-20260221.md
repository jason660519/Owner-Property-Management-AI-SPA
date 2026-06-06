# TDD 規格報告：超級管理員-儀表板 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tdd-admin-dashboard-20260221.html`

---

# TDD 規格報告：超級管理員-儀表板

超級管理員

100%

自動化測試通過

2026/04/11

8 SP

Trae AI / Claude Sonnet 4.6

## 一、驗收標準 (Acceptance Criteria)

- 登入後首頁需顯示系統關鍵指標（KPI），包含總用戶數、總物件數、成交金額

- 需提供圖表視覺化呈現最近30天的平台流量趨勢

- 儀表板需顯示待處理的審核事項通知

- 需支援數據篩選功能，可依日期區間查看統計數據

- 頁面載入速度需在2秒內完成，確保良好的使用者體驗

## 二、測試案例清單

| # | 測試描述 | 類型 | 狀態 | 備註 |
| --- | --- | --- | --- | --- |
| T-01 | 登入後能正確渲染儀表板首頁 | UI | PASS | 自動化：unit_and_integration_test/001 |
| T-02 | KPI 卡片顯示總用戶數（非空值） | UI | PASS | 自動化：unit_and_integration_test/001 |
| T-03 | KPI 卡片顯示總物件數 | UI | PASS | 自動化：unit_and_integration_test/001 |
| T-04 | 欄位拖曳調整寬度功能正常 | 互動 | PASS | 2026/02/13 Trae AI 驗證 |
| T-05 | localStorage 欄寬偏好記憶還原 | 互動 | PASS | 2026/02/13 Trae AI 驗證 |
| T-06 | RWD 響應式版面（手機/平板/桌機） | RWD | PASS | 自動化：unit_and_integration_test/001 |
| T-07 | 頁面載入時間 < 2 秒 | 效能 | 待量測 | 需 Lighthouse 確認 |
| T-08 | 待處理事項通知數徽章正確顯示 | UI | PASS | 2026/04/11 實作 + 自動化通過 |
| T-09 | 日期篩選器切換後圖表數據即時更新 | 互動 | PASS | 2026/04/11 實作 + 自動化通過 |
| T-10 | 四個 Tab 切換（開發/測試/部署/運維）正常 | 導航 | PASS | 2026/02/19 四階段重構後驗證 |

## 三、開發日誌摘要

[2026/02/13] Trae AI
• 完成儀表板進度頁面重構，支援 9 欄位動態調整寬度
• 實作欄位順序優化與雙語標題顯示
• 新增 `dev-logs` 與 `test-logs` 資料夾結構
• UI/UX 功能測試通過（欄位拖曳、記憶還原、RWD）

[2026/02/19] Claude Sonnet 4.6
• 四階段 Tab 重構完成（開發/測試/部署/運維）
• page.tsx 從 1,478 行縮減至 87 行（重構率 94%）
• npm run build 零 TypeScript 錯誤

[2026/04/11] Claude Sonnet 4.6 (VIS-12 / feature/row-001)
• 實作 T-08：待處理審核事項通知徽章（`pendingVerifications` 來自 AdminStats）
• 實作 T-09：SystemGrowthChart 日期篩選（30天/90天/180天），點選後圖表即時更新
• 建立自動化測試：`unit_and_integration_test/001/` (17 tests, 2 suites — 全部通過)
• 建立 E2E 測試規格：`e2e/001/superadmin-dashboard.spec.ts`
• 新增 `jest.row-001.config.js` 使用 babel-jest 繞過 arm64 SWC 限制

## 四、已知缺陷與待補項目

| 缺陷ID | 描述 | 優先級 | 狀態 |
| --- | --- | --- | --- |
| BUG-01 | 頁面載入效能未以 Lighthouse 量測確認 | 中 | 開放 |
| BUG-02 | 待處理事項通知系統尚未整合 | 高 | **已解決** 2026/04/11 |
| BUG-03 | 日期範圍篩選功能未實作 | 高 | **已解決** 2026/04/11 |

## 五、結論

儀表板核心 UI 架構已完成，T-08 通知徽章與 T-09 日期篩選均已實作並通過自動化測試。
測試覆蓋率：17 個單元/整合測試（2 個測試套件），E2E 測試規格已建立。
剩餘工作：T-07 Lighthouse 效能量測（BUG-01）。
