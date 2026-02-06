# 物件新增表單提交功能完整實作報告

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## 🎯 問題描述

### 用戶回報的問題

❌ **點擊「完成」按鈕後沒有反應**
- 無法得知資料是否儲存成功
- 不知道資料存在哪個資料表
- 新物件沒有出現在列表頁面
- 沒有任何成功或失敗的提示

### 根本原因

檢查程式碼發現 `onSubmit` 函數只是一個 **TODO**，沒有實際的資料庫寫入邏輯：

```typescript
const onSubmit = async (data: AddPropertyFormData) => {
  // TODO: 上傳至 Supabase ← 這裡只是 TODO！
  console.log('提交物件資料:', data)

  // 模擬 API 請求
  await new Promise((resolve) => setTimeout(resolve, 1000))

  router.push('/landlord/properties')
}
```

---

## ✅ 解決方案

### 完整實作內容

#### 1. 創建 Server Actions API (`lib/actions/properties.ts`)

✅ **`createProperty()` - 物件創建**
- 自動獲取當前登入用戶
- 根據類型寫入正確的資料表：
  - `type: 'sale'` → `Property_Sales` (出售物件)
  - `type: 'rental'` → `Property_Rentals` (出租物件)
- 所有詳細資料存入 `details` JSONB 欄位
- 自動 revalidate 列表頁面快取

✅ **`uploadPropertyPhoto()` - 照片上傳**
- 上傳照片到 Supabase Storage (`property-photos` bucket)
- 寫入 `Property_Photos` 表建立關聯
- 自動處理第一張照片為主圖
- 失敗自動回滾（刪除已上傳的檔案）

#### 2. 創建 Toast 通知系統 (`components/ui/Toast.tsx`)

✅ **即時反饋機制**
- ✅ 正在儲存：顯示進度提示
- ✅ 儲存成功：顯示綠色成功訊息，包含資料表名稱
- ❌ 儲存失敗：顯示紅色錯誤訊息，包含具體原因

**Toast 類型**：
- `success` - 成功（綠色）
- `error` - 錯誤（紅色）
- `info` - 資訊（藍色）

#### 3. 更新表單提交邏輯 (`page.tsx`)

✅ **完整的提交流程**：

```typescript
const onSubmit = async (data: AddPropertyFormData) => {
  // Step 1: 顯示「正在儲存」提示
  showToast({
    type: 'info',
    message: '正在儲存物件資料...',
  })

  // Step 2: 創建物件記錄
  const result = await createProperty({...})

  if (!result.success) {
    throw new Error(result.error)
  }

  // Step 3: 上傳照片（如果有）
  if (data.photos && data.photos.length > 0) {
    for (let i = 0; i < data.photos.length; i++) {
      await uploadPropertyPhoto(result.property_id, photo.file, isPrimary)
    }
  }

  // Step 4: 顯示成功訊息
  showToast({
    type: 'success',
    message: '✅ 物件新增成功！',
    description: `物件「${data.title}」已儲存至 ${tableName} 資料表`,
  })

  // Step 5: 跳轉到列表頁
  router.push('/landlord/properties')
}
```

#### 4. 創建 Storage Bucket

✅ **Supabase Storage 設定**
- Bucket: `property-photos`
- 大小限制: 10 MB
- 允許格式: JPEG, PNG, WebP
- 存取權限: 公開讀取，登入用戶可上傳

---

## 📊 資料庫架構說明

### 物件資料表

| 資料表 | 用途 | 主要欄位 |
|-------|------|---------|
| **`Property_Sales`** | 出售物件 | `id`, `owner_id`, `address`, `price`, `status`, `details` (JSONB) |
| **`Property_Rentals`** | 出租物件 | `id`, `owner_id`, `address`, `monthly_rent`, `status`, `lease_term`, `details` (JSONB) |
| **`Property_Photos`** | 物件照片 | `id`, `property_id`, `storage_path`, `is_primary`, `photo_type` |

