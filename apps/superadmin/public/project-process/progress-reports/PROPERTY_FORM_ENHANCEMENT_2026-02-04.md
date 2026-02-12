# 物件表單增強功能實作報告

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **版本**: 1.0

---

## 📋 功能概述

根據用戶需求，對新增物件表單進行了三項重要增強：

1. **附屬建物多筆管理** - 支援新增/編輯/刪除多筆附屬建物（陽台、雨遮、平台等）
2. **車位類型區分** - 明確區分獨立車位與公設車位
3. **草稿儲存功能** - 支援自訂檔名的草稿儲存與管理

---

## 🎯 實作內容

### 1. 新增組件 (3 個檔案)

#### 1.1 AuxiliaryBuildingsManager.tsx

**路徑**: `apps/web/components/property/AuxiliaryBuildingsManager.tsx`

**功能**:
- 動態新增/編輯/刪除附屬建物
- 支援常見類型: 陽台、雨遮、平台、屋頂突出物、其他
- 自動計算總面積（m² 與坪）
- 可選填位置資訊

**資料結構**:
```typescript
interface AuxiliaryBuilding {
  id: string;
  name: string;          // 陽台、雨遮、平台等
  area_sqm: number;      // 面積（平方公尺）
  location: string;      // 位置（選填）
}
```

#### 1.2 ParkingManager.tsx

**路徑**: `apps/web/components/property/ParkingManager.tsx`

**功能**:
- 區分獨立車位（有獨立產權）與公設車位（包含在公設中）
- 支援車位種類: 平面、機械、坡道平面、坡道機械
- 可輸入車位編號與位置
- 分別統計獨立與公設車位數量和面積

**資料結構**:
```typescript
interface ParkingSpace {
  id: string;
  type: 'independent' | 'shared';  // 獨立車位 | 公設車位
  category: string;                // 平面、機械、坡道平面、坡道機械
  number: string;                  // 車位編號
  area_sqm: number;                // 面積（平方公尺）
  location: string;                // 位置（選填）
}
```

#### 1.3 useFormDraft Hook

**路徑**: `apps/web/hooks/useFormDraft.ts`

**功能**:
- LocalStorage 為基礎的草稿儲存
- 支援自訂草稿名稱
- 自動生成時間戳記檔名（若未自訂）
- 保留最近 10 筆草稿
- 提供載入/刪除/重新命名功能

**特色**:
```typescript
// 自訂檔名儲存
saveDraft(data, "大安區公寓-初稿")

// 自動生成檔名（預設）
saveDraft(data)  // → "草稿 2026/2/4 下午3:28"
```

---

### 2. 表單整合修改

**檔案**: `apps/web/app/(dashboard)/landlord/properties/add/page.tsx`

#### 2.1 Schema 更新

```typescript
const addPropertySchema = z.object({
  // ... 其他欄位

  // ✅ 新增：附屬建物陣列
  auxiliary_buildings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    area_sqm: z.number(),
    location: z.string(),
  })).optional(),

  // ✅ 新增：車位陣列
  parking_spaces: z.array(z.object({
    id: z.string(),
    type: z.enum(['independent', 'shared']),
    category: z.string(),
    number: z.string(),
    area_sqm: z.number(),
    location: z.string(),
  })).optional(),

  // ❌ 移除：auxiliary_area_sqm (單一欄位)
})
```

#### 2.2 Step 3 重新設計

**原本設計**:
- 主建物面積（單一輸入）
- 附屬建物面積（單一輸入）
- 公共設施面積（單一輸入）

**新設計**:
- 主建物面積（單一輸入）
- **附屬建物管理**（AuxiliaryBuildingsManager 組件）
- **車位管理**（ParkingManager 組件）
- 其他公共設施面積（單一輸入）
- 總面積自動計算（包含所有項目）

#### 2.3 總面積計算邏輯

```typescript
總面積 =
  主建物面積 +
  Σ(所有附屬建物面積) +
  Σ(所有車位面積) +
  其他公共設施面積
```

---

## 🎨 使用者介面

### 草稿管理 Drawer

**觸發方式**:
- 點擊「讀取草稿」按鈕開啟

**功能**:
1. **儲存新草稿**
   - 輸入自訂名稱（選填）
   - 點擊「儲存」

2. **草稿列表**
   - 顯示草稿名稱與儲存時間
   - 提供「載入」與「刪除」按鈕
   - 刪除前會確認

3. **自動記錄**
   - 最後儲存時間顯示於頁面標題下方

---

## 📸 UI 截圖說明

### Step 3 - 面積換算（新版）

