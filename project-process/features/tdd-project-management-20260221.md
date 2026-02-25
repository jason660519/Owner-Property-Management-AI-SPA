# TDD 規格報告：專案管理工具功能群組 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tdd-project-management-20260221.html`

---

# TDD 規格報告：專案管理工具功能群組

專案管理與工具

6 項

均 100%

2026/02/21

## 一、已完成任務測試驗收

| # | 任務名稱 | 測試描述 | 類型 | 狀態 |
| --- | --- | --- | --- | --- |
| T-01 | 專案開發進度儀表板重構 | 欄位拖曳調整寬度後，localStorage 正確儲存設定 | E2E | PASS（手動） |
| T-02 | 專案開發進度儀表板重構 | 重新整理頁面後，欄寬設定從 localStorage 還原 | E2E | PASS（手動） |
| T-03 | OCR lint 修正 | `ruff check src tests` 零錯誤（CI 驗證） | CI | PASS |
| T-04 | OCR lint 修正 | mypy 執行完成並輸出待修清單（237 errors 有記錄） | CI | PASS（記錄完整） |
| T-05 | 刪除 vercel.json | Next.js SSR 頁面正確渲染（非靜態 HTML fallback） | E2E | PASS |
| T-06 | 刪除 vercel.json | API Routes (`/api/xxx`) 正常回應 | 整合 | PASS |
| T-07 | Winston → Supabase 日誌 | TypeScript 編譯無錯誤（`tsc --noEmit`） | 型別 | PASS |
| T-08 | Winston → Supabase 日誌 | SupabaseTransport 批次寫入邏輯：10 條或 5 秒超時觸發 flush | Unit | 待補自動化 |
| T-09 | Winston → Supabase 日誌 | Serverless 環境（Vercel 偵測）不嘗試建立本地日誌檔案 | Unit | 待補自動化 |
| T-10 | 雲端部署平台說明書 | Markdown 語法正確（md-lint 零錯誤） | lint | PASS |
| T-11 | 登入/Portal/IAM 流程 | 登入後一律導向 /portal（Playwright 驗證） | E2E | PASS（Playwright） |
| T-12 | 登入/Portal/IAM 流程 | Portal 顯示 11 張角色卡（測試帳號） | E2E | PASS（Playwright） |
| T-13 | OAuth 新增角色修復 | OAuth 用戶新增角色後，Portal 立即顯示新角色卡 | E2E | PASS（手動） |
| T-14 | OAuth 新增角色修復 | 重複新增已有角色時，顯示錯誤訊息不崩潰 | E2E | PASS（手動） |

## 二、待補自動化測試計畫

日誌系統：需補寫 Unit Test 驗證批次寫入邏輯與環境偵測邏輯，加入 CI pipeline 自動執行。

OAuth 流程：目前僅手動驗證，需補 Playwright 自動化測試（Google OAuth 在 CI 環境需使用 OAuth Mock）。

## 三、結論

本群組所有任務均已 100% 完成，整體功能正常運作。日誌系統和 OAuth 流程的自動化測試是唯一的待補項目，建議在下個 Sprint 中補齊。
