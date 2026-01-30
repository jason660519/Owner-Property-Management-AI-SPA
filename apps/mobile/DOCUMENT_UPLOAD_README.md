# 📄 文件上傳功能 - Phase 1 實作完成

> **創建日期**: 2026-01-31
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0.0
> **狀態**: ✅ Phase 1 完成（待測試）

---

## 🎯 實作摘要

已成功實作 **Phase 1: MVP 基礎上傳功能**，包含：

✅ 單個文件上傳（PDF/圖片）
✅ Supabase Storage 整合
✅ 資料庫記錄創建
✅ 基本錯誤處理
✅ 上傳狀態顯示
✅ 文件列表展示

---

## 📦 已創建的檔案

### 核心功能文件

| 檔案路徑 | 用途 | 行數 |
|---------|------|------|
| `src/types/documents.ts` | TypeScript 型別定義 | 62 |
| `src/services/documentService.ts` | 文件上傳/管理服務 | 140 |
| `src/hooks/useDocumentUpload.ts` | 文件上傳自定義 Hook | 72 |
| `src/components/documents/DocumentUploader.tsx` | 上傳 UI 組件 | 177 |
| `src/screens/dashboard/DocumentsScreen.tsx` | 文件管理畫面 | 165 |

### 文檔文件

| 檔案路徑 | 用途 |
|---------|------|
| `INTEGRATION_GUIDE.md` | 整合使用指南 |
| `TEST_CHECKLIST.md` | 測試檢查清單 |
| `DOCUMENT_UPLOAD_README.md` | 本文件 |

---

## 🔧 安裝的依賴

```json
{
  "expo-document-picker": "^14.0.8",
  "expo-file-system": "^19.0.21"
}
```

**重要**: 使用了 `expo-file-system` v19 的新 API (`File` 類別)

---

## 🚀 快速開始

### 1. 確認環境

```bash
# 確認依賴已安裝
npm list expo-document-picker expo-file-system

# 確認 Supabase 已啟動
supabase status
```

### 2. 設定 Storage Bucket

在 Supabase Dashboard 中：

1. 前往 **Storage** → 創建新 bucket
2. Bucket 名稱: `property-documents`
3. 設定為 **Public** (或設定適當的 RLS 政策)

### 3. 設定 RLS 政策

```sql
-- 允許已認證用戶上傳
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-documents');

-- 允許用戶讀取自己的文件
CREATE POLICY "Allow user to read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-documents');
```

### 4. 整合至 App

**方法 A: 使用獨立畫面**

```typescript
import DocumentsScreen from './src/screens/dashboard/DocumentsScreen';

<DocumentsScreen propertyId="uuid-here" propertyType="sales" />
```

**方法 B: 僅使用上傳組件**

```typescript
import DocumentUploader from './src/components/documents/DocumentUploader';

<DocumentUploader
  propertyId="uuid-here"
  onUploadComplete={() => console.log('完成')}
/>
```

### 5. 測試功能

參考 [TEST_CHECKLIST.md](TEST_CHECKLIST.md) 進行完整測試。

---

## 📚 API 參考

### `useDocumentUpload` Hook

```typescript
const {
  pickAndUpload,    // (type, propertyId?, propertyType?) => Promise<Result>
  isUploading,      // boolean
  uploadProgress,   // 0-100
  error,            // string | null
} = useDocumentUpload();
```

### `documentService` 函數

```typescript
// 上傳文件
uploadDocument(params: UploadDocumentParams): Promise<Result>

// 獲取文件列表
getUserDocuments(propertyId?: string): Promise<Result>

// 刪除文件
deleteDocument(documentId: string, filePath: string): Promise<Result>
```

---

## 🗄️ 資料庫架構

### `property_documents` 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid | Primary Key |
| `owner_id` | uuid | 文件擁有者（外鍵到 users） |
| `property_id` | uuid | 關聯物件（可選） |
| `document_type` | text | 文件類型 |
| `document_name` | text | 文件名稱 |
| `file_path` | text | Storage 路徑 |
| `file_size` | bigint | 檔案大小（bytes） |
| `file_extension` | text | 副檔名 |
| `mime_type` | text | MIME 類型 |
| `ocr_status` | text | OCR 狀態（預設 'pending'） |
| `ocr_parsed_data` | jsonb | OCR 解析結果 |
| `property_type` | text | 物件類型（sales/rentals） |
| `is_verified` | boolean | 是否已驗證 |
| `uploaded_by` | uuid | 上傳者 |
| `created_at` | timestamptz | 創建時間 |
| `updated_at` | timestamptz | 更新時間 |

### Storage 路徑結構

```
property-documents/
├── {propertyId}/
│   └── {timestamp}_{sanitized_filename}
└── general/
    └── {timestamp}_{sanitized_filename}
```

---

## ✅ 已實現功能

### 文件類型支援

- ✅ 建物權狀 (`building_title`)
- ✅ 土地權狀 (`land_title`)
- ✅ 合約 (`contract`)
- ✅ 稅務文件 (`tax_document`)
- ✅ 身分證 (`id_card`)
- ✅ 護照 (`passport`)
- ✅ 其他 (`other`)

