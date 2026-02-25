# TDD 規格報告：公司頁面與第三方服務功能群組 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tdd-company-pages-thirdparty-20260221.html`

---

# TDD 規格報告：公司頁面與第三方服務功能群組

5 項

4 項

0–100%

2026/02/21

## 一、公司頁面功能測試清單

| # | 功能 | 進度 | 測試描述 | 類型 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| T-01 | 公司首頁 | 80% | Lighthouse LCP  20% 時告警）。

第三方 API 整合：先以 MSW（Mock Service Worker）模擬 API 回應進行快速單元測試，再於 Staging 環境連真實沙盒 API 執行整合測試。
