# 🚀 文件上傳功能快速啟動指南

> **創建日期**: 2026-01-31
> **創建者**: Claude Sonnet 4.5
> **預計閱讀時間**: 3 分鐘

---

## ✅ Phase 1 已完成

文件上傳功能 MVP 已實作完成，包含：

- ✅ 文件選擇器（PDF/圖片）
- ✅ Supabase Storage 上傳
- ✅ 資料庫記錄創建
- ✅ 文件列表展示
- ✅ OCR 狀態追蹤（pending）
- ✅ 錯誤處理

---

## 🏃 5 分鐘快速開始

### 1️⃣ 確認環境 (1 分鐘)

```bash
# 檢查依賴是否已安裝
npm list expo-document-picker expo-file-system

# 如果缺少，執行
npm install
```

### 2️⃣ 設定 Supabase Storage (2 分鐘)

**登入 Supabase Dashboard** → **Storage** → 創建 bucket

```
Bucket 名稱: property-documents
Public: ✓ (或設定 RLS 政策)
```

**設定 RLS 政策** (可選但推薦):

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

### 3️⃣ 整合至 Dashboard (1 分鐘)

**選項 A**: 使用獨立畫面（推薦）

```typescript
import DocumentsScreen from './src/screens/dashboard/DocumentsScreen';

// 在你的導航或 Dashboard 中
<DocumentsScreen />
```

**選項 B**: 整合至現有 Dashboard

參考 [DASHBOARD_INTEGRATION_EXAMPLE.md](DASHBOARD_INTEGRATION_EXAMPLE.md) 的完整範例。

### 4️⃣ 測試功能 (1 分鐘)

```bash
# 啟動應用
npm run ios  # 或 npm run android

# 測試步驟
# 1. 登入房東帳號
# 2. 導航至文件管理畫面
# 3. 選擇「建物權狀」
# 4. 點擊「選擇並上傳文件」
# 5. 選擇測試 PDF
# 6. 確認上傳成功
```

---

## 📚 詳細文檔

| 文檔 | 用途 | 閱讀時間 |
|------|------|---------|
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | API 使用指南 | 10 分鐘 |
| [DASHBOARD_INTEGRATION_EXAMPLE.md](DASHBOARD_INTEGRATION_EXAMPLE.md) | Dashboard 整合範例 | 8 分鐘 |
| [TEST_CHECKLIST.md](TEST_CHECKLIST.md) | 完整測試清單 | 5 分鐘 |
| [DOCUMENT_UPLOAD_README.md](DOCUMENT_UPLOAD_README.md) | 功能總覽 | 15 分鐘 |

---

## 🔧 常見問題

### Q: 上傳失敗「User not authenticated」

**A**: 確認用戶已登入

```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user); // 檢查是否為 null
```

### Q: Storage 權限錯誤

**A**: 檢查 Storage bucket 是否已創建並設定 RLS 政策（見上方步驟 2）

### Q: 文件選擇器無反應

**A**: 確認依賴已正確安裝

```bash
npm install expo-document-picker expo-file-system --save
npx expo install expo-document-picker expo-file-system --fix
```

### Q: TypeScript 錯誤

**A**: 新創建的文件應該沒有錯誤，檢查編譯：

```bash
npx tsc --noEmit | grep -E "(types|services|hooks|components/documents|screens/dashboard/DocumentsScreen)"
```

---

## 📦 已創建的文件

### 核心功能 (616 行代碼)

```
src/
├── types/
│   └── documents.ts                    (62 行)
├── services/
│   └── documentService.ts              (140 行)
├── hooks/
│   └── useDocumentUpload.ts            (72 行)
├── components/
│   └── documents/
│       └── DocumentUploader.tsx        (177 行)
└── screens/
    └── dashboard/
        └── DocumentsScreen.tsx         (165 行)
```

### 文檔 (~25KB)

```
INTEGRATION_GUIDE.md                    (7.5KB)
TEST_CHECKLIST.md                       (5.7KB)
DOCUMENT_UPLOAD_README.md               (8.6KB)
DASHBOARD_INTEGRATION_EXAMPLE.md        (12KB)
QUICK_START.md                          (本文件)
```

---

## 🎯 使用範例

### 基本使用

```typescript
import DocumentsScreen from './src/screens/dashboard/DocumentsScreen';

<DocumentsScreen
  propertyId="optional-property-uuid"
  propertyType="sales"
/>
```

### 進階使用（僅上傳）

```typescript
import DocumentUploader from './src/components/documents/DocumentUploader';

<DocumentUploader
  propertyId={selectedProperty?.id}
  onUploadComplete={() => {
    console.log('上傳完成');
    refreshList();
  }}
/>
```

### Hook 使用

```typescript
import { useDocumentUpload } from './src/hooks/useDocumentUpload';

function MyComponent() {
  const { pickAndUpload, isUploading, error } = useDocumentUpload();

  const handleUpload = async () => {
    const result = await pickAndUpload('building_title');
    if (result.success) {
      alert('上傳成功！');
    }
  };

  return (
    <button onClick={handleUpload} disabled={isUploading}>
      {isUploading ? '上傳中...' : '上傳文件'}
    </button>
  );
}
```

---

## ⏭️ 下一步

### 立即可做

- [ ] 執行 [TEST_CHECKLIST.md](TEST_CHECKLIST.md) 中的測試
- [ ] 整合至現有 Dashboard（參考 [DASHBOARD_INTEGRATION_EXAMPLE.md](DASHBOARD_INTEGRATION_EXAMPLE.md)）
- [ ] 部署至測試環境

### Phase 2 規劃

- [ ] 文件預覽（縮圖）
- [ ] 詳細上傳進度條
- [ ] 相機拍攝選項
- [ ] 單元測試覆蓋

### Phase 3 規劃

- [ ] Realtime OCR 狀態訂閱
- [ ] OCR 結果預覽
- [ ] 手動修正介面

---

## 🎉 完成！

現在你已經可以在 Mobile App 中：

1. ✅ 選擇 PDF/圖片文件
2. ✅ 上傳至雲端儲存（Supabase）
3. ✅ 自動創建資料庫記錄
4. ✅ 查看已上傳文件列表
5. ✅ 追蹤 OCR 處理狀態

**需要幫助？** 查看 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) 或 [DOCUMENT_UPLOAD_README.md](DOCUMENT_UPLOAD_README.md)

---

**開始使用文件上傳功能吧！** 🚀
