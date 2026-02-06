# 草稿儲存與照片上傳修正 - 測試指引

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## ✅ 修正摘要

本次修正解決了以下問題：

1. ✅ **HEIC 照片支援** - Apple iPhone 拍攝的 HEIC 格式照片現在可以上傳
2. ✅ **草稿儲存修正** - 修正了 File 物件序列化錯誤，草稿可以正常儲存
3. ✅ **TypeScript 編譯錯誤** - 修正了所有 build 錯誤，專案可以成功編譯
4. ✅ **完成按鈕修正** - onClick handler 類型修正，按鈕現在可以正常運作

---

## 🚀 開始測試

### 前置準備

1. **確認服務運行**
   ```bash
   # 開發伺服器應該已經在 http://localhost:3000 運行
   lsof -i:3000
   ```

2. **清除舊資料**（避免舊草稿干擾測試）
   ```javascript
   // 打開瀏覽器 Console (F12)
   localStorage.removeItem('property_form_drafts')
   location.reload()
   ```

3. **開啟測試頁面**
   ```
   http://localhost:3000/landlord/properties/add
   ```

---

## 📝 測試案例

### Test 1: HEIC 照片上傳 ✅

**目標**: 驗證 Apple iPhone 拍攝的 HEIC 照片可以上傳

**步驟**:
1. 前往新增物件頁面
2. 填寫 Step 1-4 的基本資料
3. 進入 Step 5 (照片上傳)
4. 點擊「點擊或拖曳照片至此處上傳」
5. 選擇 iPhone 拍攝的 HEIC 照片

**預期結果**:
- ✅ 照片檔案可以選擇
- ✅ 上傳成功，沒有「不支援的檔案格式」錯誤
- ✅ 顯示照片預覽
- ✅ 可以看到照片縮圖和主圖標記

**如果失敗，檢查**:
```javascript
// 打開 Console (F12)，上傳時應該看到：
// 沒有錯誤訊息

// 如果看到「不支援的檔案格式」，執行以下檢查：
const file = event.target.files[0]
console.log({
  name: file.name,        // 例如: IMG_1234.HEIC
  type: file.type,        // 例如: image/heic 或空字串
  size: file.size,        // 檔案大小（bytes）
})
```

---

### Test 2: 儲存草稿（含照片）✅

**目標**: 驗證草稿可以成功儲存，即使包含照片

**步驟**:
1. 填寫表單資料：
   - **Step 1**: 標題「測試物件A」、地址、類型「出租」、價格 30000
   - **Step 2**: 所有權人姓名
   - **Step 3**: 主建物面積
2. 上傳 2-3 張照片（包含 HEIC）
3. 點擊「儲存草稿」按鈕（在頁面右上角，「讀取草稿」旁邊）

**預期結果**:
- ✅ 彈出 alert: `✅ 草稿已儲存！檔名: 測試物件A - 出租`
- ✅ Console 顯示成功日誌
- ✅ 沒有「儲存草稿失敗」錯誤

**檢查 Console 日誌**:
```
[Draft] Starting save...
[Draft] Serializing data...
[Draft] Data serialized successfully
[Draft] Updated existing draft / Added new draft
[Draft] Saving to localStorage...
[Draft] Updating state...
[Draft] Save completed successfully
```

**如果失敗，檢查**:
```javascript
// 打開 Console (F12)
// 如果看到 [Draft] Save failed: ...

// 錯誤 A: QuotaExceededError
// 解決: localStorage 已滿，執行以下清理
localStorage.clear()

// 錯誤 B: Converting circular structure to JSON
// 解決: 這表示序列化失敗，請回報此錯誤

// 錯誤 C: Cannot read properties of null
// 解決: 至少填寫標題和地址後再儲存
```

---

### Test 3: 讀取草稿 ✅

**目標**: 驗證草稿可以正確載入

**步驟**:
1. 儲存草稿後（參考 Test 2）
2. 重新整理頁面（F5）
3. 點擊「讀取草稿」按鈕
4. 應該看到 Drawer 開啟，顯示草稿列表
5. 點擊草稿的「載入」按鈕

**預期結果**:
- ✅ Drawer 顯示草稿資訊：
  - 📝 草稿名稱: 「測試物件A - 出租」
  - 📍 物件地址
  - 💰 價格 (含出租/出售標記)
  - 🕐 儲存時間