### `details` JSONB 欄位結構

```json
{
  "title": "台北市大安區精緻公寓",
  "owner_name": "王小明",
  "owner_contact": "0912345678",
  "building_number": "建號123456",
  "land_number": "地號789012",
  "main_area_sqm": 30.5,
  "auxiliary_buildings": [
    {
      "id": "aux-1",
      "name": "陽台",
      "area_sqm": 5.2,
      "location": "前陽台"
    }
  ],
  "parking_spaces": [
    {
      "id": "park-1",
      "type": "independent",
      "category": "平面車位",
      "number": "B1-23",
      "area_sqm": 12.5,
      "location": "地下一樓"
    }
  ],
  "common_area_sqm": 8.3,
  "bedrooms": 3,
  "bathrooms": 2,
  "floor": 5,
  "total_floors": 12,
  "description": "全新裝潢，採光良好..."
}
```

### 查詢方式

**寫入**（Server Action）：
```typescript
// 出租物件
await supabase.from('Property_Rentals').insert({...})

// 出售物件
await supabase.from('Property_Sales').insert({...})
```

**讀取**（前端）：
```typescript
// 統一使用 View 查詢
await supabase.from('unified_properties_view').select('*')
```

---

## 🧪 測試指引

### 前置準備

1. **確認服務運行**
   ```bash
   # 前端
   lsof -i:3000

   # Supabase
   supabase status
   ```

2. **清除舊草稿**
   ```javascript
   localStorage.removeItem('property_form_drafts')
   location.reload()
   ```

3. **開啟測試頁面**
   ```
   http://localhost:3000/landlord/properties/add
   ```

---

### Test 1: 出租物件新增 ✅

**目標**: 測試完整的出租物件新增流程

**步驟**:
1. **Step 1 - 基本資料**:
   - 標題: 「台北市大安區精緻公寓」
   - 地址: 「台北市大安區和平東路三段123號」
   - 類型: 選擇「出租」
   - 價格: 30000

2. **Step 2 - 權狀資料**:
   - 所有權人姓名: 「王小明」
   - 聯絡地址: （選填）
   - 建號: （選填）
   - 地號: （選填）

3. **Step 3 - 面積資料**:
   - 主建物面積: 30.5 m²
   - 新增一個附屬建物：「陽台」5.2 m²
   - 新增一個車位：平面車位 B1-23
   - 公設面積: 8.3 m²

4. **Step 4 - 物件詳情**:
   - 房間數: 3
   - 衛浴數: 2
   - 所在樓層: 5
   - 總樓層: 12
   - 物件描述: 「全新裝潢，採光良好」

5. **Step 5 - 照片上傳**:
   - 上傳 2-3 張照片（包含 HEIC 格式測試）
   - 確認預覽顯示正常

6. **點擊「完成」按鈕**

**預期結果**:
- ✅ 按鈕顯示 Loading 狀態
- ✅ 出現藍色 Toast: 「正在儲存物件資料...」
- ✅ 出現綠色 Toast: 「✅ 物件新增成功！物件『台北市大安區精緻公寓』已儲存至 Property_Rentals 資料表」
- ✅ 自動跳轉到 `/landlord/properties`
- ✅ 新物件出現在列表頁面

**Console 日誌檢查**:
```
[Submit] 開始提交物件資料... {title: '台北市大安區精緻公寓', type: 'rental', ...}
[CreateProperty] Success: {property_id: 'xxx-xxx-xxx', type: 'rental', ...}
[Submit] 照片上傳成功 (1/3): ...
[Submit] 照片上傳成功 (2/3): ...
[Submit] 照片上傳成功 (3/3): ...
[Submit] 完成！準備跳轉到列表頁
```

---

### Test 2: 出售物件新增 ✅

**目標**: 測試出售物件寫入 `Property_Sales` 表

**步驟**:
與 Test 1 相同，但在 Step 1 選擇「出售」類型，價格填入 25000000

