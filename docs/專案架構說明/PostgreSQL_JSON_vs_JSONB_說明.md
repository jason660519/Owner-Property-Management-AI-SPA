# PostgreSQL JSON vs JSONB 詳細說明

## 核心差異總結

| 特性 | JSON | JSONB |
|------|------|-------|
| **儲存格式** | 文字格式（保留原始格式） | 二進位格式（解析後儲存） |
| **寫入速度** | 較快（直接儲存） | 較慢（需要解析） |
| **讀取速度** | 較慢（需要解析） | 較快（已解析） |
| **儲存空間** | 較小（保留原始格式） | 較大（二進位格式） |
| **索引支援** | 有限 | 完整支援（GIN 索引） |
| **查詢效能** | 較慢 | 較快 |
| **保留格式** | ✅ 保留空白、鍵順序 | ❌ 不保留空白、鍵順序 |
| **重複鍵** | ✅ 保留最後一個 | ✅ 保留最後一個 |

## 詳細說明

### 1. 儲存方式差異

#### JSON（文字格式）
```sql
-- JSON 以文字形式儲存，保留原始格式
CREATE TABLE example_json (
    id SERIAL PRIMARY KEY,
    data JSON
);

INSERT INTO example_json (data) VALUES 
('{"name": "John", "age": 30}');

-- 儲存時：直接儲存文字，不進行解析
-- 查詢時：每次都需要解析 JSON 文字
```

#### JSONB（二進位格式）
```sql
-- JSONB 以二進位形式儲存，先解析再儲存
CREATE TABLE example_jsonb (
    id SERIAL PRIMARY KEY,
    data JSONB
);

INSERT INTO example_jsonb (data) VALUES 
('{"name": "John", "age": 30}');

-- 儲存時：先解析 JSON，轉換為二進位格式
-- 查詢時：直接使用已解析的資料結構
```

### 2. 格式保留差異

#### JSON - 保留原始格式
```sql
-- 原始輸入
INSERT INTO example_json (data) VALUES 
('{"name": "John",    "age": 30}');

-- 查詢時會保留空白和格式
SELECT data FROM example_json;
-- 結果：{"name": "John",    "age": 30}  （保留空白）
```

#### JSONB - 不保留格式
```sql
-- 原始輸入
INSERT INTO example_jsonb (data) VALUES 
('{"name": "John",    "age": 30}');

-- 查詢時會標準化格式
SELECT data FROM example_jsonb;
-- 結果：{"age": 30, "name": "John"}  （移除空白，鍵順序可能改變）
```

### 3. 鍵順序差異

```sql
-- JSON：保留鍵的順序
INSERT INTO example_json (data) VALUES 
('{"z": 1, "a": 2, "m": 3}');
SELECT data FROM example_json;
-- 結果：{"z": 1, "a": 2, "m": 3}  （保留順序）

-- JSONB：不保證鍵的順序
INSERT INTO example_jsonb (data) VALUES 
('{"z": 1, "a": 2, "m": 3}');
SELECT data FROM example_jsonb;
-- 結果：{"a": 2, "m": 3, "z": 1}  （順序可能改變）
```

### 4. 效能差異

#### 寫入效能
```sql
-- JSON：寫入快（直接儲存文字）
INSERT INTO example_json (data) 
SELECT json_build_object('id', i, 'value', random()) 
FROM generate_series(1, 100000) i;
-- 時間：約 2 秒

-- JSONB：寫入慢（需要解析）
INSERT INTO example_jsonb (data) 
SELECT json_build_object('id', i, 'value', random()) 
FROM generate_series(1, 100000) i;
-- 時間：約 3 秒
```

#### 查詢效能
```sql
-- JSON：查詢慢（每次都要解析）
SELECT * FROM example_json 
WHERE data->>'name' = 'John';
-- 時間：較慢

-- JSONB：查詢快（已解析）
SELECT * FROM example_jsonb 
WHERE data->>'name' = 'John';
-- 時間：較快
```

### 5. 索引支援差異

#### JSON - 索引支援有限
```sql
-- JSON 無法建立有效的 GIN 索引
CREATE INDEX idx_json_data ON example_json USING GIN (data);
-- ⚠️ 警告：JSON 類型的 GIN 索引效果有限
```

#### JSONB - 完整索引支援
```sql
-- JSONB 可以建立高效的 GIN 索引
CREATE INDEX idx_jsonb_data ON example_jsonb USING GIN (data);

-- 查詢效能大幅提升
SELECT * FROM example_jsonb 
WHERE data @> '{"name": "John"}';
-- 使用索引，查詢速度極快
```

### 6. 查詢操作符差異

#### 兩者都支援的操作符
```sql
-- 取得值（文字）
SELECT data->>'name' FROM example_jsonb;  -- 返回文字
SELECT data->'name' FROM example_jsonb;   -- 返回 JSON

-- 路徑查詢
SELECT data->'address'->>'city' FROM example_jsonb;
SELECT data#>>'{address,city}' FROM example_jsonb;
```

#### JSONB 專屬操作符（效能更好）
```sql
-- 包含檢查（使用索引）
SELECT * FROM example_jsonb 
WHERE data @> '{"name": "John"}';  -- 檢查是否包含

-- 鍵存在檢查
SELECT * FROM example_jsonb 
WHERE data ? 'name';  -- 檢查鍵是否存在

-- 多鍵存在檢查
SELECT * FROM example_jsonb 
WHERE data ?& ARRAY['name', 'age'];  -- 所有鍵都存在
SELECT * FROM example_jsonb 
WHERE data ?| ARRAY['name', 'email'];  -- 任一鍵存在
```

