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

`@/` 依 app 而異。完整對照：`.claude/rules/backend/supabase.md`。

- **superadmin**：RLS → `createClient` from `@/utils/supabase/server` / `client`；後台繞過 RLS → `createAdminClient` from `@/utils/supabase/admin`。
- **web-au**：`createClient` from `@/utils/supabase/server` / `client`。
- **web**：RLS 常見 `@/lib/supabase/server` 與 `@/lib/supabase/client`，與 `@/utils/supabase/*` 並存；`createAdminClient` 用 `@/utils/supabase/admin`；新檔與鄰近檔案一致。
- **mobile**：`@supabase/supabase-js`；勿內嵌 service_role。

## ⚠️ 已知陷阱

- `supabase migration up` 若報「inserted before last migration」→ 加 `--include-all`。若舊 migration 有 policy 衝突，改用 `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` 直接執行 SQL，再手動 INSERT 進 `supabase_migrations.schema_migrations`。
- Storage bucket `property-documents` 是 private，取用需透過 signed URL；Superadmin 操作一律用 `createAdminClient`。
- Badge variants 有效值：`'default' | 'success' | 'warning' | 'error' | 'info'`。不要使用 `'danger'`。
- 色彩用 CSS token，例如 `text-text-primary`、`bg-bg-secondary`、`border-border-default`、`text-accent`；不要直接使用 Tailwind 色名。

## 進度更新

完成工作後，更新 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列。完整規則見 `docs/update-project-progress-guide.md`。

也可使用 Custom Command：`/daily-report`（自動產生報告 + 更新 roadmap + 判斷是否建 VIS issue）。

## Paperclip VIS 派工

使用 `/dispatch-agents` Skill 從 roadmap 挑選 feature 並指派給 Paperclip agent。

**關鍵規則**：
- 建立 issue **必須**透過 `POST localhost:3001/api/paperclip/issues`（superadmin API），不可直接打 Paperclip API（缺 worktree 會導致 agent 失敗）
- Title 格式必須含 `[Row XXX]`，如 `[Row 031] 房東的客戶 Grid模式`
- 切換 adapter 時**必須同時更新 `adapterConfig.model`**

**Adapter / Model 對照**：

| Adapter | model 值 | 帳單 | CLI |
|---------|---------|------|-----|
| `claude_local` | `sonnet` | Anthropic | `claude` |
| `codex_local` | `gpt-5.3-codex` | OpenAI | `codex` |
| `opencode_local` | `google/gemini-2.5-flash` | Google | `opencode` |
| `cursor` | `auto` | Cursor | `agent` |

完整流程與 troubleshooting 見 `.claude/skills/dispatch-agents/SKILL.md`。

## 省 Token 與工具使用

完整指南見 `docs/operational-guides/token-saving-guide.md`，以下為摘要：

**Custom Commands（最省）**：`/daily-report`、`/commit-push-pr`、`/roadmap-update`、`/test-coverage`、`/dispatch-agents`

**瀏覽器工具優先序**：專用 MCP → Claude Preview → Playwright CLI → Playwright MCP → Chrome DevTools → Computer Use

- Playwright CLI（`bash tools/testing/playwright-cli.sh <cmd>`）批次執行，比 Playwright MCP 逐步 snapshot 省 3-5x token
- 查 library 文件用 Context7 MCP，不用 Web Search
- 讀檔用 `Read offset/limit` 指定範圍，搜尋用 `Grep`，找檔用 `Glob`

## 測試腳本與工具放置

- `testScriptPath` 只能填 ID 專屬測試目錄：`apps/superadmin/unit_test/{ID}`。
- ID 專屬 E2E 測試放在：`apps/superadmin/e2e/{ID}/`。
- 跨功能共用 E2E（不綁定單一 ID）放在：`apps/superadmin/e2e/common/`，不要散落在 `e2e` 根層。
- `e2e/common` 需再分層為：`e2e/common/smoke`（快速）與 `e2e/common/regression`（完整）。
- 跨 ID 可重用腳本放在：`tools/<domain>/`；不要把 `tools/...` 當成 `testScriptPath`。
- 當某 ID 依賴 `tools/...`，需在 `apps/superadmin/unit_test/{ID}/README.md` 記錄呼叫方式。
- 機器可讀測試編排來源：`apps/superadmin/test-manifest.json`。
- `test-manifest.json` 中 `tier=nightly` 的條目必填 `nightlyLayer`（`smoke` / `regression`）。
- `test-manifest.json` 中 `tier=nightly` 的條目必填 `nightlyOrder`（非負整數，數字越小越先跑）。
- 合併前至少執行一次：`tools/testing/validate-test-manifest.sh`。

## 角色目錄

原本給人類查閱的角色目錄已移到 `docs/prompts/agent_roles_index.md`，避免與本檔用途混淆。

## 維護規則

若 `CLAUDE.md` 與本檔規則不一致，以「較精簡且較不易誤導模型」的版本為準，並盡快對齊兩份文件。
