---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/**/*.toml'
  - 'apps/web/**/*.ts'
  - 'apps/web/**/*.tsx'
  - 'apps/web-au/**/*.ts'
  - 'apps/web-au/**/*.tsx'
  - 'apps/superadmin/**/*.ts'
  - 'apps/superadmin/**/*.tsx'
  - 'apps/mobile/**/*.ts'
  - 'apps/mobile/**/*.tsx'
  - 'packages/**/*.ts'
  - '**/utils/supabase/**'
  - '**/lib/supabase/**'
---

# Supabase / PostgreSQL 後端規則

---

## 本地服務

| 服務            | URL                    |
| :-------------- | :--------------------- |
| API Gateway     | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Inbucket (郵件) | http://localhost:54324 |

本地資料庫為 **PostgreSQL 17**（見 `supabase/config.toml` 的 `major_version`）。

---

## 命名規範

- 表名/欄位：`snake_case`
- 主鍵：`id` (UUID)
- 外鍵：`xxx_id`
- 時間戳：`xxx_at`
- Migration：`YYYYMMDDHHMMSS_description.sql`

## ⚠️ SQL 檔案管理

- `*.sql` 檔案**僅允許**存在於 `supabase/migrations/`
- **禁止**在 `apps/`、`packages/` 或其他目錄新增可追蹤的 schema `.sql`（臨時查詢用 Dashboard SQL Editor，勿 commit）
- Schema dump：不要 commit，改用 migration

---

## RLS (Row Level Security)

- 所有表必須啟用 RLS（即使是公開表，也需要 RLS 來限制寫入權限）
- 私有數據：用 `auth.uid()` 進行用戶隔離
- 公開數據：開放 `SELECT` 權限，但嚴格限制 `INSERT`/`UPDATE`/`DELETE`
- 為 SELECT / INSERT / UPDATE / DELETE 分別建立明確政策（Deny All by default）

---

## SDK 初始化（⚠️ 依 app 選路徑）

`@/` 為**各 app 自己的** TypeScript path（`apps/web`、`apps/superadmin`、`apps/web-au` 各自獨立）。

### `apps/superadmin`

| 情境 | Import |
| :--- | :--- |
| Server Component / Server Action / Route Handler（使用者身分，遵守 RLS） | `import { createClient } from '@/utils/supabase/server'` |
| Client Component | `import { createClient } from '@/utils/supabase/client'` |
| 後台管理（service_role，繞過 RLS） | `import { createAdminClient } from '@/utils/supabase/admin'` |

### `apps/web-au`

| 情境 | Import |
| :--- | :--- |
| Server | `import { createClient } from '@/utils/supabase/server'` |
| Client | `import { createClient } from '@/utils/supabase/client'` |
| 認證輔助（OAuth 等） | `import { … } from '@/lib/supabase/auth'`（與主站相同模式） |

### `apps/web`（`lib` 與 `utils` 並存）

主站同時存在兩套 SSR 路徑，**新檔請與同資料夾鄰近檔案保持一致**。

| 情境 | Import |
| :--- | :--- |
| Server（RLS）— 常見 | `import { createClient } from '@/lib/supabase/server'` |
| Server（RLS）— 部分頁面 / 測試 | `import { createClient } from '@/utils/supabase/server'` |
| Client（RLS）— 常見 | `import { createClient } from '@/lib/supabase/client'` |
| Client — 少數模組 | `import { createClient } from '@/utils/supabase/client'` |
| Service role（繞過 RLS，僅限伺服器端且需有理由） | `import { createAdminClient } from '@/utils/supabase/admin'` |
| 認證輔助 | `import { … } from '@/lib/supabase/auth'` |

### `apps/mobile`（Expo）

使用 `@supabase/supabase-js` 於客戶端；**沒有** Next.js 的 `cookies()` 整合。敏感操作應走後端 API，勿在 app 內嵌 service_role。

---

## 常用指令

```bash
supabase start / stop                                                        # 啟停
supabase db reset                                                            # 重置資料庫
supabase db diff                                                             # 查看 schema 變更
supabase db push                                                             # 推送 migration
supabase gen types typescript --local > packages/types/database.ts          # 型別生成
```

`supabase migration` 若報「inserted before last migration」→ 加 `--include-all`；舊 migration policy 衝突時的處理見根目錄 `CLAUDE.md`。
