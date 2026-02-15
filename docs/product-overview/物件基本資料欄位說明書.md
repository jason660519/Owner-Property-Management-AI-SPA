# 物件基本資料欄位說明書

> **創建日期**: 2026-02-03  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-02-03  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 技術文件

---

本文件定義 **Owner Real Estate Agent SaaS** 中「物件基本資料」至少應具備的欄位、資料型別、必填/選填規則，以及與資料庫、前端的對應關係。供房東填寫、前端表單、API 與資料庫設計共同遵守。

---

## 1. 欄位總覽

物件基本資料欄位**至少**應包含以下項目，並依「必填／選填」與「出售／出租」情境區分。

| 分類     | 欄位名稱（中文） | 欄位名稱（英文／DB） | 必填 | 出售 | 出租 | 型別／備註 |
|----------|------------------|----------------------|------|------|------|------------|
| 識別與類型 | 標題 | title | ✓ | ✓ | ✓ | 字串，至少 5 字元 |
| 識別與類型 | 地址 | address | ✓ | ✓ | ✓ | 字串，至少 5 字元 |
| 識別與類型 | 物件類型 | type | ✓ | ✓ | ✓ | 枚舉：`sale` \| `rental` |
| 價格     | 售價 | price | ✓（出售時） | ✓ | — | 數值，≥ 0，單位：新台幣 |
| 價格     | 月租金 | monthly_rent | ✓（出租時） | — | ✓ | 數值，≥ 0，單位：新台幣/月 |
| 狀態     | 狀態 | status | ✓ | ✓ | ✓ | 見下方狀態枚舉 |
| 面積     | 主建物面積 | main_area_sqm / area | ✓ | ✓ | ✓ | 數值（m²），≥ 0；可換算坪數 |
| 面積     | 附屬建物面積 | auxiliary_area_sqm | 選填 | ✓ | ✓ | 數值（m²） |
| 面積     | 公設面積 | common_area_sqm | 選填 | ✓ | ✓ | 數值（m²） |
| 格局     | 房數 | bedrooms | 選填 | ✓ | ✓ | 非負整數 |
| 格局     | 衛浴數 | bathrooms | 選填 | ✓ | ✓ | 非負整數 |
| 樓層     | 所在樓層 | floor | 選填 | ✓ | ✓ | 非負整數 |
| 樓層     | 總樓層數 | total_floors | 選填 | ✓ | ✓ | 非負整數 |
| 權狀     | 所有權人姓名 | owner_name | ✓ | ✓ | ✓ | 字串，至少 2 字元 |
| 權狀     | 所有權人聯絡方式 | owner_contact | 選填 | ✓ | ✓ | 字串 |
| 權狀     | 建號 | building_number | 選填 | ✓ | ✓ | 字串 |
| 權狀     | 地號 | land_number | 選填 | ✓ | ✓ | 字串 |
| 說明     | 描述 | description | 選填 | ✓ | ✓ | 字串，自由文字 |
| 出租專用 | 租期（月） | lease_term | 選填 | — | ✓ | 整數，預設 12 |
| 媒體     | 主圖 URL | imageUrl | 選填 | ✓ | ✓ | 字串（URL 或 path） |
| 媒體     | 照片列表 | images | 選填 | ✓ | ✓ | 字串陣列 |
| 系統     | 物件 ID | id | 系統 | ✓ | ✓ | UUID |
| 系統     | 擁有者 ID | owner_id | 系統 | ✓ | ✓ | UUID，對應 users_profile |
| 系統     | 建立時間 | created_at | 系統 | ✓ | ✓ | TIMESTAMPTZ |

---

## 2. 必填欄位（至少要有）

以下為建立一筆「物件基本資料」時**至少必須提供**的欄位：

1. **標題 (title)**：物件顯示名稱，至少 5 個字元。  
2. **地址 (address)**：完整門牌地址（建議含樓層），至少 5 個字元，供合約與看房使用。  
3. **物件類型 (type)**：`sale`（出售）或 `rental`（出租）。  
4. **價格**：  
   - 出售：**售價 (price)**，數值 ≥ 0。  
   - 出租：**月租金 (monthly_rent)**，數值 ≥ 0。  
5. **主建物面積 (main_area_sqm / area)**：數值 ≥ 0，單位平方公尺；可依 1 m² = 0.3025 坪換算。  
6. **所有權人姓名 (owner_name)**：至少 2 個字元，供產權與合約辨識。

其餘欄位為選填，依產品與法規需求可再擴充。

---

## 3. 狀態枚舉

- **出售 (Property_Sales)**  
  `status`：`available` \| `pending` \| `sold` \| `archived`
- **出租 (Property_Rentals)**  
  `status`：`vacant` \| `occupied` \| `maintenance` \| `archived`

---

## 4. 與資料庫的對應

- **Property_Sales**：`id`, `owner_id`, `address`, `price`, `status`, `details` (JSONB), `created_at`  
  - 擴充欄位（標題、描述、格局、面積、權狀等）存放於 `details`。
- **Property_Rentals**：`id`, `owner_id`, `address`, `monthly_rent`, `status`, `lease_term`, `details` (JSONB), `created_at`  
  - 同上，擴充欄位存放於 `details`。
- 前端統一透過 **`public.properties`** 查詢與寫入，再由 trigger 分流至 `Property_Sales` 或 `Property_Rentals`。

`details` JSONB 建議至少包含：`title`, `description`, `type`（建物類型，如公寓/套房）, `bedrooms`, `bathrooms`, `area`, `imageUrl`, `images`；權狀與面積明細可依需求放入或另表儲存。

---

## 5. 與房東手冊的對應

本欄位說明書與 [landlord-property-data-manual.md](./landlord-property-data-manual.md) 對齊：

- 物件地址 → **address**  
- 格局（幾房幾廳幾衛幾陽台）→ **bedrooms**, **bathrooms**（廳、陽台可於 **description** 或擴充欄位描述）  
- 坪數／權狀坪數 → **main_area_sqm**, **auxiliary_area_sqm**, **common_area_sqm**（可換算坪數）  
- 租金期望 → **monthly_rent**；押金為業務規則，可於說明或另欄位記錄  
- 樓層／總樓層 → **floor**, **total_floors**  
- 特色描述 → **description**

---

## 6. 版本修訂記錄

| 日期       | 版本 | 修改者          | 修改內容     |
|------------|------|-----------------|--------------|
| 2026-02-03 | 1.0  | Claude Sonnet 4.5 | 初版建立，定義必填／選填欄位與 DB 對應 |
