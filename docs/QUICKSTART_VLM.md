# VLM 文件掃描功能 - 快速啟動指南

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **預估時間**: 15 分鐘

---

## 🚀 5 分鐘快速啟動

### 步驟 1: 生成 Master Key (1 分鐘)

```bash
# 生成 32 bytes (64 個字元) 的 hex string
python3 -c "import os; print(os.urandom(32).hex())"

# 將輸出複製並設定到環境變數
export VLM_MASTER_KEY=<剛才生成的 hex string>
```

### 步驟 2: 執行資料庫遷移 (2 分鐘)

```bash
# 進入專案根目錄
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA

# 執行 migration
supabase db reset

# 驗證表格已建立
supabase db shell
\dt user_vlm_credentials
\dt property_documents
```

### 步驟 3: 建立 Storage Bucket (2 分鐘)

前往 Supabase Dashboard:

1. 點擊 **Storage** → **New Bucket**
2. 名稱: `property-documents`
3. **Public**: 取消勾選 (Private)
4. 點擊 **Create Bucket**

### 步驟 4: 安裝依賴 (5 分鐘)

```bash
# 後端依賴
cd backend/ocr_service
pip install cryptography python-jose[cryptography] pdf2image supabase

# 前端依賴 (已在 monorepo root 安裝)
cd ../../
npm install
```

### 步驟 5: 啟動服務 (5 分鐘)

**終端機 1 - 後端**:
```bash
cd backend/ocr_service
uvicorn src.api.main:app --reload --port 8000
```

**終端機 2 - 前端**:
```bash
cd apps/web
npm run dev
```

### 步驟 6: 測試 (2 分鐘)

1. 前往 http://localhost:3000/login
2. 登入帳號
3. 前往 **新增物件** 頁面
4. 應該會看到 VLM API Key 設定 Drawer

---

## 📋 完整設定步驟

### 1. 環境變數設定

#### 後端 (`backend/ocr_service/.env`)

```bash
# VLM Master Key (必須)
VLM_MASTER_KEY=<64個字元的 hex string>

# Supabase 連線 (必須)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>

# 選用
LOG_LEVEL=INFO
```

#### 前端 (`apps/web/.env.local`)

```bash
# OCR Service URL (必須)
NEXT_PUBLIC_OCR_SERVICE_URL=http://localhost:8000

# Supabase (如果尚未設定)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### 2. Supabase Storage 設定

#### 建立 Bucket

```sql
-- Via Dashboard 或 SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false);
```

#### 設定 RLS 政策

```sql
-- Users can view own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents' AND
  (storage.foldername(name))[1] = 'documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can upload own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents' AND
  (storage.foldername(name))[1] = 'documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents' AND
  (storage.foldername(name))[1] = 'documents' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

### 3. 驗證設定

#### 檢查後端 API

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Should return:
# {"status": "healthy", ...}
```

#### 檢查資料庫

```bash
supabase db shell

# 檢查表格
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_vlm_credentials', 'property_documents');

# 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_vlm_credentials', 'property_documents');
```

#### 檢查 Storage Bucket

```bash
supabase storage list
# Should show: property-documents
```

---

## 🧪 測試功能

### 手動測試流程

1. **登入系統**
   ```
   Email: test@example.com
   Password: (你的測試密碼)
   ```

2. **前往新增物件**
   ```
   URL: http://localhost:3000/landlord/properties/add
   ```

3. **設定 VLM API Key**
   - 應該會自動彈出 Drawer
   - 選擇 **Anthropic Claude**
   - 前往 https://console.anthropic.com/settings/keys
   - 建立新的 API Key
   - 複製並貼上
   - 點擊「儲存設定」

4. **上傳測試文件**
   - 點擊「選擇檔案上傳」
   - 選擇測試 PDF (謄本或權狀)
   - 等待上傳和解析
   - 應該在 5-8 秒內完成

5. **查看結果**
   - 檢查「所有權人姓名」是否正確
   - 檢查「物件地址」是否正確
   - 查看驗證圖示 (綠色 ✓ 或紅色 ✗)

6. **自動填入**
   - 點擊「一鍵帶入全部」
   - 檢查表單欄位是否自動填入

### 執行單元測試

```bash
# 後端測試
cd backend/ocr_service
pytest tests/test_kms.py -v
pytest tests/test_document_validator.py -v

