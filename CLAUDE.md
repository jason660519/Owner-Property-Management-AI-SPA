# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monorepo — 主要開發 `apps/web/`（Port 3000）與 `apps/superadmin/`（Port 3001）。

詳細規則在 `.claude/rules/`，有疑問先讀那裡，不要猜。

## 規則檔案索引

| 用途                                      | 路徑                                                           |
| :---------------------------------------- | :------------------------------------------------------------- |
| 通用規則（命名、Git、檔案組織、進度更新） | `.claude/rules/general.md`                                   |
| 前端規則（Next.js、React、Tailwind）      | `.claude/rules/frontend/react-next.md`                       |
| 後端規則（Supabase、RLS、Migration）      | `.claude/rules/backend/supabase.md`                          |
| 專案記憶（/memory 用、架構與功能摘要）    | `.claude/memory/`（MEMORY.md、architecture.md、features.md） |
| 檔案命名詳細規範                          | `docs/file-naming-guidelines.md`                             |
| 專案進度儀表板更新                        | `docs/update-project-progress-guide.md`                      |
| UI/UX 設計規範                            | `docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md`          |

## 硬性規定

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，格式 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄，單檔不超過 500 行

## 啟動專案開發環境

```bash
# 先開 Docker Desktop，再執行：
./start.sh
```

## 常用指令

```bash
# 個別啟動
npm run dev:web           # apps/web  port 3000
npm run dev:superadmin    # apps/superadmin  port 3001

# 測試（在對應 app 目錄下執行）
npm test                            # 全部 unit tests
npm run test:watch                  # watch mode
npm run test:coverage               # coverage report
npx jest path/to/file.test.tsx      # 單一測試檔
npx jest -t "test name"             # 依名稱篩選

# E2E（apps/web）
npm run test:e2e                    # headless
npm run test:e2e:ui                 # Playwright UI
npm run test:e2e:debug              # debug mode

# Supabase
npx supabase start / stop
npx supabase db reset               # 重置並重跑所有 migrations
npx supabase db diff                # 查 schema 變更
npx supabase migration up           # 套用 pending migrations
npx supabase gen types typescript --local > packages/types/database.ts

# Lint / Format
npm run lint                        # 所有 workspace
npm run format                      # prettier
```

> ⚠️ `supabase migration up` 若遇到「inserted before last migration」錯誤，需加 `--include-all`。若舊 migration 有 policy 衝突，改用 `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` 直接執行 SQL，再手動 INSERT 進 `supabase_migrations.schema_migrations`。

## 架構概覽

### Monorepo 結構

```
apps/
  web/          Next.js 15 App Router — 房東/租客/買家前台（port 3000）
  superadmin/   Next.js 15 App Router — 超級管理員後台（port 3001）
packages/
  shared-types/ 跨 app 共用 TypeScript 型別（@repo/shared-types）
  ui/           共用 UI 元件庫
  utils/        共用工具函式
  tsconfig/     共用 tsconfig
supabase/
  migrations/   所有 DB schema 變更（唯一合法的 .sql 存放位置）
  config.toml   本地服務設定
```

### apps/web 路由結構

- `(auth)/` — 登入/註冊/密碼重置
- `(dashboard)/` — 需登入的通用後台
- `landlord/` — 房東功能（受 middleware role guard 保護）
- `tenant/` / `buyer/` — 租客/買家（各有 potential、contracted 子路由）
- `agent/` — 仲介功能
- `service-provider/` — 服務提供者/廠商（role: `service_provider` 或 `vendor`）
- `portal/` — 任何已登入用戶皆可存取
- `onboarding/` — 新用戶角色設定流程

**Middleware（`apps/web/middleware.ts`）**：依 `ROUTE_ROLE_GUARDS` 表格做角色驗證，`super_admin` 繞過所有 guard。**角色模擬（Role Simulation）**：super_admin 可透過 `x-simulation-role` cookie 以其他角色身份瀏覽，middleware 會驗證真實角色為 super_admin 後才允許模擬，防止 cookie 偽造提權。