- ✅ 點擊「載入」後，表單自動填入
- ✅ alert 顯示: 「草稿已載入！」
- ⚠️ **照片需要重新上傳**（這是正常行為，因為 blob: URL 在重新載入後失效）

**草稿顯示格式**:
```
┌──────────────────────────────────────┐
│ 測試物件A - 出租                      │
│ 📍 台北市測試路123號                  │
│ 💰 NT$ 30,000/月                     │
│ 儲存於 2/4 15:28        [載入] [刪除] │
└──────────────────────────────────────┘
```

---

### Test 4: 自訂草稿檔名 ✅

**目標**: 驗證可以使用自訂檔名儲存草稿

**步驟**:
1. 填寫表單資料
2. 點擊「讀取草稿」開啟 Drawer
3. 看到「儲存當前表單為草稿」區塊
4. 看到預設檔名預覽
5. 在輸入框輸入自訂名稱: 「重要客戶-李先生物件」
6. 點擊「儲存」按鈕

**預期結果**:
- ✅ alert 顯示: `✅ 草稿已儲存！檔名: 重要客戶-李先生物件`
- ✅ 草稿列表中顯示自訂檔名
- ✅ 可以在草稿列表中找到此草稿

---

### Test 5: 多個草稿管理 ✅

**目標**: 驗證可以管理多個草稿

**步驟**:
1. 儲存草稿 A: 「台北市大安區物件 - 出租」
2. 清空表單（重新整理頁面）
3. 填寫不同資料
4. 儲存草稿 B: 「信義區豪宅 - 出售」
5. 再次清空表單
6. 儲存草稿 C: 「VIP客戶-王先生」
7. 開啟草稿 Drawer

**預期結果**:
- ✅ 看到 3 個草稿
- ✅ 顯示 「已儲存的草稿 (3/10)」
- ✅ 最新的草稿在最上面
- ✅ 每個草稿顯示完整資訊（名稱、地址、價格、時間）
- ✅ 可以分別載入或刪除每個草稿

---

### Test 6: 刪除草稿 ✅

**目標**: 驗證可以刪除草稿

**步驟**:
1. 開啟草稿 Drawer
2. 點擊某個草稿的「刪除」按鈕
3. 確認刪除

**預期結果**:
- ✅ 彈出確認對話框: 「確定要刪除「xxx」？」
- ✅ 確認後草稿消失
- ✅ 草稿計數更新 (例如: 3/10 → 2/10)

---

### Test 7: 完成按鈕 ✅

**目標**: 驗證完成按鈕可以正常運作

**步驟**:
1. 完成所有必填欄位：
   - **Step 1**: 標題、地址、價格
   - **Step 2**: 所有權人姓名
   - **Step 3**: 主建物面積
2. 進入 Step 5
3. 點擊「完成」按鈕

**預期結果**:
- ✅ 按鈕顯示 loading 狀態
- ✅ Console 顯示: `提交物件資料: {...}`
- ✅ 1 秒後跳轉到物件列表頁

**如果沒有反應**:
```javascript
// 打開 Console (F12) 檢查錯誤

// 可能原因 A: 必填欄位未填
// 檢查：
const required = {
  title: formData.title,           // 必須有值
  address: formData.address,       // 必須有值
  price: formData.price,           // 必須是數字
  owner_name: formData.owner_name, // 必須有值
  main_area_sqm: formData.main_area_sqm, // 必須是數字
}
console.log('Required fields:', required)

// 可能原因 B: 資料型別錯誤
typeof formData.price === 'number'  // 必須是 true
typeof formData.main_area_sqm === 'number'  // 必須是 true
```

---

## 🔍 LocalStorage 檢查

### 查看草稿儲存位置

**步驟**:
1. 儲存一個草稿
2. 打開瀏覽器開發者工具（F12）
3. 前往 **Application** > **Local Storage**
4. 查看 `property_form_drafts`

**預期結果**:
```json
[
  {
    "id": "1738665600000",
    "name": "測試物件A - 出租",
    "savedAt": "2026-02-04T10:00:00.000Z",
    "data": {
      "title": "測試物件A",
      "address": "台北市測試路123號",
      "type": "rental",
      "price": 30000,
      "photos": [
        {
          "id": "...",
          "url": "blob:http://localhost:3000/...",
          "file": null  // ← File 物件已被移除
        }
      ],
      "formKey": "property_add_form"
    }
  }
]
```

### 檢查容量

