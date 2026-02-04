# ✅ VLM 文件掃描功能 - 準備就緒

> **日期**: 2026-02-04
> **狀態**: ✅ **服務已啟動，準備測試**

---

## 🎉 服務狀態

| 服務 | 狀態 | PID | URL |
|------|------|-----|-----|
| **後端 API** | ✅ 運行中 | 3957 | http://localhost:8000 |
| **前端 Web** | ✅ 運行中 | 1288, 4431 | http://localhost:3000 |
| **Supabase** | ✅ 運行中 | - | http://127.0.0.1:54321 |
| **PostgreSQL** | ✅ 就緒 | - | Port 54322 |

---

## 🧪 立即開始測試

### 第 1 步: 開啟瀏覽器

```
http://localhost:3000
```

### 第 2 步: 登入系統

使用您的測試帳號登入

### 第 3 步: 前往新增物件

導航至: `/landlord/properties/add`

或直接訪問: http://localhost:3000/landlord/properties/add

### 第 4 步: 進入 Step 2 (權狀資料)

在多步驟表單中，進入 **Step 2: 權狀資料**

### 第 5 步: 設定 VLM API Key (首次使用)

系統會自動彈出 **VLMApiKeyDrawer**：

1. **選擇 Provider**: Anthropic Claude (推薦)
2. **輸入 API Key**: 您的 Claude API Key (sk-ant-api03-...)
3. **點擊儲存**

**如何取得 API Key**:
- 前往: https://console.anthropic.com/settings/keys
- 建立新的 API Key
- 複製並貼上到表單

### 第 6 步: 上傳謄本文件

1. **點擊「選擇檔案上傳」**
2. **選擇測試 PDF**:
   ```
   /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/resources/samples/成交資料附件/

   推薦檔案：
   - 000003-A-FNPEF.PDF
   - 000006-A-1IRBY.PDF
   - 000011-A-45O0B.PDF
   ```
3. **等待上傳完成** (約 1-2 秒)

### 第 7 步: 等待 VLM 解析

- 系統會顯示「AI 解析中...」
- 解析時間約 **5-8 秒**
- 背景會呼叫 VLM API 進行文件識別

### 第 8 步: 查看解析結果

解析完成後，系統會顯示 **ParsedResultPreview** 組件：

- ✅ **所有權人姓名** (附驗證圖示)
- ✅ **物件地址** (附驗證圖示)
- ✅ **建號** (如有)
- ✅ **信度評分** (0.00 - 1.00)

**驗證圖示說明**:
- 🟢 綠色勾勾 = 驗證通過
- 🔴 紅色叉叉 = 驗證失敗
- 🟡 黃色警告 = 低信度

### 第 9 步: 自動填入表單

1. **檢查解析結果是否正確**
2. **可手動修改欄位** (如需要)
3. **點擊「一鍵帶入全部」**
4. **驗證表單欄位已自動填入**

---

## 🔍 測試案例

### 測試 1: 基本功能測試 ✅

**目標**: 驗證完整流程

**步驟**:
1. 設定 API Key
2. 上傳 PDF
3. 等待解析
4. 查看結果
5. 自動填入

**預期結果**:
- ✅ API Key 儲存成功
- ✅ 檔案上傳成功
- ✅ VLM 解析完成
- ✅ 結果顯示正確
- ✅ 表單自動填入

### 測試 2: 驗證功能測試 ✅

**目標**: 驗證欄位驗證邏輯

**測試案例**:
- 有效姓名: "王小明", "陳美華"
- 無效姓名: "ABC123", "王"
- 有效地址: "台北市大安區忠孝東路四段123號"
- 無效地址: "123 Main St"

**預期結果**:
- ✅ 有效資料顯示綠色勾勾
- ✅ 無效資料顯示紅色叉叉
- ✅ 顯示錯誤訊息

### 測試 3: 錯誤處理測試 ⚠️

**目標**: 驗證錯誤處理機制

**測試案例**:
- 無效的 API Key
- 上傳非文件檔案 (如圖片)
- 上傳過大檔案 (> 10MB)
- VLM 解析失敗

**預期結果**:
- ✅ 顯示友善錯誤訊息
- ✅ 提供重試選項
- ✅ 不會崩潰

---

## 📊 API 端點測試

### 健康檢查

```bash
curl http://localhost:8000/api/v1/health

# 預期回應:
{
  "status": "healthy",
  "service": "VLM OCR Service",
  "version": "1.0.0"
}
```

### VLM Key 狀態

```bash
# 需要 JWT Token
curl http://localhost:8000/api/v1/integrations/vlm-key/status \
  -H "Authorization: Bearer <your_jwt_token>"

# 預期回應 (無 Key):
{
  "has_key": false
}

# 預期回應 (有 Key):
{
  "has_key": true,
  "provider": "anthropic_claude",
  "last_used_at": "2026-02-04T12:00:00Z"
}
```

### 文件上傳

