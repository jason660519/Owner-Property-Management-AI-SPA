# 物件地址架構說明

> 最後更新：2026-03-16
> 適用版本：migration `20260316110000` 以後

---

## 一、地址的唯一事實來源

**謄本（OCR 解析結果）是地址的唯一事實來源。**

地址不再由人工填寫，而是在上傳謄本並完成 OCR 解析後，由系統自動寫入主表。

### 物件類型與地址顯示規則

| 物件類型 | 謄本 | 地址來源 | 顯示方式 |
|----------|------|---------|---------|
| 有建築物的物件 | 建物謄本 + 土地謄本 | 建物謄本 `建物門牌` 欄位 | 標準門牌地址 |
| 純土地物件 | 只有土地謄本 | 土地謄本 `地號` 欄位 | 「純土地物件（地號：○○段 第○○地號）」 |
| 尚未上傳謄本 | 無 | — | 「待上傳謄本」 |

### 主表欄位（兩張表結構相同）

物件地址存放在 `property_sales` 與 `property_rentals`：

| 欄位名稱 | 類型 | 說明 | 來源 |
|----------|------|------|------|
| `address_city` | TEXT | 縣市 | 建物謄本 OCR → `parseTaiwanDoorAddress()` |
| `address_district` | TEXT | 區 | 同上 |
| `address_street` | TEXT | 路段 | 同上 |
| `address_number` | TEXT | 門牌號碼 | 同上 |
| `address_floor` | TEXT | 樓層 | 同上 |
| `address_unit` | TEXT | 單位號 | 同上 |
| `address` | TEXT | **自動產生**的完整地址 | DB trigger 從上方六欄組合 |
| `is_pure_land` | BOOLEAN | 純土地物件旗標 | 土地謄本 OCR 完成且無建物謄本時設為 `true` |
| `land_number` | TEXT | 土地地號 | 土地謄本 OCR → `description.landNumber` |

> ⚠️ `address` 欄位由 DB trigger 自動維護，**不要手動寫入或拿來當 SSOT 使用**。

---

## 二、地址同步流程（OCR → 主表）

```
上傳謄本
  └─ OCR 解析完成（consensus-parse.ts）
       ├─ 建物謄本（building_registry_transcript）
       │    └─ parsed_result.description.doorAddress
       │         → parseTaiwanDoorAddress()
       │         → 寫入 address_city / address_district / ... 六個欄位
       │         → is_pure_land = false
       │         → DB trigger 自動更新 address 全文欄位
       │
       └─ 土地謄本（land_registry_transcript）
            └─ parsed_result.description.landNumber
                 → 寫入 land_number
                 → 若無建物謄本：is_pure_land = true
```

同步邏輯實作位置：`apps/superadmin/lib/actions/consensus-parse.ts` 的 `syncAddressFromTranscript()`

---

## 三、取得地址的正確方式

### 後端（Server Action / Server Component）

```ts
import { formatStructuredAddress } from '@/lib/types/properties';

// getAllProperties() / getPropertyById() 回傳的 PropertyItem 已包含所有欄位
const label = formatStructuredAddress(property);
// 有建物 → "台北市／信義區／敦南路／295號／3F"
// 純土地 → property.isPureLand === true，顯示 property.landNumber

// 判斷物件類型
if (property.isPureLand) {
  // 顯示地號
  console.log(property.landNumber); // e.g. "大安區○○段 第0345地號"
} else {
  // 顯示門牌地址
  console.log(formatStructuredAddress(property));
}
```

### 前端（顯示用）

`PropertyItem` 的相關欄位：

```ts
property.addressCity      // 縣市（建物物件）
property.addressDistrict  // 區
property.addressStreet    // 路段
property.addressNumber    // 門牌
property.addressFloor     // 樓層
property.addressUnit      // 單位號
property.address          // DB 自動組合的完整字串
property.isPureLand       // 是否為純土地物件
property.landNumber       // 土地地號（純土地物件）
```

### 資料庫查詢（原生 SQL）

```sql
-- 建物物件：讀結構化欄位
SELECT address_city, address_district, address_street,
       address_number, address_floor, address_unit, address
FROM property_sales
WHERE id = $1 AND is_pure_land = false;

-- 純土地物件：讀地號
SELECT land_number
FROM property_sales
WHERE id = $1 AND is_pure_land = true;

-- 篩選特定縣市（建物物件）
SELECT * FROM property_sales
WHERE address_city = '台北市' AND is_pure_land = false;
```

