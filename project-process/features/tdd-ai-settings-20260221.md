# TDD 規格報告：超級管理員-AI 服務設定 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tdd-ai-settings-20260221.html`

---

# TDD 規格報告：超級管理員-AI 服務設定（API 金鑰與模型費用）

超級管理員

85%

手動驗證通過

2026/02/21

5 SP

Claude (Auto)

## 一、驗收標準 (Acceptance Criteria)

- API 金鑰管理：從 .env 導入、單筆/全部刪除、金鑰驗證功能均可正常操作

- 未登入時以 resolveUserId fallback 寫入/讀取 Supabase（keys/models/modules/prompts）

- 側欄組態概況：已選總 models 數量即時反映各 provider 勾選加總

- 儲存設定按鈕：將畫面上已選模型寫入 `ai_model_selections`

- 分頁命名「模型費用說明」；說明文案導向「模型費用說明」分頁

## 二、測試案例清單

| # | 測試描述 | 類型 | 狀態 | 執行者 |
| --- | --- | --- | --- | --- |
| T-01 | 點擊「從 .env 導入」後 API 金鑰正確載入 | 功能 | PASS | 手動 2026/02/18 |
| T-02 | 點擊「全部清空」後所有金鑰從 Supabase 刪除 | 功能 | PASS | 手動 2026/02/18 |
| T-03 | 點擊單筆刪除後該金鑰從列表消失 | 功能 | PASS | 手動 2026/02/18 |
| T-04 | 點擊「驗證金鑰」後顯示有效/無效狀態 | 功能 | PASS | 手動 2026/02/18 |
| T-05 | 勾選模型後側欄「已選 models 數量」即時更新 | 狀態 | PASS | 手動 2026/02/18 |
| T-06 | 點擊「儲存設定」後資料寫入 ai_model_selections | 資料 | PASS | 手動 2026/02/18 |
| T-07 | 未登入狀態下設定仍可儲存（resolveUserId fallback） | 邊界 | PASS | 手動 2026/02/18 |
| T-08 | 分頁標籤「模型費用說明」正確顯示 | UI | PASS | 手動 2026/02/18 |
| T-09 | E2E 自動化測試：完整 API 金鑰管理流程 | E2E | 待補 | 需 Playwright 補測 |
| T-10 | TypeScript 型別嚴格驗證（禁 any） | 型別 | PASS | npm run build 通過 |

## 三、Supabase 資料表對應

| 資料表 | 操作 | 對應功能 |
| --- | --- | --- |
| `ai_api_keys` | INSERT / DELETE / SELECT | API 金鑰管理 |
| `ai_model_selections` | UPSERT / SELECT | 儲存已選模型 |
| `ai_modules` | SELECT | 顯示可用模組 |
| `ai_prompts` | SELECT / UPSERT | 系統提示詞管理 |

## 四、已知缺陷與待補項目

| 缺陷ID | 描述 | 優先級 | 狀態 |
| --- | --- | --- | --- |
| BUG-01 | E2E 自動化測試尚未補充 | 中 | 開放 |
| BUG-02 | 金鑰驗證 API 呼叫頻率限制未處理 | 低 | 開放 |

## 五、結論

AI 服務設定頁面核心功能（API 金鑰 CRUD、模型選擇、設定儲存）已完成手動驗證，所有主要 AC 通過。剩餘 15% 為 E2E 自動化測試補充與費率限制處理。