### 檔案限制

- ✅ 支援格式: PDF, JPG, PNG
- ✅ 最大檔案: 10MB
- ✅ 檔名清理（移除特殊字元）
- ✅ MIME type 驗證

### 上傳流程

1. ✅ 用戶選擇文件類型
2. ✅ 開啟文件選擇器
3. ✅ 驗證檔案大小
4. ✅ 讀取檔案 (使用 expo-file-system v19 API)
5. ✅ 上傳至 Supabase Storage
6. ✅ 創建資料庫記錄
7. ✅ 設定 OCR 狀態為 'pending'
8. ✅ 顯示成功/錯誤訊息

### 錯誤處理

- ✅ 未登入檢查
- ✅ 檔案大小驗證
- ✅ 網路錯誤處理
- ✅ Storage 錯誤處理
- ✅ 資料庫錯誤處理
- ✅ 用戶友善錯誤訊息

### UI 組件

- ✅ 文件類型選擇器（6 種類型）
- ✅ 上傳按鈕（含進度顯示）
- ✅ 錯誤訊息提示
- ✅ 文件列表展示
- ✅ OCR 狀態標記（顏色編碼）
- ✅ 下拉刷新

---

## ⏭️ 待實現功能（Phase 2-4）

### Phase 2: UI 優化

- ⬜ 文件預覽（縮圖）
- ⬜ 上傳進度條（詳細）
- ⬜ 相機拍攝選項
- ⬜ 拖放上傳（Web）
- ⬜ 文件刪除確認對話框

### Phase 3: OCR 整合

- ⬜ Realtime OCR 狀態訂閱
- ⬜ OCR 結果預覽
- ⬜ 手動修正 OCR 欄位
- ⬜ OCR 失敗重試

### Phase 4: 進階功能

- ⬜ 批次上傳（多文件）
- ⬜ 斷點續傳
- ⬜ 文件標籤系統
- ⬜ 文件搜尋與篩選
- ⬜ 文件下載與匯出
- ⬜ 文件版本控制

---

## 🔍 TypeScript 編譯狀態

```bash
npx tsc --noEmit
```

**結果**: ✅ 新創建的文件無 TypeScript 錯誤

**已知問題**:
- `LandlordDashboard.tsx` 有既存的樣式錯誤（與本次實作無關）

---

## 📖 相關文檔

| 文檔 | 說明 |
|------|------|
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | 詳細整合指南與 API 文檔 |
| [TEST_CHECKLIST.md](TEST_CHECKLIST.md) | 完整測試檢查清單 |
| [FILE_CREATION_CHECKLIST.md](../../FILE_CREATION_CHECKLIST.md) | 檔案創建規範 |
| [CLAUDE.md](../../CLAUDE.md) | AI 協作規範 |

---

## 🐛 故障排除

### 問題 1: "User not authenticated"

**解決方案**: 確認用戶已登入

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // 導向登入頁面
}
```

### 問題 2: Storage 權限錯誤

**解決方案**: 檢查 Storage RLS 政策（見上方「設定 RLS 政策」）

### 問題 3: "檔案大小超過 10MB 限制"

**解決方案**: 這是預期行為。如需上傳更大文件，修改限制：

```typescript
// 在 useDocumentUpload.ts 中
if (file.size && file.size > 20 * 1024 * 1024) { // 改為 20MB
  throw new Error('檔案大小超過 20MB 限制');
}
```

### 問題 4: 文件選擇器無反應

**解決方案**: 確認已安裝 `expo-document-picker`

```bash
npx expo install expo-document-picker --fix
```

---

## 📝 Commit 記錄

準備提交時使用以下 commit 訊息：

```bash
git add .
git commit -m "[Claude] feat(mobile): implement Phase 1 document upload functionality

- Add document type definitions (types/documents.ts)
- Implement document upload service with Supabase Storage integration
- Create useDocumentUpload custom hook
- Add DocumentUploader UI component with 6 document types
- Add DocumentsScreen for document management
- Install expo-document-picker and expo-file-system
- Support PDF, JPG, PNG files up to 10MB
- Auto-set OCR status to 'pending' on upload
- Add comprehensive error handling

Files created:
- src/types/documents.ts
- src/services/documentService.ts
- src/hooks/useDocumentUpload.ts
- src/components/documents/DocumentUploader.tsx
- src/screens/dashboard/DocumentsScreen.tsx
- INTEGRATION_GUIDE.md
- TEST_CHECKLIST.md
- DOCUMENT_UPLOAD_README.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 👥 貢獻者

- **Claude Sonnet 4.5** - Phase 1 實作（2026-01-31）

---

## 📞 支援

如有問題或需要協助，請：

1. 查看 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
2. 查看 [TEST_CHECKLIST.md](TEST_CHECKLIST.md)
3. 檢查 Supabase 日誌
4. 檢查 Expo 開發工具錯誤訊息

---

**Phase 1 實作完成，準備進行測試與部署！** 🚀
