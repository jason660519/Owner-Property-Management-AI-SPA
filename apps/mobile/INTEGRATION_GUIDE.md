# 文件上傳功能整合指南

> **創建日期**: 2026-01-31
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## 📦 已完成項目

### ✅ 已安裝依賴

```json
{
  "expo-document-picker": "^14.0.8",
  "expo-file-system": "^19.0.21"
}
```

### ✅ 已創建檔案

```
src/
├── types/
│   └── documents.ts              # 文件型別定義
├── services/
│   └── documentService.ts        # 文件上傳/管理服務
├── hooks/
│   └── useDocumentUpload.ts      # 文件上傳 Hook
├── components/
│   └── documents/
│       └── DocumentUploader.tsx   # 上傳組件
└── screens/
    └── dashboard/
        └── DocumentsScreen.tsx    # 文件管理畫面
```

---

## 🚀 使用方式

### 方法 1: 獨立文件管理畫面

直接使用 `DocumentsScreen` 組件：

```typescript
import DocumentsScreen from './src/screens/dashboard/DocumentsScreen';

// 在你的導航或 Dashboard 中
<DocumentsScreen
  propertyId="property-uuid-here"  // 可選：特定物件的文件
  propertyType="sales"             // 可選：物件類型
/>
```

### 方法 2: 僅使用上傳組件

只需要上傳功能時：

```typescript
import DocumentUploader from './src/components/documents/DocumentUploader';

<DocumentUploader
  propertyId="property-uuid-here"  // 可選
  propertyType="sales"             // 可選
  onUploadComplete={() => {
    console.log('上傳完成');
    // 刷新列表或其他操作
  }}
/>
```

### 方法 3: 整合至現有 Dashboard

在 `LandlordDashboard.tsx` 中新增一個標籤頁：

```typescript
// 在 LandlordDashboard.tsx 中
import DocumentsScreen from './DocumentsScreen';

// 新增狀態
const [activeTab, setActiveTab] = useState<'properties' | 'documents' | 'settings'>('properties');

// 在 render 中新增標籤
{activeTab === 'documents' && (
  <DocumentsScreen />
)}
```

---

## 📋 功能說明

### 支援的文件類型

- **建物權狀** (`building_title`)
- **土地權狀** (`land_title`)
- **合約** (`contract`)
- **稅務文件** (`tax_document`)
- **身分證** (`id_card`)
- **護照** (`passport`)
- **其他** (`other`)

### 檔案限制

- 支援格式：PDF, JPG, PNG
- 最大檔案大小：10MB
- 自動檔名清理（移除特殊字元）

### OCR 狀態追蹤

文件上傳後會自動設定 OCR 狀態：

- `pending` - 等待處理（預設）
- `processing` - OCR 處理中
- `completed` - OCR 完成
- `failed` - OCR 失敗
- `manual_review` - 需人工審核

---

## 🔧 API 參考

### `useDocumentUpload` Hook

```typescript
const {
  pickAndUpload,    // 選擇並上傳文件的函數
  isUploading,      // 上傳中狀態
  uploadProgress,   // 上傳進度 (0-100)
  error,            // 錯誤訊息
} = useDocumentUpload();

// 使用
const result = await pickAndUpload(
  'building_title',  // documentType
  'property-uuid',   // propertyId (可選)
  'sales'            // propertyType (可選)
);
```

### `documentService` 函數

```typescript
// 上傳文件
import { uploadDocument } from './src/services/documentService';

const result = await uploadDocument({
  fileUri: 'file://...',
  documentName: 'document.pdf',
  documentType: 'building_title',
  propertyId: 'uuid',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  propertyType: 'sales',
});

// 獲取文件列表
import { getUserDocuments } from './src/services/documentService';

const result = await getUserDocuments('property-uuid'); // propertyId 可選

// 刪除文件
import { deleteDocument } from './src/services/documentService';

const result = await deleteDocument(documentId, filePath);
```

---

## 🗄️ 資料庫架構

文件會儲存至 `property_documents` 表：

```sql
property_documents (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  property_id uuid,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_extension text,
  mime_type text,
  ocr_status text DEFAULT 'pending',
  ocr_parsed_data jsonb,
  property_type text,
  is_verified boolean DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

檔案會儲存至 Supabase Storage 的 `property-documents` bucket：

```
property-documents/
├── {propertyId}/
│   └── {timestamp}_{filename}
└── general/
    └── {timestamp}_{filename}
```

---

## ✅ 測試檢查清單

### 基本功能測試

- [ ] 可成功開啟文件選擇器
- [ ] 可選擇 PDF 文件
- [ ] 可選擇圖片文件
- [ ] 取消選擇時不觸發上傳
- [ ] 上傳成功顯示成功訊息
- [ ] 上傳失敗顯示錯誤訊息

### 檔案驗證測試

- [ ] 小文件 (<1MB) 上傳成功
- [ ] 大文件 (5-10MB) 上傳成功
- [ ] 超大文件 (>10MB) 被正確拒絕

### 資料庫測試

```sql
-- 檢查最新上傳的文件
SELECT id, document_name, document_type, ocr_status, created_at
FROM property_documents
ORDER BY created_at DESC
LIMIT 5;

-- 驗證 RLS 政策
SELECT * FROM property_documents WHERE owner_id = auth.uid();
```

### Storage 測試

1. 登入 Supabase Dashboard
2. 前往 Storage > property-documents
3. 確認文件已成功上傳
4. 檢查路徑結構是否正確

---

## 🐛 常見問題排查

### 問題 1: 上傳失敗 "User not authenticated"

**原因**: 用戶未登入或 session 過期

**解決方案**:
```typescript
// 檢查用戶登入狀態
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // 導向登入頁面
}
```

### 問題 2: Storage 權限錯誤

**原因**: Supabase Storage bucket 權限未正確設定

**解決方案**:
1. 登入 Supabase Dashboard
2. 前往 Storage > Policies
3. 為 `property-documents` bucket 新增政策：

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
USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 問題 3: 檔案選擇器無回應

**原因**: Expo 權限未設定

**解決方案**:

在 `app.json` 中加入權限：

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "需要存取照片以上傳文件",
        "NSCameraUsageDescription": "需要使用相機拍攝文件"
      }
    },
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## 🔄 後續開發計畫

### Phase 2: UI 優化（規劃中）

- [ ] 文件預覽組件
- [ ] 已上傳文件列表（已在 DocumentsScreen 中實作基本版）
- [ ] 上傳進度條
- [ ] 相機拍攝選項

### Phase 3: OCR 整合（規劃中）

- [ ] Realtime OCR 狀態訂閱
- [ ] OCR 結果預覽 UI
- [ ] 手動修正介面
- [ ] OCR 失敗重試機制

### Phase 4: 進階功能（規劃中）

- [ ] 批次上傳
- [ ] 斷點續傳
- [ ] 文件標籤系統
- [ ] 文件搜尋與篩選

---

## 📞 支援

如需協助或發現問題，請查看：

1. [FILE_CREATION_CHECKLIST.md](../FILE_CREATION_CHECKLIST.md) - 檔案創建規範
2. [CLAUDE.md](../CLAUDE.md) - AI 協作規範
3. Supabase 文檔: https://supabase.com/docs
4. Expo 文檔: https://docs.expo.dev

---

**文檔建立完成，Phase 1 實作已完成** ✅
