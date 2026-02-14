# AI VLM 智能謄本權狀掃描功能開發報告

> **項目代號**: RESA-VLM-DOC-SCAN
> **報告日期**: 2026-02-04
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **版本**: 1.0

---

## 董事長摘要版

### 項目概述

開發 AI 視覺語言模型（VLM）智能掃描功能：用戶上傳謄本或權狀照片/PDF，系統自動識別「所有權人姓名」與「物件地址」並自動填入新增物件表單；支援使用者自行輸入與管理 VLM API Key（BYOK）。

### 投資效益分析

| 項目           | 金額/數據               | 說明                     |
| -------------- | ----------------------- | ------------------------ |
| 開發成本       | NT$ 200,000 - 300,000   | 1 名資深工程師 × 20 天   |
| 月運營成本     | US$ 110 - 330           | AI API + 雲端儲存        |
| 投資回收期     | 3-6 個月                | 基於效率提升與錯誤減少   |
| 用戶時間節省   | 每份文件 5-10 分鐘     | 人工輸入 → AI 自動識別   |
| 錯誤率降低     | 約 15% → 5%            | 人工輸入錯誤減少         |

### 競爭優勢

- 業界首創（台灣房地產平台首家 VLM）
- 用戶體驗躍升、準確度提升、品牌差異化、BYOK 彈性

---

## 核心開發任務摘要

- **Task 1 後端**: 文件上傳與安全檢查、VLM 解析（台灣謄本 Prompt）、結果驗證、使用者 API Key 管理（KMS、審計）
- **Task 2 前端**: VLMDocumentUpload、ParsedResultPreview、VLMApiKeyDrawer、useVLMKeyManager
- **Task 3 安全**: ClamAV 掃描、檔案名稱安全過濾、API Key 加密與審計
- **Task 4 測試**: 單元、整合、效能測試
- **Task 5 多看板**: 共用 VLM widget、headless hook、URL 參數 prefill

實際實作狀態與檔案清單見 [實作總結](./implementation_summary.md)、[實作狀態](./implementation_status.md)。

---

## 成功指標 (KPIs)

- **技術**: 上傳成功率 >99%、VLM 解析成功率 >95%、上傳 <2s (p95)、解析 <8s (p95)、可用性 >99.9%
- **業務**: 用戶採用率 >70%、解析正確率 >95%、每份文件節省 5–10 分鐘、滿意度 >4.5/5
- **成本**: VLM API 月成本 <$300、基礎設施 <$100/月、總運營 <$500/月

---

## 交付清單（對照現況）

- [x] 功能代碼（後端 + 前端）
- [x] 單元測試（KMS、Validator 等）
- [x] 整合/E2E 測試（含 vlm-document-scan.spec.ts）
- [x] 文檔（本目錄 quickstart、implementation_summary、integration_example 等）
- 部署與 CI/CD、Docker/監控配置可依專案需求另行實作

---

## 相關文檔

- [快速啟動](./quickstart.md)
- [實作總結](./implementation_summary.md)
- [整合範例](./integration_example.md)
- [VLM 文檔中心](./README.md)

---

**最後更新**: 2026-02-15
