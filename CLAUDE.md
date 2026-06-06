# CLAUDE.md

本檔只放「每個 session 都該知道、且沒別處可放」的規則。
架構、Supabase client、Next.js 慣例、踩坑細節 → 見 `.claude/rules/`。
進度資料 → `apps/superadmin/app/data/roadmap.ts` 或 `http://localhost:3001/superadmin/dashboard/project-progress`。

## 邊界

**這三件事 commit 時會被擋，別做**：降級 React/Next。引入 `any 。 `background 起 dev server\
**必須先問**：force push、刪 `supabase/migrations/` 任何檔、直接 merge 到 main\
**自主決定**：重構路徑、測試策略、命名細節

## 硬性規定

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，檔名 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄，單檔不超過 500 行
- **新規則優先加到** **`.claude/rules/`**，本檔只放 pointer；細節放 rules/ 按需讀，不塞本檔。定期執行 `/rules-audit` 檢查重複。

## Rules 索引（有疑問先讀）

| 主題                                                                            | 檔案                                              |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| 命名、檔案組織、Git、進度更新                                                              | `.claude/rules/general.md`                      |
| Supabase 客戶端、RLS、已知陷阱                                                         | `.claude/rules/backend/supabase.md`             |
| Next.js / React 慣例、Badge / Sidebar / 設計 token                                 | `.claude/rules/frontend/react-next.md`          |
| 禁止降級的套件（React 19 / Next 16 等）、Node 25 + tsx 運行時陷阱                             | `.claude/rules/critical-deps.md`                |
| AI Adapter 註冊（provider/model prefix、id 命名、豁免清單）                               | `.claude/rules/backend/ai-adapter.md`           |
| Claude Code background shell 漏水點（`/private/tmp/claude-*` 無上限累積、dev server 禁忌） | `.claude/rules/claude-code-background-shell.md` |

## 啟動

```bash
./start.sh                # 互動式選單
./start.sh all            # 全部服務（含 Elasticsearch + Kibana）
./stop.sh                 # 停止
```

## 測試路徑規範

- ID 專屬 unit：`apps/superadmin/unit_test/{ID}`（`testScriptPath` 只填這個）
- ID 專屬 E2E：`apps/superadmin/e2e/{ID}/`
- 跨功能共用 E2E：`apps/superadmin/e2e/common/{smoke,regression}/`
- 跨 ID 可重用腳本：`tools/<domain>/`（不可當 `testScriptPath`）
- 編排來源：`apps/superadmin/test-manifest.json`；`tier=nightly` 必填 `nightlyLayer` / `nightlyOrder`
- 合併前執行：`tools/testing/validate-test-manifest.sh`