```
┌─────────────────────────────────────┐
│  主建物面積: [30.5] m²  → 9.23 坪   │
├─────────────────────────────────────┤
│  附屬建物                            │
│  ┌─────────────────────────────┐   │
│  │ 陽台  5.2 m² ≈ 1.57 坪      │   │
│  │ 雨遮  2.1 m² ≈ 0.64 坪      │   │
│  │ [+ 新增附屬建物]             │   │
│  │ 附屬建物總計: 2.21 坪        │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  車位資料                            │
│  ┌─────────────────────────────┐   │
│  │ 獨立車位 (1)                 │   │
│  │  - 平面 A-01  12.5 m²       │   │
│  │                              │   │
│  │ 公設車位 (0)                 │   │
│  │                              │   │
│  │ [+ 新增車位]                 │   │
│  │ 車位總計: 3.78 坪            │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  其他公共設施: [10.0] m² → 3.03 坪  │
├─────────────────────────────────────┤
│  總面積: 18.25 坪 (60.30 m²)       │
└─────────────────────────────────────┘
```

---

## 🧪 測試建議

### 功能測試

1. **附屬建物管理**
   - [ ] 新增多筆附屬建物
   - [ ] 編輯附屬建物資料
   - [ ] 刪除附屬建物
   - [ ] 總面積自動更新

2. **車位管理**
   - [ ] 新增獨立車位
   - [ ] 新增公設車位
   - [ ] 切換車位類型
   - [ ] 編輯車位資料
   - [ ] 刪除車位

3. **草稿儲存**
   - [ ] 自訂檔名儲存
   - [ ] 自動檔名儲存
   - [ ] 載入草稿
   - [ ] 刪除草稿
   - [ ] 最多保留 10 筆草稿

### 資料驗證測試

1. **邏輯測試**
   - [ ] 總面積計算正確
   - [ ] m² 與坪換算正確（1 m² = 0.3025 坪）
   - [ ] 表單提交時包含所有附屬建物與車位資料

2. **邊界測試**
   - [ ] 未填寫附屬建物可正常提交
   - [ ] 未填寫車位可正常提交
   - [ ] 草稿超過 10 筆時自動刪除最舊的

---

## 🔧 技術細節

### LocalStorage 資料結構

```typescript
// Key: 'property_form_drafts'
[
  {
    id: "1738658880000",
    name: "大安區公寓-初稿",
    savedAt: "2026-02-04T15:28:00.000Z",
    data: {
      formKey: "property_add_form",
      title: "台北市大安區...",
      auxiliary_buildings: [...],
      parking_spaces: [...],
      // ... 其他表單欄位
    }
  },
  // ... 最多 10 筆
]
```

### 重要常數

```typescript
DRAFT_STORAGE_KEY = 'property_form_drafts'
AUTO_SAVE_INTERVAL = 30000  // 30 秒（目前未啟用）
MAX_DRAFTS = 10             // 最多保留 10 筆草稿
SQM_TO_PING = 0.3025        // m² 轉坪係數
```

---

## 📝 待辦事項（可選）

- [ ] 實作自動儲存功能（每 30 秒）
- [ ] 草稿重新命名功能 UI
- [ ] 草稿匯出/匯入功能（JSON）
- [ ] 車位照片上傳
- [ ] 附屬建物照片上傳

---

## ✅ 完成檢查清單

- [x] AuxiliaryBuildingsManager 組件建立
- [x] ParkingManager 組件建立
- [x] useFormDraft Hook 建立
- [x] 表單 Schema 更新
- [x] Step 3 UI 重新設計
- [x] 總面積計算邏輯更新
- [x] 草稿儲存功能整合
- [x] 草稿管理 Drawer UI
- [x] 讀取/刪除草稿功能
- [x] 自訂檔名功能

---

## 📞 問題排查

### 問題 1: 草稿儲存失敗

**症狀**: 點擊「儲存草稿」沒有反應

**可能原因**:
- LocalStorage 已滿（檢查其他應用是否佔用過多空間）
- 瀏覽器隱私模式

**解決方案**:
```javascript
// 檢查 LocalStorage 可用性
try {
  localStorage.setItem('test', 'test')
  localStorage.removeItem('test')
  console.log('LocalStorage 可用')
} catch (e) {
  console.error('LocalStorage 不可用:', e)
}
```

### 問題 2: 總面積計算錯誤

**檢查項目**:
- 確認所有 `area_sqm` 欄位為數字型別
- 檢查 `reduce` 函數初始值是否為 0
- 確認換算係數正確（0.3025）

---

**實作完成時間**: 2026-02-04
**測試狀態**: 待測試
**文檔版本**: 1.0