# 預期結果:
# ✅ 27 passed
```

### 執行 E2E 測試

```bash
# 前端測試
cd apps/web
npx playwright test e2e/vlm-document-scan.spec.ts

# 預期結果:
# ✅ 8 passed
```

---

## 🐛 故障排除

### 問題 1: "VLM_MASTER_KEY environment variable not set"

**解決方案**:
```bash
# 生成新的 Master Key
python3 -c "import os; print(os.urandom(32).hex())"

# 設定到環境變數
export VLM_MASTER_KEY=<生成的 hex string>

# 或寫入 .env
echo "VLM_MASTER_KEY=<生成的 hex string>" >> backend/ocr_service/.env
```

### 問題 2: "Supabase configuration missing"

**解決方案**:
```bash
# 檢查 Supabase 環境變數
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 如果是空的，從 Supabase Dashboard 複製
# Settings → API → Project URL
# Settings → API → service_role key (secret)
```

### 問題 3: "Storage bucket not found"

**解決方案**:
```bash
# 檢查 bucket 是否存在
supabase storage list

# 如果沒有，建立 bucket
# 前往 Supabase Dashboard → Storage → New Bucket
# 名稱: property-documents
# Public: 取消勾選
```

### 問題 4: 上傳成功但解析一直 "processing"

**原因**: VLM Engine 尚未完全整合

**解決方案**:
- 檢查後端日誌: `backend/ocr_service/logs/`
- 確認 VLM API Key 有效
- 檢查網路連線

### 問題 5: "Failed to decrypt API key"

**原因**: Master Key 或 Salt 不匹配

**解決方案**:
- 刪除現有的 API Key
- 使用相同的 Master Key 重新儲存
- 確保 `VLM_MASTER_KEY` 環境變數正確設定

---

## 📊 檢查清單

使用此清單確保所有設定正確：

- [ ] VLM_MASTER_KEY 已生成並設定
- [ ] Supabase 環境變數已設定 (URL, SERVICE_ROLE_KEY, JWT_SECRET)
- [ ] 資料庫 migration 已執行
- [ ] `user_vlm_credentials` 表已建立
- [ ] `property_documents` 表已增強
- [ ] Storage bucket `property-documents` 已建立
- [ ] Storage RLS 政策已設定
- [ ] 後端依賴已安裝 (cryptography, python-jose, pdf2image)
- [ ] 前端依賴已安裝 (npm install)
- [ ] 後端服務已啟動 (port 8000)
- [ ] 前端服務已啟動 (port 3000)
- [ ] 可以登入系統
- [ ] VLM API Key Drawer 可以開啟
- [ ] 可以儲存 API Key
- [ ] 可以上傳文件
- [ ] 可以查看解析結果
- [ ] 可以自動填入表單

---

## 🎯 下一步

完成基本設定後，可以：

1. **閱讀完整文檔**
   - [實作總結](VLM_DOCUMENT_SCAN_IMPLEMENTATION_SUMMARY.md)
   - [整合範例](VLM_INTEGRATION_EXAMPLE.md)

2. **自訂設定**
   - 調整輪詢間隔 (預設 2 秒)
   - 調整最大檔案大小 (預設 10MB)
   - 新增更多 VLM 提供商

3. **部署到生產環境**
   - 設定環境變數到 Secrets Manager
   - 啟用 HTTPS
   - 設定 CDN 加速檔案上傳
   - 監控 VLM API 使用量

4. **效能優化**
   - 新增 Redis 快取
   - 實作圖片壓縮
   - 並行處理多頁 PDF

---

## 💬 獲取協助

如果遇到問題：

1. 檢查 **故障排除** 章節
2. 查看後端日誌: `backend/ocr_service/logs/`
3. 查看瀏覽器 Console (F12)
4. 參考 [實作總結](VLM_DOCUMENT_SCAN_IMPLEMENTATION_SUMMARY.md)

---

**祝你使用愉快！** 🎉

**最後更新**: 2026-02-04
