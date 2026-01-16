---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/**/*.toml'
  - 'backend/**/*.ts'
  - '**/lib/supabase.ts'
---

# Supabase/PostgreSQL 後端開發規則

> 此規則僅在編輯 `supabase/` 或後端相關檔案時自動載入

---

## 本地開發環境

| 服務            | URL                    | 用途             |
| :-------------- | :--------------------- | :--------------- |
| API Gateway     | http://localhost:54321 | REST/GraphQL API |
| Supabase Studio | http://localhost:54323 | 資料庫管理 UI    |
| Inbucket        | http://localhost:54324 | 本地郵件測試     |

---

## 資料庫命名規範

### 表與欄位

| 類型   | 規則       | 範例                                 |
| :----- | :--------- | :----------------------------------- |
| 表名   | snake_case | `property_listings`, `user_profiles` |
| 欄位   | snake_case | `created_at`, `user_id`              |
| 主鍵   | `id`       | UUID 型別                            |
| 外鍵   | `xxx_id`   | `user_id`, `property_id`             |
| 時間戳 | `xxx_at`   | `created_at`, `updated_at`           |

### 索引與約束

| 類型     | 命名格式                    | 範例                     |
| :------- | :-------------------------- | :----------------------- |
| 索引     | `idx_tablename_columnname`  | `idx_properties_user_id` |
| 唯一約束 | `uniq_tablename_columnname` | `uniq_users_email`       |
| 外鍵約束 | `fk_tablename_reference`    | `fk_properties_user`     |

---

## Migration 檔案

### 命名格式

```
YYYYMMDDHHMMSS_description.sql
```

範例：`20260115120000_add_property_status.sql`

### Migration 結構範例

```sql
-- 20260115120000_add_property_status.sql

-- 新增欄位
ALTER TABLE properties
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived'));

-- 新增索引
CREATE INDEX idx_properties_status ON properties(status);

-- 更新 RLS 政策（如需要）
-- ...
```

---

## Row Level Security (RLS)

### 基本原則

- ✅ 所有表都必須啟用 RLS
- ✅ 使用 `auth.uid()` 進行用戶隔離
- ✅ 為每種操作（SELECT/INSERT/UPDATE/DELETE）建立政策

### RLS 政策範例

```sql
-- 啟用 RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- SELECT 政策：用戶只能查看自己的物件
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
USING (auth.uid() = user_id);

-- INSERT 政策：用戶只能新增自己的物件
CREATE POLICY "Users can insert own properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE 政策：用戶只能更新自己的物件
CREATE POLICY "Users can update own properties"
ON properties FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE 政策：用戶只能刪除自己的物件
CREATE POLICY "Users can delete own properties"
ON properties FOR DELETE
USING (auth.uid() = user_id);
```

---

## 核心表結構

### properties（物件資料）

| 欄位       | 型別        | 說明              |
| :--------- | :---------- | :---------------- |
| id         | UUID        | 主鍵              |
| user_id    | UUID        | 外鍵 → auth.users |
| title      | TEXT        | 物件標題          |
| address    | TEXT        | 地址              |
| rent_price | NUMERIC     | 租金              |
| status     | TEXT        | 狀態              |
| created_at | TIMESTAMPTZ | 建立時間          |
| updated_at | TIMESTAMPTZ | 更新時間          |

### photos（物件照片）

| 欄位          | 型別 | 說明              |
| :------------ | :--- | :---------------- |
| id            | UUID | 主鍵              |
| property_id   | UUID | 外鍵 → properties |
| storage_path  | TEXT | Storage 路徑      |
| display_order | INT  | 顯示順序          |

---

## Supabase SDK 使用

### 初始化

```typescript
// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 查詢範例

```typescript
// 查詢用戶物件
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// 新增物件
const { data, error } = await supabase
  .from('properties')
  .insert({ title, address, rent_price })
  .select()
  .single();
```

---

## 常用指令

```bash
# 啟動/停止 Supabase
supabase start
supabase stop

# 資料庫操作
supabase db reset       # 重置（清除所有資料）
supabase db diff        # 查看 schema 變更
supabase db push        # 推送 migration

# 型別生成
supabase gen types typescript --local > frontend/src/types/database.ts
```

---

## Context7 查詢指引

當需要 Supabase/PostgreSQL 相關文檔時，使用以下指令：

| 需求             | 指令                             |
| :--------------- | :------------------------------- |
| Supabase SDK API | `use library /supabase/supabase` |
| PostgreSQL 語法  | `use library /postgres/postgres` |
| RLS 設計模式     | `use library /supabase/supabase` |

### 常見查詢範例

```
# 查詢 Supabase 認證 API
Supabase auth signInWithPassword use library /supabase/supabase

# 查詢 PostgreSQL JSON 操作
PostgreSQL JSONB operators use library /postgres/postgres

# 查詢 Storage API
Supabase Storage upload file use context7
```

⚠️ **重要提醒**：Supabase API 更新頻繁，務必使用 Context7 查詢最新用法！
