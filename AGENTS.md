# AGENTS.md

This file provides repository instructions for OpenAI-compatible coding agents working in this project.

Keep this file minimal. Only include repo-specific rules, non-obvious constraints, and known failure modes.
Do not duplicate route maps, folder walkthroughs, file inventories, or package scripts here.

詳細規則在 `.claude/rules/`，有疑問先讀那裡，不要猜。

## Core Rules

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，格式 `YYYYMMDDHHMMSS_描述.sql`
- 文檔與臨時檔不要放根目錄，單檔不超過 500 行

## Startup

```bash
# 先開 Docker Desktop，再執行：
./start.sh
```

## ⚠️ Supabase 客戶端

| 情境 | Import |
| :--- | :--- |
| Server Component / Server Action（遵守 RLS） | `createClient` from `@/utils/supabase/server` |
| Client Component | `createClient` from `@/utils/supabase/client` |
| Superadmin（繞過 RLS，使用 service_role） | `createAdminClient` from `@/utils/supabase/admin` |

## ⚠️ 已知陷阱

- `supabase migration up` 若報「inserted before last migration」→ 加 `--include-all`。若舊 migration 有 policy 衝突，改用 `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` 直接執行 SQL，再手動 INSERT 進 `supabase_migrations.schema_migrations`。
- Storage bucket `property-documents` 是 private，取用需透過 signed URL；Superadmin 操作一律用 `createAdminClient`。
- Badge variants 有效值：`'default' | 'success' | 'warning' | 'error' | 'info'`。不要使用 `'danger'`。
- 色彩用 CSS token，例如 `text-text-primary`、`bg-bg-secondary`、`border-border-default`、`text-accent`；不要直接使用 Tailwind 色名。

## 進度更新

完成工作後，更新 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列。完整規則見 `docs/update-project-progress-guide.md`。

## 角色目錄

原本給人類查閱的角色目錄已移到 `docs/Prompt/agent_roles_index.md`，避免與本檔用途混淆。

## 維護規則

若 `CLAUDE.md` 與本檔規則不一致，以「較精簡且較不易誤導模型」的版本為準，並盡快對齊兩份文件。
