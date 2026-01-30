# 文件上傳功能測試檢查清單

> **創建日期**: 2026-01-31
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## 📋 Phase 1 功能測試

### ✅ 環境準備

- [x] 安裝 `expo-document-picker` v14.0.8
- [x] 安裝 `expo-file-system` v19.0.21
- [x] 創建所有必要文件（types, services, hooks, components）
- [ ] Supabase `property-documents` bucket 已創建
- [ ] Storage RLS 政策已設定

### 1️⃣ 文件選擇測試

**測試步驟**:
1. 開啟 Mobile App
2. 導航至 DocumentsScreen
3. 選擇文件類型（例如：建物權狀）
4. 點擊「選擇並上傳文件」按鈕

**預期結果**:
- [ ] 文件選擇器成功開啟
- [ ] 顯示 PDF 和圖片選項
- [ ] 可成功選擇文件
- [ ] 取消選擇時不觸發上傳

**測試文件**:
- [ ] PDF 文件 (< 1MB)
- [ ] JPG 圖片 (< 1MB)
- [ ] PNG 圖片 (< 1MB)
- [ ] 大型 PDF (5-10MB)

### 2️⃣ 文件上傳測試

**測試步驟**:
1. 選擇一個小型 PDF 文件 (< 1MB)
2. 觀察上傳進度
3. 等待上傳完成

**預期結果**:
- [ ] 顯示「上傳中」狀態
- [ ] 進度從 0% → 50% → 100%
- [ ] 上傳成功後顯示「成功」提示
- [ ] UI 返回正常狀態

**錯誤處理**:
- [ ] 檔案過大 (>10MB) 顯示錯誤訊息
- [ ] 網路斷線時顯示錯誤
- [ ] 未登入時阻擋上傳

### 3️⃣ 資料庫驗證

**SQL 查詢** (在 Supabase Dashboard 執行):

```sql
-- 1. 檢查最新上傳的文件
SELECT
  id,
  document_name,
  document_type,
  file_size,
  mime_type,
  ocr_status,
  created_at
FROM property_documents
ORDER BY created_at DESC
LIMIT 5;
```

**預期結果**:
- [ ] 新記錄已創建
- [ ] `owner_id` 為當前用戶 UUID
- [ ] `document_type` 正確（例如 'building_title'）
- [ ] `file_path` 格式正確
- [ ] `ocr_status` 為 'pending'
- [ ] `is_verified` 為 false
- [ ] `uploaded_by` 為當前用戶 UUID

```sql
-- 2. 驗證 RLS 政策
SELECT * FROM property_documents WHERE owner_id = auth.uid();
```

**預期結果**:
- [ ] 可查看自己的文件
- [ ] 無法查看其他用戶的文件

```sql
-- 3. 檢查檔案路徑格式
SELECT file_path FROM property_documents ORDER BY created_at DESC LIMIT 1;
```

**預期格式**:
- 有 propertyId: `property-documents/{propertyId}/{timestamp}_{filename}`
- 無 propertyId: `property-documents/general/{timestamp}_{filename}`

### 4️⃣ Storage 驗證

**檢查步驟** (在 Supabase Dashboard):

1. 前往 Storage > property-documents
2. 找到最新上傳的文件

**預期結果**:
- [ ] 文件已成功儲存
- [ ] 路徑結構正確
- [ ] 檔案可下載
- [ ] 檔案大小正確
- [ ] MIME type 正確

### 5️⃣ UI 測試

**DocumentUploader 組件**:
- [ ] 文件類型選擇器正常顯示
- [ ] 選中的類型高亮顯示（紫色邊框）
- [ ] 上傳按鈕樣式正確
- [ ] 上傳中時按鈕 disabled
- [ ] 錯誤訊息正確顯示（紅色背景）
- [ ] 資訊文字顯示「支援格式：PDF, JPG, PNG | 最大 10MB」

**DocumentsScreen 組件**:
- [ ] 文件列表正確顯示
- [ ] OCR 狀態標記顏色正確
  - pending: 橙色
  - processing: 藍色
  - completed: 綠色
  - failed: 紅色
- [ ] 檔案大小格式化正確（KB/MB）
- [ ] 日期格式正確（繁體中文）
- [ ] 下拉刷新功能正常

### 6️⃣ 錯誤處理測試

**測試場景**:

1. **未登入狀態**
   - [ ] 上傳前檢查用戶登入
   - [ ] 顯示「User not authenticated」錯誤

2. **檔案過大**
   - [ ] 選擇 >10MB 文件
   - [ ] 顯示「檔案大小超過 10MB 限制」

3. **網路錯誤**
   - [ ] 關閉網路
   - [ ] 嘗試上傳
   - [ ] 顯示網路錯誤訊息

4. **Storage 權限錯誤**
   - [ ] 移除 Storage 權限
   - [ ] 嘗試上傳
   - [ ] 顯示權限錯誤

5. **取消上傳**
   - [ ] 開啟文件選擇器
   - [ ] 按取消
   - [ ] 不觸發錯誤

---

## 🔧 手動測試步驟

### Step 1: 啟動開發環境

```bash
# Terminal 1: 啟動 Supabase
supabase start

# Terminal 2: 啟動 Mobile App
cd apps/mobile
npm run ios  # 或 npm run android
```

### Step 2: 登入測試帳號

1. 開啟 App
2. 登入房東帳號
3. 確認已進入 Dashboard

### Step 3: 測試上傳流程

1. 導航至文件管理畫面（如已整合）
2. 選擇「建物權狀」
3. 點擊「選擇並上傳文件」
4. 選擇測試 PDF 文件
5. 觀察上傳進度
6. 確認成功訊息

### Step 4: 驗證資料

1. 開啟 Supabase Dashboard
2. 執行上方的 SQL 查詢
3. 檢查 Storage 中的文件

---

## 🐛 已知問題

### Issue 1: LandlordDashboard TypeScript 錯誤

**狀態**: 已存在（與本次實作無關）

**描述**: `outlineStyle: "none"` 不相容

**影響**: 不影響文件上傳功能

**解決方案**: 移除 `outlineStyle` 或改用 React Native Web 相容樣式

---

## ✅ 通過標準

Phase 1 功能視為完成，需滿足：

- [x] 所有文件已創建且無 TypeScript 錯誤
- [ ] 可成功選擇文件
- [ ] 可成功上傳至 Supabase Storage
- [ ] 可成功創建資料庫記錄
- [ ] OCR 狀態自動設為 'pending'
- [ ] 錯誤處理正常運作
- [ ] UI 顯示正確

---

## 📊 測試結果記錄

**測試日期**: ___________
**測試者**: ___________
**環境**: iOS / Android / Web
**Expo SDK**: 54.0.31
**Supabase**: Local / Cloud

**整體狀態**: ⬜ 通過 / ⬜ 部分通過 / ⬜ 未通過

**備註**:
```
(記錄測試中發現的問題或特殊情況)
```

---

## 🚀 下一步

Phase 1 測試通過後，即可進入：

- **Phase 2**: UI 優化與使用者體驗改善
- **Phase 3**: OCR 整合與狀態追蹤
- **Phase 4**: 進階功能（批次上傳、斷點續傳等）

詳見 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) 中的後續開發計畫。
