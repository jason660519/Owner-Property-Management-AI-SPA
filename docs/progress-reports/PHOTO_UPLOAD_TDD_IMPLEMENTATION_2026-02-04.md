# 照片上傳功能 TDD 實作報告

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0
> **開發方法**: Test-Driven Development (TDD)

---

## 📋 TDD 流程總結

### Phase 1: RED - 寫測試（會失敗）✅

**測試檔案**: `apps/web/components/property/__tests__/PhotoUpload.test.tsx`

創建了 13 個測試案例：

#### Rendering Tests (3)
- ✅ 應渲染上傳區域
- ✅ 應顯示檔案類型和大小限制
- ✅ 應顯示主圖提示

#### File Upload Tests (5)
- ✅ 應接受有效的圖片檔案
- ✅ 應接受多個檔案
- ✅ 應拒絕超過 10MB 的檔案
- ✅ 應拒絕非圖片檔案
- ✅ 應限制最多 20 張照片

#### Photo Preview Tests (3)
- ✅ 應顯示已上傳的照片
- ✅ 應在第一張照片顯示主圖標記
- ✅ 應允許刪除照片

#### Drag and Drop Tests (2)
- ✅ 應處理拖曳事件
- ✅ 應處理拖放有效檔案

**初次測試結果**: ❌ FAIL - 組件不存在

---

### Phase 2: GREEN - 實作組件（測試通過）✅

**組件檔案**: `apps/web/components/property/PhotoUpload.tsx`

實作功能：

#### 核心功能
```typescript
interface Photo {
  id: string
  url: string        // Preview URL (blob or uploaded URL)
  file: File | null  // Original file for upload
}
```

#### 檔案驗證
- **支援格式**: JPG, PNG, HEIC
- **檔案大小限制**: 10MB
- **照片數量限制**: 20 張
- **即時驗證**: 上傳時檢查格式和大小

#### 使用者體驗
1. **點擊上傳**: 點擊上傳區域選擇檔案
2. **拖放上傳**: 拖曳檔案到上傳區域
3. **預覽功能**: 即時顯示照片預覽
4. **主圖標記**: 第一張照片標記為主圖
5. **刪除功能**: Hover 顯示刪除按鈕
6. **清除全部**: 一鍵清除所有照片
7. **錯誤提示**: 友善的錯誤訊息

**測試結果**: ✅ PASS - 13/13 測試通過

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        0.537 s
```

---

### Phase 3: REFACTOR - 整合到表單 ✅

#### 修改的檔案

**1. 表單頁面** (`apps/web/app/(dashboard)/landlord/properties/add/page.tsx`)

**Schema 更新**:
```typescript
const addPropertySchema = z.object({
  // ... 其他欄位

  // Step 5: 照片上傳
  photos: z.array(z.object({
    id: z.string(),
    url: z.string(),
    file: z.any().nullable(),
  })).optional(),
})
```

**預設值**:
```typescript
defaultValues: {
  type: 'rental',
  auxiliary_buildings: [],
  parking_spaces: [],
  photos: [],  // ✅ 新增
}
```

**Step 5 UI 替換**:
```typescript
{/* 舊的靜態 UI - 已移除 */}

{/* 新的 PhotoUpload 組件 */}
{currentStep === 5 && (
  <PhotoUpload
    photos={photos}
    onChange={(newPhotos) => setValue('photos', newPhotos)}
  />
)}
```

---

## 🎯 功能特色

### 1. 多種上傳方式

#### 點擊上傳
```
點擊上傳區域 → 選擇檔案 → 自動驗證 → 顯示預覽
```

#### 拖放上傳
```
拖曳檔案 → 放到上傳區域 → 自動驗證 → 顯示預覽
```

#### 批次上傳
```
一次選擇多個檔案 → 同時驗證 → 全部顯示預覽
```

### 2. 智能驗證

#### 檔案類型檢查
```typescript
ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']

❌ PDF → "不支援的檔案格式，請上傳 JPG、PNG 或 HEIC 格式"
❌ DOC → "不支援的檔案格式，請上傳 JPG、PNG 或 HEIC 格式"
✅ JPG → 通過
✅ PNG → 通過
```

#### 檔案大小檢查
```typescript
MAX_SIZE_MB = 10

❌ 15MB JPG → "檔案大小超過限制 (15.00MB > 10MB)"
✅ 5MB JPG → 通過
```

#### 數量限制
```typescript
MAX_PHOTOS = 20