---

## 四、寫入地址的正確方式

### 正常流程（謄本驅動，不需手動操作）

1. 建立物件（`createProperty`）— 不填地址
2. 上傳謄本 → OCR 完成 → `syncAddressFromTranscript` 自動寫入

### 資料修復用（直接 SQL）

只更新結構化欄位，trigger 會自動同步 `address`：

```sql
-- 修正建物物件地址
UPDATE property_sales
SET address_city     = '台北市',
    address_district = '信義區',
    address_street   = '敦南路',
    address_number   = '295號'
WHERE id = '...';
-- address 欄位自動更新

-- 修正純土地物件地號
UPDATE property_sales
SET is_pure_land = true,
    land_number  = '大安區○○段 第0345地號'
WHERE id = '...';
```

---

## 五、不要做的事

| ❌ 錯誤做法 | 原因 |
|-------------|------|
| 新增物件時手動填寫地址 | 地址來自謄本，人工輸入會被 OCR 同步覆蓋 |
| 讀 `details->>'addressCity'` | 此鍵值已從 JSONB 清除（migration 20260316100100） |
| 手動拼接後寫入 `address` 欄位 | `address` 由 trigger 維護，手寫會被下次 UPDATE 覆蓋 |
| 忽略 `isPureLand` 直接顯示 `formatStructuredAddress` | 純土地物件地址欄位為空，應改顯示地號 |
| 在應用層同步地址一致性 | DB trigger + `syncAddressFromTranscript` 已負責，不需重複 |

---

## 六、謄本（OCR）與地址的對應關係

### 建物謄本 → 門牌地址

| 謄本欄位 | TypeScript | DB 欄位 |
|----------|-----------|---------|
| `建物標示部['建物門牌']`（或 `building_description.door_number`） | `description.doorAddress` | → `parseTaiwanDoorAddress()` → `address_*` |

### 土地謄本 → 地號

| 謄本欄位 | TypeScript | DB 欄位 |
|----------|-----------|---------|
| `土地標示部['地號']`（或 `meta.land_number`） | `description.landNumber` | `land_number` |

地址解析工具：`apps/superadmin/lib/utils/taiwan-address-parser.ts`
- `parseTaiwanDoorAddress(full)` → 回傳 `{ city, district, street, number, floor, unit }`

---

## 七、地址欄位演進歷史（給需要了解背景的人）

| 時間 | 變更 | 說明 |
|------|------|------|
| 2026-01-22 | `full_schema.sql` | 建立 `address` 全文欄位 |
| 2026-02-28 | `property_title_and_structured_address.sql` | 新增六個結構化欄位；舊資料同時寫 `details` JSONB |
| 2026-03-16 | `sync_address_trigger.sql` | DB trigger 自動維護 `address`；backfill 現有資料 |
| 2026-03-16 | `cleanup_address_from_details_jsonb.sql` | 清除 `details` JSONB 裡的舊 address 鍵值 |
| 2026-03-16 | `properties.ts`（應用層） | 移除 JSONB fallback 讀取；停止雙寫 |
| 2026-03-16 | `add_is_pure_land_and_land_number.sql` | 新增 `is_pure_land` + `land_number` 欄位 |
| 2026-03-16 | `consensus-parse.ts`（應用層） | OCR 完成後自動 sync 地址到主表（`syncAddressFromTranscript`） |
| 2026-03-16 | `PropertyCreateModal.tsx` | 移除地址輸入欄位；地址改由謄本 OCR 填入 |
| 2026-03-16 | `taiwan-address-parser.ts` | 補上 `city` / `district` capture |

---

## 八、相關檔案位置

| 用途 | 路徑 |
|------|------|
| TypeScript 型別 + `formatStructuredAddress` | `apps/superadmin/lib/types/properties.ts` |
| Server Actions（讀寫物件） | `apps/superadmin/lib/actions/properties.ts` |
| OCR 完成後地址同步 | `apps/superadmin/lib/actions/consensus-parse.ts`（`syncAddressFromTranscript`） |
| 門牌地址解析工具 | `apps/superadmin/lib/utils/taiwan-address-parser.ts` |
| DB Trigger | `supabase/migrations/20260316100000_sync_address_trigger.sql` |
| is_pure_land + land_number | `supabase/migrations/20260316110000_add_is_pure_land_and_land_number.sql` |
