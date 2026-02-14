# VLM 文件掃描功能 - 測試報告

> **測試日期**: 2026-02-04
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **測試環境**: macOS, Python 3.x, PostgreSQL (Supabase Local)

---

## 測試結果總覽

| 測試項目           | 狀態     | 詳情                     |
| ------------------ | -------- | ------------------------ |
| 資料庫 Migration   | 通過     | 兩個 migration 成功執行  |
| KMS 加密/解密      | 通過     | AES-GCM 正常             |
| 篡改偵測           | 通過     | 正確偵測                 |
| 文件驗證器         | 通過     | 姓名、地址驗證正常       |
| 資料表結構與 RLS   | 通過     | 政策正確                 |
| 前端組件           | 待測試   | 需啟動 Web               |
| 後端 API           | 待測試   | 需啟動 OCR 服務          |

---

## 已執行測試

### 1. 資料庫 Migration

- **user_vlm_credentials**: 欄位、RLS 4 個、索引（含 partial unique）、外鍵、Check、Trigger 均符合。
- **property_documents**: 新增 vlm_provider, used_user_key, parsing_duration_ms, vlm_model_version, confidence_score 及索引。

### 2. KMS

- 加密/解密 Round Trip、篡改偵測（修改 ciphertext 第一 byte 觸發 ValueError）通過。

### 3. 文件驗證器

- 有效姓名（王小明）、無效姓名（ABC123、王）、有效地址（台灣格式）、無效地址（123 Main St）、完整文件驗證（含建號、信度 1.00）通過。

---

## 待測試項目（需啟動服務）

- 前端：VLMApiKeyDrawer、API Key 儲存、VLMDocumentUpload、ParsedResultPreview、自動填入
- 後端 API：vlm-key 增刪查、upload-and-parse、documents status
- E2E：登入 → 設定 Key → 上傳 → 解析 → 填入

---

## 如何啟動服務進行測試

```bash
# 1. 環境變數
export VLM_MASTER_KEY=<vlm_master_key>
export SUPABASE_URL=http://127.0.0.1:54321
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET 從 supabase status 取得

# 2. 後端
cd backend/ocr_service
source venv/bin/activate
uvicorn src.api.main:app --reload --port 8000

# 3. 前端（另一終端）
cd apps/web
echo "NEXT_PUBLIC_OCR_SERVICE_URL=http://localhost:8000" >> .env.local
npm run dev
```

測試檔案可選：`resources/samples/成交資料附件/*.PDF` 或 `resources/samples/謄本PDF範例/`。

---

## 已修正問題

- **UNIQUE 語法**: 改為 `CREATE UNIQUE INDEX ... ON user_vlm_credentials(user_id, provider) WHERE (is_active = true)`。
- **PBKDF2**: 改為 `from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC`。

---

## 測試覆蓋率摘要

| 模組      | 單元測試   | 整合/E2E   |
| --------- | ---------- | ---------- |
| KMS       | 12 cases 通過 | N/A        |
| Validator | 15+ 通過   | N/A        |
| API       | 待執行     | 待執行     |
| 前端      | N/A        | 待執行     |

---

## 相關文檔

- [快速啟動](./quickstart.md)
- [實作狀態](./implementation_status.md)
- [準備就緒](./ready_to_test.md)

---

**最後更新**: 2026-02-15
