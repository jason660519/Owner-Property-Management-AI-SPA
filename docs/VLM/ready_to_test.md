# VLM 文件掃描功能 - 準備就緒

> **日期**: 2026-02-04
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **狀態**: 服務已啟動即可測試

---

## 服務狀態

| 服務         | 狀態   | URL                    |
| ------------ | ------ | ---------------------- |
| 後端 API     | 運行中 | http://localhost:8000  |
| 前端 Web     | 運行中 | http://localhost:3000  |
| Supabase     | 運行中 | http://127.0.0.1:54321 |
| PostgreSQL   | 就緒   | Port 54322             |

---

## 立即開始測試

### 步驟 1–3: 開啟瀏覽器、登入、前往新增物件

- URL: http://localhost:3000 → 登入 → `/landlord/properties/add`

### 步驟 4–5: Step 2 權狀資料、設定 VLM API Key

進入 **Step 2: 權狀資料**，系統會彈出 **VLMApiKeyDrawer**：

1. 選擇 Provider: **Anthropic Claude**
2. 輸入 API Key（從 https://console.anthropic.com/settings/keys 取得）
3. 點擊儲存

### 步驟 6–7: 上傳謄本、等待 VLM 解析

1. 點擊「選擇檔案上傳」
2. 可選測試 PDF：`resources/samples/成交資料附件/`（如 000003-A-FNPEF.PDF）
3. 等待上傳完成（約 1–2 秒），解析約 **5–8 秒**

### 步驟 8–9: 查看結果、自動填入

- **ParsedResultPreview** 顯示：所有權人姓名、物件地址、建號、信度評分
- 驗證圖示：綠色 ✓ 通過、紅色 ✗ 失敗、黃色警告低信度
- 點擊「一鍵帶入全部」帶入表單

---

## 測試案例

### 測試 1: 基本功能

設定 API Key → 上傳 PDF → 等待解析 → 查看結果 → 自動填入。預期：API Key 儲存成功、上傳成功、VLM 解析完成、結果正確、表單帶入正確。

### 測試 2: 驗證功能

- 有效姓名: 王小明、陳美華
- 無效姓名: ABC123、王
- 有效地址: 台北市大安區忠孝東路四段123號
- 無效地址: 123 Main St

預期：有效資料綠勾、無效資料紅叉與錯誤訊息。

### 測試 3: 錯誤處理

- 無效 API Key、非文件檔案、過大檔案、VLM 解析失敗  
預期：友善錯誤訊息、可重試、不崩潰。

---

## API 端點測試

### 健康檢查

```bash
curl http://localhost:8000/api/v1/health
# 預期: {"status": "healthy", "service": "VLM OCR Service", "version": "1.0.0"}
```

### VLM Key 狀態（需 JWT）

```bash
curl http://localhost:8000/api/v1/integrations/vlm-key/status \
  -H "Authorization: Bearer <your_jwt_token>"
# 無 Key: {"has_key": false}
# 有 Key: {"has_key": true, "provider": "anthropic_claude", "last_used_at": "..."}
```

### 文件上傳（需 JWT）

```bash
curl -X POST http://localhost:8000/api/v1/documents/upload-and-parse \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@/path/to/document.pdf"
# 預期: success, document_id, message "VLM parsing started.", storage_path
```

### 解析狀態（需 JWT）

```bash
curl http://localhost:8000/api/v1/documents/{document_id}/status \
  -H "Authorization: Bearer <your_jwt_token>"
# processing 或 completed（含 extracted_data、field_validations、confidence_score）
```

---

## 資料庫檢查

```sql
-- 用戶 VLM credentials
SELECT id, user_id, provider, is_active, created_at
FROM user_vlm_credentials
WHERE user_id = '<your_user_id>';

-- 上傳文件
SELECT id, document_type, file_path, ocr_status, confidence_score
FROM property_documents
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 故障排除

- **API Key 設定失敗**: 檢查 Console、API Key 格式、後端日誌。
- **檔案上傳失敗**: 確認類型（PDF/PNG/JPEG）、大小（≤10MB）、Storage Bucket 存在。
- **VLM 一直 processing**: 檢查 API Key 有效、限流、網路；必要時重啟後端、重新上傳。
- **後端崩潰**: `cd backend/ocr_service && uvicorn src.api.main:app --reload --port 8000`

---

## 測試檢查清單

- [ ] API Key 設定成功、檔案上傳成功、VLM 解析完成
- [ ] 結果正確顯示、驗證圖示正確、信度合理（>0.85）、自動填入成功
- [ ] 無效 API Key/檔案類型/過大檔案被拒絕、VLM 失敗有友善訊息與重試
- [ ] RLS 生效、API Key 加密儲存、JWT 驗證、檔案權限正確

---

## 參考

- [實作狀態與測試報告](./implementation_status.md)
- [實作總結](./implementation_summary.md)

---

**最後更新**: 2026-02-15
