# VLM 文件掃描功能文檔中心

> **創建日期**: 2026-02-15
> **最後修改**: 2026-02-15
> **說明**: 專案內所有 Vision Language Model（VLM）謄本／權狀掃描相關文檔統一入口

---

## 文檔索引

| 文檔 | 說明 |
|------|------|
| [quickstart.md](./quickstart.md) | 快速啟動指南（環境、遷移、Storage、啟動與測試） |
| [ready_to_test.md](./ready_to_test.md) | 測試就緒檢查、測試步驟與 API 端點驗證 |
| [implementation_summary.md](./implementation_summary.md) | 實作總結（Phase、檔案清單、環境變數、部署與安全） |
| [implementation_status.md](./implementation_status.md) | 實作狀態與單元／整合測試報告 |
| [integration_example.md](./integration_example.md) | 前端整合範例（表單嵌入、UI 狀態、錯誤處理） |
| [test_report.md](./test_report.md) | 測試報告（Migration、KMS、Validator、待測項） |
| [final_implementation_report.md](./final_implementation_report.md) | 最終實作狀態與 E2E 驗證 |
| [development_report.md](./development_report.md) | 開發規劃報告（投資效益、任務拆解、部署與 KPI） |

---

## 功能概述

VLM 文件掃描功能讓使用者上傳謄本或權狀（PDF/圖片），由 AI 視覺語言模型辨識「所有權人姓名」「物件地址」等欄位，並支援一鍵帶入新增物件表單。使用者可自行設定與管理 VLM API Key（BYOK）。

### 相關程式位置

- **後端**: `backend/ocr_service/`（KMS、VLM Engine、文件上傳／解析 API）
- **前端**: `apps/web/components/vlm/`、`apps/web/hooks/useVLMKeyManager.ts`
- **E2E**: `apps/web/e2e/flows/landlord/vlm-document-scan.spec.ts`
- **資料庫**: `supabase/migrations/20260204120000_*`、`20260204120001_*`

### 快速連結

- 操作指南總覽: [docs/operational-guides/README.md](../operational-guides/README.md)（VLM 快速啟動與測試就緒已集中至本目錄）
- 專案主文檔: [CLAUDE.md](../../CLAUDE.md)

---

**最後更新**: 2026-02-15
