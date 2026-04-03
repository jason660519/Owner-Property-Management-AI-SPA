# 內政部實價登錄 (LVR) 資料匯入指引

本專案支援自動產出「成交行情 PDF」報表。資料來源為環境變數 `LVR_COMPARABLES_JSON_PATH` 指向的 JSON 檔案。

## 1. 資料格式要求

JSON 檔案應為一個陣列，每個物件代表一筆成交紀錄，格式如下：

```json
[
  {
    "transactionDate": "2026-01-15",
    "totalPriceTwd": 25800000,
    "buildingAreaSqm": 105.5,
    "unitPricePerSqm": 244550,
    "buildingType": "住宅大樓",
    "floor": "8層",
    "addressSnippet": "臺北市大安區忠孝東路四段...",
    "latitude": 25.041234,
    "longitude": 121.551234,
    "city": "臺北市",
    "district": "大安區",
    "village": "仁愛里",
    "landSectionTokens": ["大安區仁愛段二小段"]
  }
]
```

### 欄位說明：
- `transactionDate`: 交易日期 (YYYY-MM-DD)。報表僅篩選最近一年內之資料。
- `totalPriceTwd`: 總價 (新台幣元)。
- `buildingAreaSqm`: 建物面積 (平方公尺)。
- `unitPricePerSqm`: 單價 (新台幣元/平方公尺)。
- `buildingType`: 物件型態 (如：住宅大樓、華廈、公寓)。
- `floor`: 樓層。
- `addressSnippet`: 位置摘要 (供報表顯示，建議去識別化)。
- `latitude` / `longitude`: WGS84 座標 (用於計算「附近成交」之距離)。
- `city` / `district`: 縣市與行政區 (需與物件資料一致)。
- `village`: 村里 (用於「同里成交」報表)。
- `landSectionTokens`: 地段關鍵字陣列 (用於「同街段」地段匹配)。

## 2. 如何匯入資料

1. **取得資料**：至[內政部不動產交易實價查詢服務網](https://lvr.land.moi.gov.tw/download.action)下載開放資料 (CSV 或 XML)。
2. **轉為 JSON**：撰寫簡單腳本或使用工具將 CSV 轉為上述 JSON 格式。
3. **放置檔案**：將產出的 JSON 檔案放在伺服器可讀取的路徑 (例如 `data/lvr-comparables.json`)。
4. **設定環境變數**：在 `.env` 或系統環境變數中設定：
   ```bash
   LVR_COMPARABLES_JSON_PATH=/path/to/your/lvr-comparables.json
   ```

## 3. 注意事項

- **座標補齊**：若物件未設定 WGS84 座標，「附近成交價」報表將無法篩選出結果。
- **里名填寫**：若物件未填寫村里，「同里成交價」報表將無法篩選出結果。
- **地段資訊**：系統會嘗試從物件的「建物謄本」中自動擷取地段資訊，用於「同街段成交價」之篩選。