### apps/superadmin 路由結構

所有頁面在 `/superadmin/` 前綴下（`apps/superadmin/app/superadmin/`）：

- `dashboard/` — 主控台（行為監控、IAM、LLM monitor、storage、Supabase 管理等）
- `properties/` — 物件管理（sale + rental，含照片/文件上傳、AI 謄本解析、廣告文案生成）
- `settings/api_key_and_model_setting/` — AI provider API key 管理與模型評測（ModelEvaluator）
- `users/`, `groups/`, `roles/` — 使用者與權限管理
- `logs/`, `verifications/`, `leases/` — 日誌、驗證、租約

**Superadmin AI 功能管線**（`apps/superadmin/lib/`）：

- `lib/actions/propertyAI.ts` — AI 謄本解析（VLM OCR → transcript → structured form）
- `lib/actions/cadastral-maps.ts` / `lib/utils/cadastral-map-fetcher.ts` — 地籍圖自動抓取
- `lib/actions/lvr-sync.ts` / `lib/utils/lvr-open-data.ts` — 實價登錄資料同步
- `lib/utils/property-advertisement-readiness.ts` — 廣告刊登前置檢查
- `lib/hooks/useAISettings.ts` — AI 設定（API key + 模型）的 hook，供設定頁使用

**Middleware（`apps/superadmin/middleware.ts`）**：先做 IP 黑名單檢查（`check_superadmin_blacklist` RPC），再驗證 `super_admin` 角色（來自 IAM `get_user_roles` RPC 或 `user_metadata`）。

### Supabase 客戶端選擇規則

| 情境                                         | Import                                                |
| :------------------------------------------- | :---------------------------------------------------- |
| Server Component / Server Action（遵守 RLS） | `createClient` from `@/utils/supabase/server`     |
| Client Component                             | `createClient` from `@/utils/supabase/client`     |
| Superadmin（繞過 RLS，使用 service_role）    | `createAdminClient` from `@/utils/supabase/admin` |

### Server / Client Component 模式

- 預設 Server Component，只在需要互動時加 `'use client'`
- 純工具函數 → `utils.ts`（可被任何地方 import）
- Server Action → `actions.ts`（`'use server'`，Client Component 只能呼叫，不能當一般函式 import）
- `apps/web` 使用 **React Query**（`lib/react-query/queryClient.ts`）做客戶端資料快取，新增 Client Component 的資料擷取優先考慮 React Query。

### 測試架構

- **Unit tests**：Jest + Testing Library，測試檔放在 `__tests__/` 子目錄（colocated），以 `.test.tsx` 命名
- **E2E tests**：Playwright，放在 `apps/web/e2e/flows/{module}/`，以 `.spec.ts` 命名
- `apps/web/jest.config.js` 排除 `e2e/` 目錄，兩者不會互相干擾

### Storage Buckets

| Bucket                 | 上限  | 存取              | 用途                                       |
| :--------------------- | :---- | :---------------- | :----------------------------------------- |
| `property-photos`    | 10 MB | public            | 物件照片（JPG/PNG/WebP）                   |
| `property-documents` | 20 MB | **private** | 謄本/建物權狀/土地權狀（PDF/JPG/PNG/WebP） |

`property-documents` 已於 migration `20260308140000` 改為 private，取用需透過 signed URL。Superadmin 操作一律使用 `createAdminClient`（service_role）。

### UI 慣例

- Badge variants 有效值：`'default' | 'success' | 'warning' | 'error' | 'info'`（`'danger'` 不存在）
- Superadmin Sidebar 導覽：`apps/superadmin/components/layout/Sidebar.tsx` 的 `navItems` 陣列
- 色彩變數以 CSS token 形式（`text-text-primary`、`bg-bg-secondary`、`border-border-default`、`text-accent` 等）定義，非直接使用 Tailwind 顏色

### 進度更新

每次完成工作後，更新 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列。完整說明見 `docs/update-project-progress-guide.md`。