**預期結果**:
- ✅ Toast 顯示: 「...已儲存至 **Property_Sales** 資料表」
- ✅ 新物件出現在列表頁面

---

### Test 3: 只填必填欄位 ✅

**目標**: 測試最小資料集提交

**步驟**:
1. Step 1: 標題、地址、類型、價格
2. Step 2: 所有權人姓名
3. Step 3: 主建物面積
4. Step 4-5: 跳過
5. 直接點擊「完成」

**預期結果**:
- ✅ 成功提交
- ✅ details 中選填欄位為空或 undefined

---

### Test 4: 錯誤處理 ✅

#### Test 4.1: 未登入用戶

**步驟**: 登出後嘗試新增物件

**預期結果**:
- ❌ 紅色 Toast: 「❌ 新增物件失敗」
- ❌ 描述: 「用戶未登入」
- ✅ 不會跳轉
- ✅ 可以重試

#### Test 4.2: 必填欄位未填

**步驟**: 跳過 Step 2（未填所有權人姓名），直接點完成

**預期結果**:
- ✅ 按鈕無法點擊或 Zod 驗證失敗
- ✅ 顯示驗證錯誤訊息

#### Test 4.3: 網路錯誤

**步驟**:
1. 打開 Chrome DevTools
2. Network > Throttling > Offline
3. 嘗試提交

**預期結果**:
- ❌ 紅色 Toast: 「❌ 新增物件失敗」
- ✅ 不會跳轉
- ✅ 可以重新提交（網路恢復後）

---

## 🔍 Supabase 後台驗證

### 查看新增的物件資料

1. **開啟 Supabase Dashboard**
   ```bash
   supabase start
   # 複製 Studio URL (通常是 http://localhost:54323)
   ```

2. **前往 Table Editor**
   - 選擇 `Property_Rentals` 或 `Property_Sales`
   - 應該看到新增的記錄

3. **檢查欄位**
   - ✅ `id`: UUID
   - ✅ `owner_id`: 對應到 `users_profile.id`
   - ✅ `address`: 正確的地址
   - ✅ `price` 或 `monthly_rent`: 正確的價格
   - ✅ `status`: 'available' 或 'vacant'
   - ✅ `details`: JSONB，包含所有表單資料
   - ✅ `created_at`: 當前時間

### 查看照片上傳

1. **前往 Storage**
   - 選擇 `property-photos` bucket
   - 應該看到上傳的照片

2. **檢查路徑**
   - 格式: `{property_id}/{timestamp}-{random}.jpg`
   - 例如: `abc-123-def/1738665600000-xyz.jpg`

3. **檢查 Property_Photos 表**
   - ✅ `property_id`: 對應到物件 ID
   - ✅ `storage_path`: 正確的檔案路徑
   - ✅ `is_primary`: 第一張照片為 `true`

---

## 📋 列表頁面驗證

### 確認新物件出現在列表

1. **前往列表頁面**
   ```
   http://localhost:3000/landlord/properties
   ```

2. **預期結果**:
   - ✅ 新物件出現在列表頂部
   - ✅ 顯示標題、地址、價格
   - ✅ 顯示類型標籤（出租/出售）
   - ✅ 如果有照片，顯示主圖

3. **點擊物件**:
   - ✅ 可以查看詳情頁面
   - ✅ 所有資料正確顯示

---

## 🐛 故障排除

### 問題 1: Toast 沒有顯示

**可能原因**: ToastProvider 沒有正確設定

**檢查步驟**:
```javascript
// 打開 Console (F12)
// 檢查是否有錯誤: useToast must be used within ToastProvider
```

**解決方案**: 確認 `landlord/layout.tsx` 已包含 `<ToastProvider>`

---

### 問題 2: 提交後跳轉但列表是空的

**可能原因**: RLS 政策阻止查詢