```javascript
// 檢查 localStorage 使用量
let total = 0
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    total += localStorage[key].length + key.length
  }
}
console.log(`LocalStorage 使用量: ${(total / 1024).toFixed(2)} KB`)

// 如果接近 5-10 MB，可能需要清理
if (total > 4 * 1024 * 1024) {
  console.warn('⚠️ LocalStorage 接近容量限制！')
}
```

---

## ⚠️ 已知限制

### 1. 照片在草稿中的限制

**現象**: 載入草稿後，照片預覽消失，需要重新上傳

**原因**:
- 照片使用 `blob:` URL，這是瀏覽器的暫時 URL
- 頁面重新載入後，blob URL 會失效
- File 物件無法序列化到 localStorage

**影響**:
- ✅ 不會造成錯誤
- ⚠️ 照片需要重新上傳
- ✅ 其他表單資料完整保留

**未來改進** (可選):
- 將照片轉為 Base64 儲存（會增加 LocalStorage 使用量）
- 上傳到臨時儲存（需要後端支援）

### 2. LocalStorage 容量限制

**限制**: 5-10 MB（取決於瀏覽器）

**影響**:
- 最多可儲存 10 個草稿（已設定限制）
- 超過 10 個時，最舊的草稿會被自動刪除

**如果遇到 QuotaExceededError**:
```javascript
// 解決方案 1: 刪除舊草稿
localStorage.removeItem('property_form_drafts')

// 解決方案 2: 清除所有 localStorage
localStorage.clear()

// 解決方案 3: 減少儲存的資料量（刪除照片）
```

### 3. 草稿不會同步

**說明**:
- 草稿儲存在瀏覽器的 LocalStorage，只存在於當前電腦的當前瀏覽器
- 切換電腦或瀏覽器會看不到草稿
- 無痕模式的草稿在關閉視窗後會消失

---

## ✅ 測試完成檢查清單

請確認以下所有測試都通過：

- [ ] HEIC 照片可以上傳
- [ ] HEIC 照片顯示預覽
- [ ] 可以儲存草稿（無錯誤）
- [ ] 可以讀取草稿
- [ ] 可以使用自訂檔名
- [ ] 可以管理多個草稿
- [ ] 可以刪除草稿
- [ ] 完成按鈕有反應
- [ ] Console 沒有錯誤
- [ ] LocalStorage 有草稿資料

---

## 📊 測試結果回報

測試完成後，請回報以下資訊：

1. **通過的測試**: Test 1, 2, 3, 4, 5, 6, 7
2. **失敗的測試**: 無 / Test X (說明錯誤)
3. **Console 錯誤**: 有 / 無（如果有，請貼上錯誤訊息）
4. **其他問題**: 無 / 有（說明）

---

## 🆘 故障排除

### 問題 1: 仍然無法儲存草稿

**檢查步驟**:
1. 打開 Console (F12)
2. 點擊「儲存草稿」
3. 查看 `[Draft]` 開頭的日誌

**常見錯誤**:
- `QuotaExceededError` → LocalStorage 已滿，執行 `localStorage.clear()`
- `Converting circular structure to JSON` → 回報此錯誤
- `Cannot read properties of null` → 至少填寫標題後再儲存

### 問題 2: HEIC 照片仍無法上傳

**檢查步驟**:
```javascript
// 選擇 HEIC 檔案後，執行：
const file = event.target.files[0]
console.log({
  name: file.name,
  type: file.type,
  extension: file.name.match(/\.[^.]+$/)?.[0]
})

// 應該看到：
// name: "IMG_1234.HEIC"
// type: "image/heic" 或 "" (空字串也 OK)
// extension: ".heic" 或 ".HEIC"
```

### 問題 3: 完成按鈕仍無反應

**檢查步驟**:
```javascript
// 打開 Console (F12)
// 點擊「完成」按鈕
// 如果沒有任何輸出，檢查必填欄位：

const formData = watch()
console.log({
  title: formData.title,           // 必須有值
  address: formData.address,       // 必須有值
  price: formData.price,           // 必須是數字
  owner_name: formData.owner_name, // 必須有值
  main_area_sqm: formData.main_area_sqm, // 必須是數字
})
```

---

**測試指引版本**: 1.0
**創建日期**: 2026-02-04
**開發伺服器**: http://localhost:3000
**測試頁面**: http://localhost:3000/landlord/properties/add
