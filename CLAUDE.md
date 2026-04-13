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

- `apps/web`（3000）：Next.js 16 App Router，主站（房東/租客/買家等），含 PWA
- `apps/web-au`（3002）：Next.js 16，澳洲區站
- `apps/superadmin`（3001）：Next.js 16 超級管理員後台
- `apps/mobile`：Expo / React Native
- `backend/`：Python FastAPI OCR 服務（8819）
- `supabase/`：本地 Supabase（**PostgreSQL 17** + Auth + Storage）
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
npm run lint --workspace web-au
npm run lint --workspace superadmin

# Supabase
supabase db reset                                                      # 重置本地資料庫
supabase db diff                                                       # 查看 schema 變更
supabase gen types typescript --local > packages/types/database.ts     # 型別生成
```

## Supabase 客戶端（⚠️ 挑錯 import 會踩 RLS 雷）

`@/` 為**各 app 自己的** path alias。完整分 app 說明：`.claude/rules/backend/supabase.md`。

| App | Server（RLS） | Client（RLS） | 繞過 RLS（僅伺服器、需理由） |
| :-- | :------------ | :------------ | :--------------------------- |
| `apps/superadmin` | `createClient` `@/utils/supabase/server` | `createClient` `@/utils/supabase/client` | `createAdminClient` `@/utils/supabase/admin` |
| `apps/web-au` | `createClient` `@/utils/supabase/server` | `createClient` `@/utils/supabase/client` | — |
| `apps/web` | 多數 `@/lib/supabase/server`，部分 `@/utils/supabase/server` | 多數 `@/lib/supabase/client`，少數 `@/utils/supabase/client` | `createAdminClient` `@/utils/supabase/admin` |
| `apps/mobile` | — | `@supabase/supabase-js`（Expo）；敏感操作用後端 API | 勿在 app 內嵌 service_role |

認證輔助（web / web-au）：`@/lib/supabase/auth`。**新檔請與同目錄鄰近檔案的 import 風格一致。**

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

也可使用 Custom Command：`/daily-report`（自動產生報告 + 更新 roadmap + 判斷是否建 VIS issue）。

## 省 Token 與工具使用

完整指南見 `docs/operational-guides/token-saving-guide.md`，以下為摘要：

**Custom Commands（最省）**：`/daily-report`、`/commit-push-pr`、`/roadmap-update`、`/test-coverage`

**瀏覽器工具優先序**：專用 MCP → Claude Preview → Playwright CLI → Playwright MCP → Chrome DevTools → Computer Use

- Playwright CLI（`bash tools/testing/playwright-cli.sh <cmd>`）批次執行，比 Playwright MCP 逐步 snapshot 省 3-5x token
- 查 library 文件用 Context7 MCP，不用 Web Search
- 讀檔用 `Read offset/limit` 指定範圍，搜尋用 `Grep`，找檔用 `Glob`

## 測試腳本與工具放置規範

- `testScriptPath` 僅指向 ID 專屬測試目錄：`apps/superadmin/unit_test/{ID}`。
- ID 專屬 E2E 放在：`apps/superadmin/e2e/{ID}/`。
- 跨功能共用 E2E（不綁定單一 ID）放在：`apps/superadmin/e2e/common/`，不要散落在 `e2e` 根層。
- `e2e/common` 需再分層為：`e2e/common/smoke`（快速）與 `e2e/common/regression`（完整）。
- 跨 ID 可重用腳本一律放在：`tools/<domain>/`（例如 `tools/people-db/`）。
- 若某 ID 會使用 `tools/...`，請在對應 `apps/superadmin/unit_test/{ID}/README.md` 註明呼叫方式。
- 不要把 `tools/...` 路徑填到 `testScriptPath`。
- 測試編排採機器可讀清單：`apps/superadmin/test-manifest.json`。
- `test-manifest.json` 中 `tier=nightly` 的條目必填 `nightlyLayer`（`smoke` / `regression`）。
- `test-manifest.json` 中 `tier=nightly` 的條目必填 `nightlyOrder`（非負整數，數字越小越先跑）。
- 合併前先跑：`tools/testing/validate-test-manifest.sh`。

## 角色目錄

給人類查閱的角色 Prompt 目錄在 `docs/prompts/agent_roles_index.md`，不要與本檔混用。

## 維護規則

若本檔與 `AGENTS.md` 規則不一致，以「較精簡且較不易誤導模型」的版本為準，並盡快對齊兩份文件。