## 實際應用範例

### 謄本資料儲存（推薦使用 JSONB）

```sql
-- 建立謄本資料表
CREATE TABLE building_transcripts (
    id SERIAL PRIMARY KEY,
    property_id INTEGER,
    transcript_data JSONB,  -- 使用 JSONB
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入謄本解析結果
INSERT INTO building_transcripts (property_id, transcript_data) VALUES 
(1, '{
    "building_number": "102AF006705",
    "address": "台北市信義區信義路五段7號",
    "district": "信義區",
    "total_area": 45.5,
    "main_purpose": "住家用",
    "ownership": [
        {"owner_name": "張三", "ownership_ratio": "1/1"}
    ],
    "parsing_metadata": {
        "confidence": 0.95,
        "parsed_at": "2024-01-15T10:30:00Z"
    }
}');

-- 建立 GIN 索引以加速查詢
CREATE INDEX idx_transcript_gin ON building_transcripts 
USING GIN (transcript_data);

-- 高效查詢範例
-- 1. 查詢特定區域的物件
SELECT property_id, transcript_data->>'address' as address
FROM building_transcripts
WHERE transcript_data @> '{"district": "信義區"}';

-- 2. 查詢特定坪數範圍
SELECT property_id, 
       (transcript_data->>'total_area')::FLOAT as area
FROM building_transcripts
WHERE (transcript_data->>'total_area')::FLOAT > 40;

-- 3. 查詢特定屋主
SELECT property_id, transcript_data->'ownership'->0->>'owner_name' as owner
FROM building_transcripts
WHERE transcript_data->'ownership'->0->>'owner_name' = '張三';

-- 4. 使用路徑查詢
SELECT property_id,
       transcript_data#>>'{parsing_metadata,confidence}' as confidence
FROM building_transcripts
WHERE (transcript_data#>>'{parsing_metadata,confidence}')::FLOAT > 0.9;
```

### 何時使用 JSON（較少使用）

```sql
-- 使用 JSON 的場景：
-- 1. 需要保留原始格式（如日誌記錄）
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    request_body JSON,  -- 保留原始請求格式
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 寫入頻繁但查詢較少
-- 3. 不需要建立索引
-- 4. 需要保留鍵的順序（極少見）
```

## 效能測試範例

```sql
-- 建立測試表
CREATE TABLE test_json (id SERIAL, data JSON);
CREATE TABLE test_jsonb (id SERIAL, data JSONB);

-- 插入 10 萬筆資料
INSERT INTO test_json (data)
SELECT json_build_object('id', i, 'value', random())
FROM generate_series(1, 100000) i;

INSERT INTO test_jsonb (data)
SELECT json_build_object('id', i, 'value', random())
FROM generate_series(1, 100000) i;

-- 建立索引（僅 JSONB）
CREATE INDEX idx_jsonb ON test_jsonb USING GIN (data);

-- 查詢效能比較
EXPLAIN ANALYZE
SELECT * FROM test_json WHERE data->>'id' = '50000';
-- 結果：Seq Scan，較慢

EXPLAIN ANALYZE
SELECT * FROM test_jsonb WHERE data @> '{"id": 50000}';
-- 結果：Bitmap Index Scan，使用索引，極快
```

## 選擇建議

### 使用 JSONB 的情況（推薦）✅

1. **需要頻繁查詢 JSON 內容**
   - 謄本資料查詢
   - 物件資料篩選
   - 條件查詢

2. **需要建立索引**
   - 需要快速查詢特定欄位
   - 需要全文搜尋

3. **需要高效能查詢**
   - 生成廣告頁面
   - 資料分析

4. **不需要保留原始格式**
   - 資料會被解析後使用
   - 格式標準化無影響

### 使用 JSON 的情況（較少）⚠️

1. **需要保留原始格式**
   - API 日誌記錄
   - 審計追蹤

2. **寫入頻繁但查詢極少**
   - 純粹的資料儲存
   - 不需要查詢內容

3. **需要保留鍵的順序**
   - 特殊業務需求（極少見）

## 專案建議

### 對於謄本 PDF 解析資料

**強烈建議使用 JSONB**，原因：

1. ✅ **需要頻繁查詢**：生成廣告頁面時需要讀取謄本資料
2. ✅ **需要索引支援**：快速查詢特定區域、坪數範圍
3. ✅ **需要高效能**：單筆物件查詢效能要求高
4. ✅ **不需要保留格式**：謄本解析結果是結構化資料，格式不重要

### 實作範例

```sql
-- 推薦的資料表設計
CREATE TABLE building_transcripts (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    transcript_data JSONB NOT NULL,  -- 使用 JSONB
    parsing_confidence FLOAT,
    needs_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引以加速查詢
CREATE INDEX idx_transcript_gin ON building_transcripts 
USING GIN (transcript_data jsonb_path_ops);

-- 建立特定欄位的索引（如需要）
CREATE INDEX idx_transcript_district ON building_transcripts 
((transcript_data->>'district'));

CREATE INDEX idx_transcript_area ON building_transcripts 
(((transcript_data->>'total_area')::FLOAT));
```

## 總結

| 項目 | JSON | JSONB |
|------|------|-------|
| **專案適用性** | ❌ 不適合 | ✅ **強烈推薦** |
| **查詢效能** | 較慢 | 較快 |
| **索引支援** | 有限 | 完整 |
| **儲存空間** | 較小 | 稍大（可接受） |
| **寫入速度** | 較快 | 稍慢（可接受） |

**結論：對於謄本資料儲存，建議使用 JSONB。**