**檢查步驟**:
```bash
# 檢查 Supabase logs
supabase logs

# 或在 Console 執行
const { data, error } = await supabase.from('unified_properties_view').select('*')
console.log(data, error)
```

**解決方案**:
1. 檢查用戶是否有 `landlord` 角色
2. 檢查 RLS 政策是否正確

---

### 問題 3: 照片上傳失敗

**可能原因**: Storage bucket 不存在

**檢查步驟**:
```bash
# 執行遷移
cd supabase
supabase migration up
```

**解決方案**: 確認 `property-photos` bucket 已創建

---

### 問題 4: 提交時出現 UNAUTHORIZED 錯誤

**可能原因**: 用戶未登入或 session 過期

**解決方案**:
1. 重新登入
2. 檢查 `.env.local` Supabase 配置是否正確

---

## ✅ 驗證清單

測試完成後，請確認：

**基本功能**:
- [ ] 出租物件可以成功新增
- [ ] 出售物件可以成功新增
- [ ] Toast 通知正常顯示
- [ ] 提交後自動跳轉到列表頁
- [ ] 新物件出現在列表頁面

**資料正確性**:
- [ ] Supabase 後台可以看到新記錄
- [ ] 資料寫入正確的表（Rentals/Sales）
- [ ] details JSONB 包含所有表單資料
- [ ] owner_id 正確對應到當前用戶

**照片功能**:
- [ ] 照片可以成功上傳
- [ ] Storage 中可以看到檔案
- [ ] Property_Photos 表有記錄
- [ ] 第一張照片標記為主圖

**錯誤處理**:
- [ ] 未登入時顯示錯誤
- [ ] 網路錯誤時顯示錯誤
- [ ] 可以重試提交

**性能**:
- [ ] 提交時間 < 3 秒（無照片）
- [ ] 提交時間 < 10 秒（含 3 張照片）
- [ ] 列表頁面正常刷新

---

## 📝 API 端點與錯誤碼對照表

### Server Actions

| Function | 描述 | 成功回傳 | 錯誤碼 |
|----------|------|---------|--------|
| `createProperty()` | 創建物件 | `{success: true, property_id: string}` | `UNAUTHORIZED`, `PROFILE_NOT_FOUND`, `DATABASE_ERROR`, `UNEXPECTED_ERROR` |
| `uploadPropertyPhoto()` | 上傳照片 | `{success: true, storage_path: string}` | 錯誤訊息字串 |

### 錯誤碼說明

| 錯誤碼 | 說明 | 解決方案 |
|-------|------|---------|
| `UNAUTHORIZED` | 用戶未登入 | 重新登入 |
| `PROFILE_NOT_FOUND` | 找不到用戶 profile | 檢查資料庫 users_profile 表 |
| `DATABASE_ERROR` | 資料庫寫入失敗 | 檢查 RLS 政策，查看 Supabase logs |
| `UNEXPECTED_ERROR` | 未預期的錯誤 | 查看 Console 錯誤訊息 |

---

## 🔧 未來改進 (可選)

### 1. 批次照片上傳優化

目前照片是依序上傳，可以改為並行：

```typescript
// 並行上傳
await Promise.all(
  photos.map((photo, i) => uploadPropertyPhoto(propertyId, photo.file, i === 0))
)
```

### 2. 上傳進度顯示

顯示詳細的上傳進度：

```typescript
showToast({
  type: 'info',
  message: `正在上傳照片 (${uploadedCount}/${totalPhotos})...`,
})
```

### 3. 離線支援

使用 Service Worker 儲存提交資料，網路恢復後自動重試。

### 4. 草稿自動儲存到雲端

目前草稿只存在 localStorage，可以改為存到 Supabase，支援跨裝置同步。

---

**實作日期**: 2026-02-04
**測試狀態**: ✅ 功能已實作，Build 成功，待用戶測試
**版本**: 1.0
**開發伺服器**: http://localhost:3000
**Supabase Studio**: http://localhost:54323 (執行 `supabase start` 後)
