# Handoff — Row 145 Sprint 7 Step 3+: CI 接入 + 實測 + Batch Re-parse

> **產出時間**：2026/04/20（session 尾端）
> **產出者**：Claude Opus 4.7（與 Jason 對話）
> **接手對象**：下一個 Claude session
> **承接內容**：Sprint 7 Step 2（tsc build pipeline）已 merge (PR #51)，剩 5 個子任務
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt

---

```markdown
# Row 145 Sprint 7 Step 3+ 接手 prompt

## 1. 你的身分與專案慣例

- 你是接手 Row 145（people-db bulk ingestion）Sprint 7 的 Claude 工程師
- 回覆 Jason 用**繁體中文**；所有 code comment 用**英文**
- TypeScript **strict mode**，禁用 `any`（pre-commit hook 會擋）
- 檔案命名：React 組件 PascalCase、Hooks `use*`、工具函式 camelCase、資料夾 kebab-case
- Migration 檔名：`YYYYMMDDHHMMSS_description.sql`，**只能放在** `supabase/migrations/`
- 文檔不要堆在根目錄，單檔不超過 500 行
- 永遠加新 commit 而非 amend 既有 commit；**禁用 `--no-verify`**
- Badge variant 只有 `'default' | 'success' | 'warning' | 'error' | 'info'`（**無 `'danger'`**）
- **superadmin 沒用 TanStack Query** — 用 `useState + fetch`（訓練資料常誤判）
- 進度更新要改 `apps/superadmin/app/data/roadmap.ts`（percentage + lastModifiedDate + developmentProgress）

## 2. 專案位置

```
/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA
```

資料源硬碟：`/Volumes/KLEVV-4T-2/台灣尋人資料庫`（474 GB）

主要 app：`apps/superadmin`（Next.js 16，port 3001）、`apps/web`（3000）、`apps/web-au`（3002）

## 3. ⚠️ 多分支並行雷（上 session 撞到 3 次）

外部 process（疑似另一個 agent 或 local hook）會**自動切分支 + 混進 Jason 自己的 uncommitted 變更**，特別是：
- `.claude/commands/commit-push-pr.md`
- `.claude/commands/handoff.md`

這兩個檔是 Jason 正在寫的 custom commands，**不要動、不要 add 進你的 commit**。

### 防雷原則

1. 動工前必 `git branch --show-current` 驗證當前分支
2. `git add` **只指定檔案路徑**，不用 `git add .` 或 `git add -A`
3. Commit 後立刻 push，不要放 unstaged 超過幾分鐘
4. 被切到奇怪分支時，`git checkout <target-branch>` 會帶著 uncommitted changes 切過去（乾淨解法）
5. 若看到 `git stash list` 有你沒做的 stash，**用 `stash apply` 不要 `pop`**（pop 會再 stash）

## 4. ✅ 剛完成（上 session，2026/04/20）

本 session 4 個 PR 全 merged：

| PR | 內容 |
|---|---|
| #49 | roadmap Row 145 Sprint 2b Task F append（98→99） |
| #50 | `.claude/rules/critical-deps.md` 新增「Node 25 + tsx 已知陷阱」章節 |
| #51 | **tsc build pipeline — 6 支 CLI 改 tsc 編譯後 plain node 執行** |
| #52 | roadmap Sprint 7 Step 2 完成紀錄 append |

### PR #51 關鍵交付

- 新增 `tools/people-db/tsconfig.cli.json`（commonjs + moduleResolution:node + rootDir=repo-root + outDir=dist/）
- 新 npm script：`npm run build:tools`
- 6 支 CLI（`scan/parse/normalize/resolve/ingest/reindex`）shebang `#!/usr/bin/env -S npx tsx` → `#!/usr/bin/env node`
- 3 個必要 fix：
  1. `apps/superadmin/lib/people-db/pdf-parse.ts`：`createRequire(import.meta.url)` → `require.resolve()`（commonjs 不支援 `import.meta`）
  2. `tools/people-db/ingest.ts`：`spawn as SpawnLike` cast（Node spawn overload ambiguity）
  3. `tsconfig.cli.json` exclude path 必須用 explicit `../../...` 才能 match 被 include 帶進來的檔
- **Smoke test 驗收於 Node.js 25.2.1**（Sprint 2b tsx 撞 crash 的那個版本）：

```
$ node dist/tools/people-db/scan.js --dry-run --root /tmp/smoke --limit 1
Scanning /tmp/smoke (dry run)...
Done in 0.0 s
{ scanned: 1, errors: 1, inserted: 0, ... }
```

→ module load + env init + parseArgs + scan loop + summary 全走完，exit 0，**未觸發 valueOf/toString crash** ✓

### 未做的

- **CI workflow + `start.sh` 沒接 `npm run build:tools` 前置**
- 真實大檔（1+ GB DBF）沒在 compiled pipeline 跑過
- 67k pending files 尚未 batch re-parse

## 5. Row 145 狀態

- `percentage`: 99%
- Sprint 7 子任務進度：1/6 完成（Step 2 tsc build）
- 剩下的 5 個：

| # | 任務 | 狀態 |
|---|---|---|
| 1 | NAS 遷移（`PEOPLE_DB_SOURCE_ROOT` 切換 + sha256 主鍵保留進度） | 未開始 |
| 3 | Orchestrator cron 排程 | 未開始 |
| 4 | OpenClawOcrClient 真實實作 | 未開始（等 `feature/openclaw-migration` merge） |
| 5 | ES indexer `resolved → indexed` | 未開始 |
| 6 | 1 萬筆 seed fixture 跑完整 acceptance（含 闕貴卿 #3） | 未開始 |

## 6. 🟢 驗證 baseline 綠（動工前跑）

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"

git checkout main && git pull --ff-only origin main
git log --oneline -6   # 應看到 PR #49 / #50 / #51 / #52 的 merge commits

# tsc
npx tsc --noEmit --project apps/superadmin/tsconfig.json 2>&1 | grep -c "error TS"  # 期望 0

# jest
npm test --workspace superadmin -- lib/people-db   # 期望 238 passed / 2 skipped integration

# tools build
npm run build:tools   # 期望 0 errors，生成 dist/tools/people-db/ + dist/apps/superadmin/lib/people-db/

# Smoke test compiled pipeline
mkdir -p /tmp/peopledb-smoke && echo test > /tmp/peopledb-smoke/foo.txt
node dist/tools/people-db/scan.js --dry-run --root /tmp/peopledb-smoke --limit 1
# 期望 exit 0 + { scanned: 1, errors: 1, ... }

# test manifest
bash tools/testing/validate-test-manifest.sh   # 期望 21 entries

# Supabase + DB（若要跑路線 B）
supabase status -o json | grep SERVICE_ROLE_KEY
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\dt people_db_*"
```

## 7. 🚀 建議路線（按優先序）

### 路線 A — Phase 4-a：CI / start.sh 接 `npm run build:tools`（~30-45 min，低風險）

**前提**：baseline 綠

**scope**：
1. **`start.sh`**：在啟動 superadmin 服務前加 `npm run build:tools`（可以加 conditional：`dist/tools/people-db/` 不存在或 source 比較新才跑）
2. **GitHub Actions**：查 `.github/workflows/`；若有跑 tsc/test 的 job，加 `npm run build:tools` step
3. 考慮 `tsc` binary resolution：本地 `node_modules/.bin/tsc` 是從 workspace hoist 來的。CI runner 若用 `npm ci` 也會 hoist，但保險起見可在 root `package.json` devDependencies 明確加 `typescript`（注意 `scripts/check-critical-deps.js` 會 watch typescript 版本）

**flow**：
1. `git checkout main && git pull`
2. `git checkout -b chore/row-145-sprint-7-step3-ci-buildtools`
3. 改 `start.sh` + `.github/workflows/*.yml`
4. 驗證：`./start.sh all` 順跑 / CI job 綠
5. PR

**風險**：低。純 build 流程改動，沒有業務邏輯。

### 路線 B — Phase 4-b：1+ GB DBF 實測 compiled pipeline（~20-30 min，中風險）

**前提**：PR-A merged；本地 Supabase + Postgres 起著

**scope**：
1. `npm run build:tools`
2. 拿一個 DBF 檔（Sprint 2b Task F 用的 `綜合全.dbf` 1.6 GB，或較小 100-500 MB 版本）
3. 跑 compiled parse.js：
   ```bash
   PEOPLE_DB_SOURCE_ROOT=/Volumes/KLEVV-4T-2/台灣尋人資料庫 \
   SUPABASE_URL=http://localhost:54321 \
   SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY) \
   node dist/tools/people-db/parse.js --limit 1 --ext .dbf
   ```
4. 驗證：status=pending → parsed，`people_db_staging_records` 有新 rows，peak RSS < 500 MB（跟 sprint-2b-validate.ts 數據對齊）
5. 寫 dev-log `project-process/dev-logs/dev-people-db-sprint-7-compiled-pipeline-YYYYMMDD.md`
6. PR（roadmap append + dev-log）

**風險**：
- 本地 Supabase 必須起著（`supabase start`）
- SERVICE_ROLE_KEY 必須 export
- 若踩到 NUL-byte 之外的 edge case，記錄即可不在本 PR 修

### 路線 C — Phase 4-c：67k pending batch re-parse（12-24 hr wall，高風險）

**前提**：路線 A + B 都 merged

**scope**：
1. 解凍：
   ```sql
   UPDATE people_db_files
   SET status='pending', attempts=0, error_msg=NULL
   WHERE error_msg LIKE 'user-skipped: .dbf deferred to Sprint 2b';
   ```
   （約 65 筆 1.5-1.7 GB DBF）
2. 分批 `node dist/tools/people-db/parse.js --limit 100 --ext .dbf`
3. 全量跑完後補 `.xlsx` / `.pdf` / `.mdb`
4. 記錄每批 RSS / throughput / 失敗檔

**建議**：**不在單一 session 做**，wall-clock 太長。另排專門 session + 監控腳本。

## 8. ⏸️ 延後 / 刻意不做

1. **XLSX peak RSS 1050 MB 優化**（切 exceljs `sharedStrings: 'emit'` mode）— Sprint 8
2. **`.xls` streaming** — Sprint 2c 或 xls→xlsx 前處理
3. **`dead_letter` status** 加入 `people_db_files.status` CHECK 集 — 需 schema migration
4. **OpenClawOcrClient 真實實作** — 等 `feature/openclaw-migration` 合併
5. **`.accdb` 重試**（524 檔 row_count=0）— 需 Java UCanAccess 或 libreoffice-headless convert
6. **`闕貴卿` acceptance #3 真實驗收** — 等 OpenClaw 接上

## 9. 🗝️ 關鍵慣例速查

### Supabase / Postgres
- 本地 Postgres **17**（`supabase/config.toml`）
- 所有新表必須 **RLS**（super_admin + service_role + deny_all）
- Supabase client 匯入（`apps/superadmin`）：
  - Server/Route handler（守 RLS）：`import { createClient } from '@/utils/supabase/server'`
  - Admin（繞 RLS）：`import { createAdminClient } from '@/utils/supabase/admin'`
  - Client component：`import { createClient } from '@/utils/supabase/client'`
- Migration up 報「inserted before last migration」→ 加 `--include-all`

### Next.js 16 / React 19
- **禁止降級**：react@19 / react-dom@19 / next@16 / react-leaflet@5 / typescript@5（pre-commit 擋）
- **superadmin 沒用 TanStack Query**
- 大表格用既有 `EnhancedTable` pattern

### 測試路徑
- ID 專屬 unit：`apps/superadmin/unit_test/{ID}`（`testScriptPath` 只填這個）
- 跨 ID 可重用腳本：`tools/<domain>/`（**不可** 當 `testScriptPath`）
- jest 看 `lib/people-db/**/__tests__/*.test.ts`；`unit_test/145/` 被 testPathIgnorePatterns 排除
- 合併前：`bash tools/testing/validate-test-manifest.sh`

### Node 25 + tsx 已知陷阱
- 完整章節：`.claude/rules/critical-deps.md § Node 25 + tsx 已知陷阱`
- 寫新 CLI 前決策樹：
  - 只讀寫 Postgres → `pg.Pool` 不用 supabase-js
  - 需 Supabase Auth/RLS → 放 API route，不走 standalone tsx CLI
  - 需 people-db parsers → import 個別 module，不走 `parsers/index.ts` barrel
- Sprint 7 Step 2 的 compiled pipeline 已一勞永逸解掉這雷

## 10. 💡 動工建議

**推薦起手式**：**路線 A（CI 接入）**

- 30-45 min 能獨立交付一個 PR
- 把整個 build pipeline 收口：後續所有 session 都能假設 `dist/tools/people-db/*.js` 是 reliable 的
- 做完後下個 session 再接路線 B 實測

**若本地 Supabase 已起著 + 有時間**：可以**路線 A + B** 連做，產出更多數據點（RSS / throughput）。

**30 秒摘要你的選擇**給 Jason 後再動工，避免悶頭寫錯。
```

---

## 相關檔案 / 脈絡

- 上一個 handoff（Sprint 2b）：[handoff-row-145-sprint-2b-20260419.md](handoff-row-145-sprint-2b-20260419.md)
- Sprint 2b dev-log：[dev-people-db-bulk-ingestion-sprint-2b-2026-04-20.md](../dev-logs/dev-people-db-bulk-ingestion-sprint-2b-2026-04-20.md)
- 專案規則：[.claude/rules/general.md](../../.claude/rules/general.md)、[.claude/rules/critical-deps.md](../../.claude/rules/critical-deps.md)
- Row 145 roadmap entry：[apps/superadmin/app/data/roadmap.ts](../../apps/superadmin/app/data/roadmap.ts) line ~2603