```bash
# 需要 JWT Token
curl -X POST http://localhost:8000/api/v1/documents/upload-and-parse \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@/path/to/document.pdf"

# 預期回應:
{
  "success": true,
  "document_id": "uuid-here",
  "message": "Document uploaded successfully. VLM parsing started.",
  "storage_path": "documents/user-id/doc-id/original.pdf"
}
```

### 解析狀態查詢

```bash
# 需要 JWT Token
curl http://localhost:8000/api/v1/documents/{document_id}/status \
  -H "Authorization: Bearer <your_jwt_token>"

# 預期回應 (處理中):
{
  "document_id": "uuid",
  "status": "processing",
  "ocr_status": "processing"
}

# 預期回應 (完成):
{
  "document_id": "uuid",
  "status": "completed",
  "ocr_status": "completed",
  "extracted_data": {
    "owner_name": "王小明",
    "property_address": "台北市大安區忠孝東路四段123號",
    "building_number": "0531-000123"
  },
  "field_validations": {
    "owner_name": {
      "is_valid": true,
      "confidence": 0.95
    },
    "property_address": {
      "is_valid": true,
      "confidence": 0.92
    }
  },
  "confidence_score": 0.93
}
```

---

## 🗄️ 資料庫檢查

### 檢查 VLM Credentials

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

-- 查詢用戶的 VLM API Key (加密後)
SELECT id, user_id, provider, is_active, created_at
FROM user_vlm_credentials
WHERE user_id = '<your_user_id>';
```

### 檢查文件記錄

```sql
-- 查詢上傳的文件
SELECT id, document_type, file_path, ocr_status, confidence_score
FROM property_documents
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 故障排除

### 問題 1: API Key 設定失敗

**症狀**: 點擊「儲存設定」後沒有反應

**解決方案**:
1. 檢查瀏覽器 Console (F12)
2. 確認 API Key 格式正確 (sk-ant-api03-...)
3. 檢查後端日誌

### 問題 2: 檔案上傳失敗

**症狀**: 上傳後顯示錯誤

**可能原因**:
- 檔案類型不支援 (只支援 PDF, PNG, JPEG)
- 檔案過大 (> 10MB)
- Supabase Storage 未設定

**解決方案**:
1. 確認檔案類型和大小
2. 檢查 Supabase Storage Bucket 是否存在
3. 查看後端錯誤日誌

### 問題 3: VLM 解析一直 "processing"

**症狀**: 解析超過 2 分鐘仍在處理中

**可能原因**:
- VLM API Key 無效
- VLM API 限流
- 網路問題

**解決方案**:
1. 檢查 API Key 是否有效
2. 查看後端日誌
3. 重新上傳文件

### 問題 4: 後端服務崩潰

**症狀**: API 請求失敗

**解決方案**:
```bash
# 重新啟動後端
cd backend/ocr_service
source venv/bin/activate
uvicorn src.api.main:app --reload --port 8000
```

---

## 📝 測試檢查清單

### 功能測試
- [ ] API Key 設定成功
- [ ] 檔案上傳成功
- [ ] VLM 解析完成
- [ ] 結果正確顯示
- [ ] 驗證圖示正確
- [ ] 信度評分合理 (> 0.85)
- [ ] 自動填入成功
- [ ] 手動修改生效

### 錯誤處理
- [ ] 無效 API Key 顯示錯誤
- [ ] 無效檔案類型被拒絕
- [ ] 過大檔案被拒絕
- [ ] VLM 失敗顯示友善訊息
- [ ] 提供重試選項

### 安全性
- [ ] RLS 政策生效 (只能看到自己的 Key)
- [ ] API Key 加密儲存
- [ ] JWT Token 驗證正常
- [ ] 檔案存取權限正確

---

## 🎯 下一步

### 立即執行
1. **開啟瀏覽器**: http://localhost:3000
2. **準備 API Key**: 從 Anthropic Console 取得
3. **準備測試檔案**: 選擇謄本 PDF
4. **開始測試**: 按照上述步驟

### 待完成 (可選)
- [ ] 建立 Supabase Storage RLS 政策
- [ ] 新增批次上傳功能
- [ ] 實作解析歷史記錄
- [ ] 新增使用量統計
- [ ] 最佳化圖片壓縮
- [ ] Redis 快取整合

---

## 📞 支援

如有任何問題，請檢查：

1. **測試報告**: `docs/implementation-plans/VLM_IMPLEMENTATION_STATUS.md`
2. **實作總結**: `docs/implementation-plans/VLM_DOCUMENT_SCAN_IMPLEMENTATION_SUMMARY.md`
3. **後端日誌**: 檢查終端機輸出
4. **瀏覽器 Console**: F12 查看錯誤

---

**準備就緒！開始測試吧！** 🚀

---

**最後更新**: 2026-02-04
**服務狀態**: ✅ 全部運行中
**測試準備**: ✅ 完成