❌ 已有 20 張，再上傳 → "最多只能上傳 20 張照片"
✅ 已有 5 張，再上傳 3 張 → 通過（共 8 張）
```

### 3. 預覽與管理

#### 照片網格顯示
```
┌─────┬─────┬─────┬─────┐
│ 主圖 │  2  │  3  │  4  │
│  1  │     │     │     │
└─────┴─────┴─────┴─────┘
```

#### 主圖標記
- 第一張照片自動標記為「主圖」
- 紫色標籤顯示

#### 刪除功能
- Hover 時顯示刪除按鈕（X）
- 點擊刪除單張照片
- 「清除全部」按鈕

#### 照片計數
```
已上傳 5 / 20 張照片
```

---

## 🧪 測試覆蓋率

### 單元測試

| 測試類別 | 測試數 | 狀態 |
|---------|-------|------|
| Rendering | 3 | ✅ PASS |
| File Upload | 5 | ✅ PASS |
| Photo Preview | 3 | ✅ PASS |
| Drag and Drop | 2 | ✅ PASS |
| **總計** | **13** | **✅ 100%** |

### E2E 測試

**測試檔案**: `apps/web/e2e/property-photo-upload.spec.ts`

測試案例：
1. ✅ 透過檔案輸入上傳照片
2. ✅ 顯示超大檔案錯誤
3. ✅ 刪除已上傳的照片
4. ✅ 清除所有照片
5. ✅ 分批上傳多次
6. ✅ 草稿中儲存照片

---

## 📸 手動測試指南

### 前置準備

1. **啟動服務**:
```bash
# 確認前端服務運行
cd apps/web
npm run dev

# 應該在 http://localhost:3000 運行
```

2. **準備測試照片**:
```
/Volumes/KLEVV-4T-2/Australia 108-2216/2023年室內照片/
├── S__2277388.jpg  (283 KB)
├── S__2277389.jpg  (2.2 MB)
├── S__2277390.jpg  (225 KB)
└── ... (更多照片)
```

### 測試步驟

#### Test 1: 基本照片上傳 ✅

1. 開啟 http://localhost:3000/landlord/properties/add
2. **Step 1**:
   - 標題: "測試物件 - 照片上傳"
   - 地址: "台北市大安區測試路123號"
   - 類型: 出租
   - 價格: 30000
   - 點擊「下一步」
3. **Step 2**:
   - 所有權人姓名: "測試所有權人"
   - 點擊「下一步」
4. **Step 3**:
   - 主建物面積: 30
   - 點擊「下一步」
5. **Step 4**: 直接點擊「下一步」
6. **Step 5**: 照片上傳
   - 點擊上傳區域
   - 選擇 3 張照片（S__2277388.jpg, S__2277389.jpg, S__2277390.jpg）
   - **預期結果**:
     - ✅ 顯示 3 張照片預覽
     - ✅ 第一張標記「主圖」
     - ✅ 顯示「已上傳 3 / 20 張照片」

#### Test 2: 拖放上傳 ✅

1. 在 Step 5
2. 從 Finder 拖曳 2 張照片到上傳區域
3. **預期結果**:
   - ✅ 上傳區域變為紫色（拖曳時）
   - ✅ 放開後顯示照片預覽
   - ✅ 計數更新

#### Test 3: 刪除照片 ✅

1. 上傳 3 張照片
2. Hover 第二張照片
3. 點擊 X 刪除按鈕
4. **預期結果**:
   - ✅ 第二張照片被移除
   - ✅ 計數變為「已上傳 2 / 20 張照片」
   - ✅ 剩餘照片重新排列

#### Test 4: 清除全部 ✅

1. 上傳多張照片
2. 點擊「清除全部」按鈕
3. **預期結果**:
   - ✅ 所有照片清除
   - ✅ 顯示空的上傳區域
   - ✅ 計數消失

#### Test 5: 錯誤處理 ⚠️

1. **測試超大檔案** (需要準備 > 10MB 的圖片):
   - 上傳大於 10MB 的圖片
   - **預期結果**: ❌ 顯示錯誤訊息「檔案大小超過限制」

2. **測試錯誤格式**:
   - 嘗試上傳 PDF 或其他非圖片檔案
   - **預期結果**: ❌ 顯示錯誤訊息「不支援的檔案格式」

3. **測試數量限制**:
   - 上傳超過 20 張照片
   - **預期結果**: ❌ 顯示錯誤訊息「最多只能上傳 20 張照片」

#### Test 6: 草稿儲存 ✅

1. 上傳 3 張照片
2. 點擊「儲存草稿」
3. 輸入草稿名稱「測試物件-含照片」
4. 儲存
5. 重新載入頁面
6. 點擊「讀取草稿」
7. 選擇剛才儲存的草稿
8. **預期結果**:
   - ✅ 所有欄位正確載入
   - ✅ 照片也正確載入（⚠️ 注意: blob URL 可能失效，需要特殊處理）

---

## 🐛 已知問題與限制

### 1. 草稿中的照片儲存 ⚠️

**問題**: 照片使用 `blob:` URL，重新載入頁面後會失效

**影響**:
- 草稿中的照片無法在頁面重新載入後顯示
- 需要重新上傳照片

**解決方案** (未來實作):
```typescript
// Option 1: 轉為 Base64 儲存
const base64 = await fileToBase64(file)
localStorage.setItem('draft_photos', base64)

