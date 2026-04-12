# People DB × Kibana 檢查清單

適用對象：在本地或測試環境維護 `people_database` 索引的開發者。  
目標：用最短路徑確認「匯入成功、可搜尋、mapping 正確、分詞正常」。

---

## 0) 先確認服務有起來

- Elasticsearch: `http://127.0.0.1:9200`
- Kibana: `http://127.0.0.1:5601`

快速健康檢查：

```bash
curl "http://127.0.0.1:9200/_cluster/health?pretty"
curl "http://127.0.0.1:9200/_cat/plugins?v"
```

預期：

- `status` 至少為 `yellow`（單機通常可到 `green`）
- plugin 列表含 `analysis-ik` 與 `analysis-stconvert`

---

## 1) 檢查 people_database 是否存在

在 Kibana Dev Tools 執行：

```json
GET _cat/indices/people_database?v
```

預期：

- 能看到 `people_database` 一列
- `docs.count` 在匯入後有增加

---

## 2) 檢查 mapping 是否符合 People DB 設計

```json
GET people_database/_mapping
```

重點欄位快速確認：

- `name`: `text` + `keyword` 子欄位
- `id_number`: `keyword`
- `phone`: `keyword`
- `address`: `text`
- `data_source`: `keyword`

---

## 3) 匯入後抽樣一筆文件

```json
GET people_database/_search
{
  "size": 1,
  "sort": [{ "created_at": "desc" }]
}
```

預期：

- `_source` 可看到 `record_id`, `name`, `id_number`, `phone`, `address`, `data_source`
- `created_at` / `updated_at` 欄位存在

---

## 4) 驗證中文分詞與關鍵查詢

以台北市里長樣本語意欄位驗證（姓名、地址、電話）：

```json
GET people_database/_search
{
  "query": {
    "multi_match": {
      "query": "闕貴卿 南港里 研究院路",
      "fields": ["name^2", "address", "organization", "phone"]
    }
  },
  "size": 5
}
```

預期：

- 能命中 1 筆以上相關資料
- `_score` 合理遞減（最相關的在前）

---

## 5) 驗證 keyword 精準查詢（避免誤命中）

```json
GET people_database/_search
{
  "query": {
    "term": {
      "id_number": "A123456789"
    }
  }
}
```

預期：

- 只命中同一 `id_number` 文件
- 不應被模糊分詞影響

---

## 6) 與 UI 行為對照（superadmin）

對照路徑：`/superadmin/settings/people-database`

- 在「搜尋資料」tab 輸入同樣關鍵字
- 確認 UI 結果與 Kibana Dev Tools 的命中趨勢一致
- 若 UI 無命中但 Kibana 有命中，優先檢查 API 參數轉換（query/filter/pagination）

---

## 7) 常見異常排查

- **`Connection Refused` on 9200**
  - ES 未啟動或 port 未綁定
- **有資料但搜尋不到**
  - mapping 類型錯誤（例如把 `id_number` 建成 `text`）
  - 查詢條件被 filter 掉（例如品質分數下限）
- **匯入成功但 docs.count 不變**
  - 只寫入 batch metadata，未完成索引寫入流程
  - index 名稱寫錯（不是 `people_database`）

---

## 建議執行節奏

- 每次調整匯入欄位映射或 search query 後，至少跑第 1~5 步
- 每次發版前，至少跑第 0、1、2、4、6 步

---

## 一鍵 smoke script

已提供對應腳本：

```bash
tools/people-db/check-es.sh
```

常用參數：

```bash
tools/people-db/check-es.sh --es-url "http://127.0.0.1:9200" --index "people_database"
tools/people-db/check-es.sh --id-number "A123456789"
```

若 `people_database` 尚未建立或 `docs.count=0`，可先寫入一筆樣本：

```bash
tools/people-db/seed-es-sample.sh
tools/people-db/check-es.sh
```
