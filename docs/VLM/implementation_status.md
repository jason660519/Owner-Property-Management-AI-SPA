# VLM 文件掃描功能 - 實作狀態與測試報告

> **報告日期**: 2026-02-04
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **狀態**: 核心功能已實作並測試通過

---

## 總體狀況

### 已完成並測試通過

| 項目           | 狀態   | 測試結果                 |
| -------------- | ------ | ------------------------ |
| 資料庫 Schema  | 完成   | Migration 成功執行      |
| KMS 加密模組   | 完成   | 加密/解密/篡改偵測通過  |
| 文件驗證器     | 完成   | 姓名/地址驗證通過        |
| Storage 客戶端 | 完成   | 程式碼已實作             |
| 前端 Hook      | 完成   | 程式碼已實作             |
| 前端組件 (3)   | 完成   | 程式碼已實作             |

### 待整合測試（需服務運行）

- 後端 API 服務、前端 Web UI、E2E 完整流程

---

## 詳細測試結果

### 1. 資料庫

#### user_vlm_credentials

- 表格、RLS（SELECT/INSERT/UPDATE/DELETE）、索引（含 partial unique）、外鍵、Check（provider）、Trigger（updated_at）均通過。

#### property_documents 增強

- 新增欄位：vlm_provider, used_user_key, parsing_duration_ms, vlm_model_version, confidence_score；索引：vlm_provider, confidence_score。

### 2. KMS

- 加密/解密 Round Trip、不同 Salt 產生不同密文、篡改偵測、錯誤 Nonce/Salt 偵測均通過。

### 3. 文件驗證器

- 有效/無效姓名、有效/無效地址、完整文件驗證（含建號、信度）均通過。

---

## 已建立檔案（精簡對照）

- 資料庫: 2 個 migration
- 後端: kms、document_validator、storage_client、auth、integrations、documents
- 前端: useVLMKeyManager、VLMApiKeyDrawer、ParsedResultPreview、VLMDocumentUpload
- 測試: test_kms、test_document_validator、`e2e/flows/landlord/vlm-document-scan.spec.ts`

---

## 已修正問題

- SQL：Partial unique 改為 `CREATE UNIQUE INDEX ... WHERE (is_active = true)`。
- Python：PBKDF2 改為 `PBKDF2HMAC`。
- 依賴：可選安裝 `pytesseract`、`opencv-python-headless`（視 OCR 需求）。

---

## 核心功能驗證結果

| 功能       | 狀態     |
| ---------- | -------- |
| 加密 API Key | 通過     |
| 解密/篡改偵測 | 通過     |
| 姓名/地址/建號驗證 | 通過     |
| RLS        | 通過     |

---

## 下一步建議

1. 安裝依賴後啟動後端與前端，執行 E2E。
2. 建立 Storage Bucket `property-documents` 與 RLS。
3. 整合實際 VLM Engine、pdf2image、多頁處理。

---

## 相關文檔

- [快速啟動](./quickstart.md)
- [實作總結](./implementation_summary.md)
- [測試報告](./test_report.md)

---

**最後更新**: 2026-02-15