// Option 2: 上傳到臨時儲存
const tempUrl = await uploadToTempStorage(file)
localStorage.setItem('draft_photos', tempUrl)
```

### 2. 記憶體管理 ⚠️

**問題**: `URL.createObjectURL` 創建的 blob URL 需要手動釋放

**目前實作**:
```typescript
// 組件中已實作清理
const handleDeletePhoto = (photoId: string) => {
  const photo = photos.find(p => p.id === photoId)
  if (photo && photo.url.startsWith('blob:')) {
    URL.revokeObjectURL(photo.url)  // ✅ 已處理
  }
  onChange(photos.filter(p => p.id !== photoId))
}
```

**建議**: 在組件卸載時清理所有 blob URL

### 3. 實際上傳到 Supabase Storage 🔧

**目前狀態**: 照片只儲存在前端（File 物件 + blob URL）

**待實作**:
```typescript
const handleSubmit = async (data: FormData) => {
  // 1. 上傳照片到 Supabase Storage
  const uploadedUrls = await Promise.all(
    data.photos.map(async (photo) => {
      if (photo.file) {
        const { data, error } = await supabase.storage
          .from('property-photos')
          .upload(`${userId}/${propertyId}/${photo.id}`, photo.file)

        return data.path
      }
      return photo.url
    })
  )

  // 2. 儲存照片 URL 到資料庫
  await supabase.from('property_photos').insert(
    uploadedUrls.map((url, index) => ({
      property_id: propertyId,
      photo_url: url,
      is_main: index === 0,
      display_order: index,
    }))
  )
}
```

---

## 📊 效能考量

### 檔案大小優化

**建議**: 實作圖片壓縮

```typescript
import imageCompression from 'browser-image-compression'

const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }

  try {
    return await imageCompression(file, options)
  } catch (error) {
    console.error('壓縮失敗:', error)
    return file
  }
}
```

### 批次上傳優化

**建議**: 限制並行上傳數量

```typescript
// 最多同時上傳 3 個檔案
const uploadBatch = async (files: File[]) => {
  const batchSize = 3
  const results = []

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(file => uploadToStorage(file))
    )
    results.push(...batchResults)
  }

  return results
}
```

---

## ✅ 完成檢查清單

### 開發階段
- [x] 創建測試檔案 (PhotoUpload.test.tsx)
- [x] 運行測試（RED - 失敗）
- [x] 實作 PhotoUpload 組件
- [x] 運行測試（GREEN - 通過）
- [x] 整合到表單（REFACTOR）
- [x] 創建 E2E 測試
- [x] 撰寫文檔

### 測試階段
- [x] 單元測試通過 (13/13)
- [ ] E2E 測試通過
- [ ] 手動測試通過
- [ ] 效能測試
- [ ] 跨瀏覽器測試

### 待實作
- [ ] 圖片壓縮
- [ ] Supabase Storage 整合
- [ ] 草稿照片持久化
- [ ] 上傳進度顯示
- [ ] 圖片編輯功能（裁切、旋轉）

---

## 🎓 TDD 經驗總結

### 優點 ✅

1. **信心保證**: 13 個測試覆蓋核心功能，修改時不怕破壞
2. **設計驅動**: 測試先行，迫使設計清晰的 API
3. **即時反饋**: 每次修改立即知道是否破壞功能
4. **文檔價值**: 測試即文檔，清楚展示如何使用組件

### 挑戰 ⚠️

1. **環境差異**: JSDOM 不支援 `URL.createObjectURL`，需要 mock
2. **非同步處理**: 需要 `waitFor` 處理非同步狀態更新
3. **測試時間**: 寫測試花費額外時間（但長期節省除錯時間）

### 最佳實踐 💡

1. **先寫測試**: 明確需求後立即寫測試
2. **小步快跑**: 一次實作一個功能，立即驗證
3. **重構自信**: 有測試保護，放心重構
4. **Mock 適度**: 只 mock 必要的外部依賴

---

**實作完成時間**: 2026-02-04
**測試狀態**: ✅ 單元測試通過 (13/13)
**整合狀態**: ✅ 已整合到表單
**文檔版本**: 1.0
