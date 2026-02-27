---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/**/*.toml'
  - 'apps/web/**/*.ts'
  - 'apps/superadmin/**/*.ts'
  - 'packages/**/*.ts'
  - '**/lib/supabase.ts'
  - '**/utils/supabase/**'
---

# Supabase/PostgreSQL 後端規則

---

## 本地服務

| 服務            | URL                    |
| :-------------- | :--------------------- |
| API Gateway     | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Inbucket (郵件) | http://localhost:54324 |

---

## 命名規範

- 表名/欄位：`snake_case`
- 主鍵：`id` (UUID)
- 外鍵：`xxx_id`
- 時間戳：`xxx_at`
- Migration：`YYYYMMDDHHMMSS_description.sql`

## ⚠️ SQL 檔案管理

- `*.sql` 檔案**僅允許**存在於 `supabase/migrations/`
- **禁止**在 `supabase/snippets/`、`supabase/queries/`、`apps/` 或任何其他目錄建立 `.sql` 檔
- 臨時查詢 / 診斷腳本：直接在 Supabase Dashboard SQL Editor 執行，不要 commit
- Schema dump：不要 commit，改用 migration

---

## RLS (Row Level Security)

- 所有表必須啟用 RLS（即使是公開表，也需要 RLS 來限制寫入權限）
- 私有數據：用 `auth.uid()` 進行用戶隔離
- 公開數據：開放 `SELECT` 權限，但嚴格限制 `INSERT`/`UPDATE`/`DELETE`
- 為 SELECT / INSERT / UPDATE / DELETE 分別建立明確政策（Deny All by default）

---

## SDK 初始化

**Server Component / Server Action**：`import { createClient } from '@/utils/supabase/server'`（user context，respects RLS）

**Admin 操作（繞過 RLS）**：`import { createAdminClient } from '@/utils/supabase/admin'`

**Client Component**：`import { createClient } from '@/utils/supabase/client'`

---

## 常用指令

```bash
supabase start / stop                                                        # 啟停
supabase db reset                                                            # 重置資料庫
supabase db diff                                                             # 查看 schema 變更
supabase db push                                                             # 推送 migration
supabase gen types typescript --local > packages/types/database.ts          # 型別生成
```
