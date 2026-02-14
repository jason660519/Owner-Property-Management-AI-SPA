# VLM 文件掃描功能 - 快速啟動指南

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **預估時間**: 15 分鐘

---

## 5 分鐘快速啟動

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
cd /path/to/Owner-Property-Management-AI-SPA

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

## 完整設定步驟

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

## 測試功能

### 手動測試流程

1. **登入系統**
2. **前往新增物件**: `http://localhost:3000/landlord/properties/add`
3. **設定 VLM API Key**: 自動彈出 Drawer → 選擇 Anthropic Claude → 輸入 API Key → 儲存
4. **上傳測試文件**: 選擇謄本/權狀 PDF，等待上傳和解析（約 5-8 秒）
5. **查看結果**: 檢查所有權人姓名、物件地址與驗證圖示
6. **自動填入**: 點擊「一鍵帶入全部」

### 執行單元測試

```bash
# 後端測試
cd backend/ocr_service
pytest tests/test_kms.py -v
pytest tests/test_document_validator.py -v
```

### 執行 E2E 測試

```bash
cd apps/web
npx playwright test e2e/flows/landlord/vlm-document-scan.spec.ts
```

---

## 故障排除

### 問題 1: "VLM_MASTER_KEY environment variable not set"

```bash
python3 -c "import os; print(os.urandom(32).hex())"
export VLM_MASTER_KEY=<生成的 hex string>
# 或寫入 backend/ocr_service/.env
```

### 問題 2: "Supabase configuration missing"

檢查 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（從 Dashboard → Settings → API 取得）。

### 問題 3: "Storage bucket not found"

`supabase storage list` 確認後，於 Dashboard → Storage 建立 `property-documents`（Private）。

### 問題 4: 上傳成功但解析一直 "processing"

檢查後端日誌、VLM API Key 是否有效、網路連線。

### 問題 5: "Failed to decrypt API key"

Master Key 或 Salt 不匹配。刪除現有 API Key，以相同 `VLM_MASTER_KEY` 重新儲存。

---

## 檢查清單

- [ ] VLM_MASTER_KEY 已生成並設定
- [ ] Supabase 環境變數已設定
- [ ] 資料庫 migration 已執行
- [ ] `user_vlm_credentials`、`property_documents` 表已建立
- [ ] Storage bucket `property-documents` 已建立且 RLS 已設定
- [ ] 後端／前端依賴已安裝，服務已啟動
- [ ] 可登入、開啟 VLM API Key Drawer、上傳文件、查看解析結果並自動填入

---

## 下一步

- [實作總結](./implementation_summary.md)
- [整合範例](./integration_example.md)
- [測試就緒檢查](./ready_to_test.md)

---

**最後更新**: 2026-02-15
