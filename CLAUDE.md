# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

本檔只保留「模型不易自行推斷」的專案規則與踩坑紀錄。
不要重複路由結構、目錄導覽、檔案清單或 package scripts。

詳細規則在 `.claude/rules/`，有疑問先讀那裡。

## 硬性規定

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，格式 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄，單檔不超過 500 行

## 架構

Monorepo（npm workspaces）：

- `apps/web`（3000）：Next.js 15 App Router，主站（房東/租客/買家），含 PWA
- `apps/superadmin`（3001）：Next.js 15 超級管理員後台
- `backend/`：Python FastAPI OCR 服務（8819）
- `supabase/`：本地 Supabase（PostgreSQL + Auth + Storage）
- `packages/`：共用 types

## 啟動與常用指令

```bash
# 先開 Docker Desktop，再執行：
./start.sh                # 互動式選單
./start.sh all            # 一鍵啟動全部服務

# 測試（需進入各 app 目錄）
cd apps/web && npx jest                          # 全部單元測試
cd apps/web && npx jest path/to/file.test.tsx    # 單一測試檔
cd apps/web && npm run test:e2e                  # E2E (Playwright)
cd apps/superadmin && npx jest

# Lint
npm run lint --workspace web
npm run lint --workspace superadmin

# Supabase
supabase db reset                                                      # 重置本地資料庫
supabase db diff                                                       # 查看 schema 變更
supabase gen types typescript --local > packages/types/database.ts     # 型別生成
```

## Supabase 客戶端（⚠️ 挑錯 import 會踩 RLS 雷）

| 情境                                         | Import                                            |
| :------------------------------------------- | :------------------------------------------------ |
| Server Component / Server Action（遵守 RLS） | `createClient` from `@/utils/supabase/server`     |
| Client Component                             | `createClient` from `@/utils/supabase/client`     |
| Superadmin（繞過 RLS，service_role）         | `createAdminClient` from `@/utils/supabase/admin` |

## Next.js Server vs Client

- 預設 Server Component；僅在需要互動（onClick, useState, useEffect）時加 `'use client'`
- Pure utils 放 `utils.ts`（可任意 import）；Server Actions 放 `actions.ts`（`'use server'`，不可在 Client Component 中當一般函數 import）

## 已知陷阱

- `supabase migration up` 若報「inserted before last migration」→ 加 `--include-all`。若舊 migration 有 policy 衝突，改用 `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` 直接執行 SQL，再手動 INSERT 進 `supabase_migrations.schema_migrations`。
- Storage bucket `property-documents` 是 **private**，取用需透過 signed URL。
- Badge variants 有效值：`'default' | 'success' | 'warning' | 'error' | 'info'`（**無 `'danger'`**）。
- 色彩用 CSS token（`text-text-primary`、`bg-bg-secondary`、`border-border-default`、`text-accent`），不用 Tailwind 直接色名。
- Superadmin 新增頁面：記得在 `apps/superadmin/components/layout/Sidebar.tsx` 的 `navItems` 加入對應路徑與 lucide-react 圖示。

## 進度更新

每次完成工作後，更新 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列。完整說明見 `docs/update-project-progress-guide.md`。

## 角色目錄

給人類查閱的角色 Prompt 目錄在 `docs/Prompt/agent_roles_index.md`，不要與本檔混用。

## 維護規則

若本檔與 `AGENTS.md` 規則不一致，以「較精簡且較不易誤導模型」的版本為準，並盡快對齊兩份文件。
