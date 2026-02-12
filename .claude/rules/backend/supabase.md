---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/**/*.toml'
  - 'apps/web/**/*.ts'
  - 'apps/mobile/**/*.ts'
  - 'packages/**/*.ts'
  - '**/lib/supabase.ts'
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

---

## RLS (Row Level Security)

- 所有表必須啟用 RLS (即使是公開表，也需要 RLS 來限制寫入權限)
- 私有數據：用 `auth.uid()` 進行用戶隔離
- 公開數據：開放 `SELECT` 權限，但嚴格限制 `INSERT`/`UPDATE`/`DELETE`
- 為 SELECT / INSERT / UPDATE / DELETE 分別建立明確政策 (Deny All by default)

---

## SDK 初始化

**Web (Server Component)**：使用 `@supabase/ssr` + `createServerClient` + cookies

**Web (Client Component)**：使用 `@supabase/supabase-js` + `createClient`

**Mobile (Expo)**：使用 `@supabase/supabase-js` + `AsyncStorage` + AppState 自動刷新

---

## 常用指令

```bash
supabase start / stop           # 啟停
supabase db reset               # 重置資料庫
supabase db diff                # 查看 schema 變更
supabase db push                # 推送 migration
supabase gen types typescript --local > packages/types/database.ts  # 型別生成
```
