# Handoff — Row 145 Sprint 2b: Streaming Parsers + Postgres COPY

> **產出時間**：2026/04/19
> **產出者**：Claude Opus 4.7（與 Jason 對話）
> **接手對象**：下一個 Claude session
> **承接內容**：Sprint 2 in-memory parser 對 1.6 GB DBF 級檔案 OOM 的根本性瓶頸
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt

---

```markdown
# Sprint 2b — Streaming Parsers + Postgres COPY 接手 prompt

## 1. 你的身分與專案慣例

- 你是接手 Row 145 (people-db bulk ingestion) Sprint 2b 的 Claude 工程師
- 回覆使用者用**繁體中文**，所有 code comment 用**英文**
- TypeScript **strict mode**，禁用 `any`（pre-commit hook 會擋）
- 檔案命名：React 組件 PascalCase、Hooks `use*`、工具函式 camelCase、資料夾 kebab-case
- Migration 檔名格式：`YYYYMMDDHHMMSS_description.sql`，**只能放在** `supabase/migrations/`
- 文檔不要堆在根目錄，單檔不超過 500 行
- 永遠加新 commit 而非 amend 既有 commit
- **禁用 `--no-verify`** 跳過 hooks，被擋就修根因
- **Jason 常在不同分支並行開發**：動工前 + 每次 commit 前都要 `git status` 避免覆寫他的平行變更
- 進度更新要改 `apps/superadmin/app/data/roadmap.ts`（percentage + lastUpdated + developmentProgress）

## 2. 專案位置

```
/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA
```

主要 app：`apps/superadmin`（Next.js 16，port 3001）、`apps/web`（3000）、`apps/web-au`（3002）

## 3. 你會繼承的環境狀態

### Git
- Branch: `main`（git status 乾淨）
- 最後 commit: `9023149` (Merge PR #39, fix/api-auth-audit-pr-e)
- Sprint 6 已 merge（OCR client、staging records、search UI 都進來了）

### Supabase 本地
- Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`（PG 17）
- API: `http://127.0.0.1:54321`
- 取 service role key：`supabase status -o json | grep SERVICE_ROLE_KEY`

### Row 145 People-DB Pipeline 既有交付（已 merge）

| 模組 | 路徑 | 狀態 |
|:--|:--|:--|
| Inventory CLI | `tools/people-db/scan.ts` | ✅ 含 `--skip-unsupported` flag |
| Parse CLI | `tools/people-db/parse.ts` | ✅ 含 `--ext` filter，順序處理（無並行）|
| 純函式 | `apps/superadmin/lib/people-db/inventory.ts` | ✅ 有 `planFileAction` 等純函式 + 27 jest test |
| Parser dispatcher | `apps/superadmin/lib/people-db/parsers/index.ts` | ✅ 路由 8 種 ext 到對應 parser |
| Parsers | `parsers/dbf.ts mdb.ts xls.ts fp.ts fp-parse.ts pdf-transposed.ts` | ⚠️ **全部 in-memory**，這就是 Sprint 2b 要修的 |
| Staging | `apps/superadmin/lib/people-db/staging.ts` (78 行) | ✅ 用 Supabase upsert，無 COPY |
| OCR | `apps/superadmin/lib/people-db/ocr/` | ✅ 已 mock |

### 資料庫實際狀態（重要：data 已大量 seed）

```
people_db_files:
  total ≈ 90,000 rows  (124 MB table)
  parsed:  ~21,000 (mdb 1416 / dbf 208 / accdb 524 / fp 17550 / xlsx 4 / xls 2 / pdf 4)
  failed:  ~400   (含 65 個 1.5-1.7 GB DBF monsters)
  pending: ~70,000 (xls 24574 / pdf 29590 / txt 11073 / xlsx 2534 / fp 1786 / mdb 19 / dbf 0)

people_db_staging_records:
  2,385,185 rows / 1.27 GB
  PG total DB size 1.43 GB
```

### Source drive 已掛載
```
/Volumes/KLEVV-4T-2/台灣尋人資料庫    474 GB / 595k files / 28 子資料夾
```
其中 PEOPLE_DB_SOURCE_ROOT env 預設指向這裡。

## 4. 先讀這幾個檔案建立脈絡（依優先序）

```bash
# 必讀（規格與決議）
project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md     # Row 145 RFC
project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md     # TDD 規格
project-process/dev-logs/145-development-log-summary.md                    # 跨 Sprint 全景 + 今日踩雷
project-process/test-logs/test-people-db-bulk-ingestion-2026-04-19.md      # 測試覆蓋現況

# Sprint 2 既存實作（要 streaming 化的對象）
apps/superadmin/lib/people-db/parsers/types.ts                # ParseResult shape
apps/superadmin/lib/people-db/parsers/dbf.ts                  # 101 行，dbffile 全 in-memory
apps/superadmin/lib/people-db/parsers/xls.ts                  # SheetJS readFile，全部 cells in memory
apps/superadmin/lib/people-db/parsers/index.ts                # dispatchByPath
apps/superadmin/lib/people-db/staging.ts                      # 78 行，Supabase upsert
tools/people-db/parse.ts                                      # CLI worker
tools/people-db/scan.ts                                       # Scan CLI

# 規則（避免雷區）
.claude/rules/critical-deps.md        # 禁止降級的套件
.claude/rules/general.md              # 命名 + Git workflow
.claude/rules/backend/supabase.md     # SDK 路徑、RLS、migration 規則
CLAUDE.md                             # 主 CLAUDE.md
CLAUDE.local.md                       # 本機 URL（gitignored）
```

## 5. 驗證基線綠（接手前先跑一次確認）

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"

# 1. 確認 git 乾淨在 main
git status --short          # 應該無輸出
git log --oneline -3        # 應該 9023149 在頂

# 2. Supabase / DB 起來
supabase status              # 應該 services running
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -c "SELECT count(*) FROM people_db_files;"   # ~90000 rows
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -c "SELECT count(*) FROM people_db_staging_records;"   # ~2.38M rows

# 3. People-db Jest 全綠
npm test --workspace superadmin -- lib/people-db
# 預期: 約 15 suites, 140+ tests passed

# 4. tsc 對 people-db 檔案無錯
npx tsc --noEmit --project apps/superadmin/tsconfig.json 2>&1 \
  | grep -E "(parsers/|inventory\.ts|staging\.ts)" | head
# 預期: 無 output（== 0 個 people-db 相關錯誤）

# 5. mdbtools / dbffile 可用
which mdb-tables             # /opt/homebrew/bin/mdb-tables
node -e "require('dbffile')" # 不該報錯
```

## 6. Sprint 2b 任務拆解

### 目標
讓 parser 能吃**任意大小**檔案（含 1.6 GB DBF），同時把 staging insert 速度提升 10-50x。
完成後 65 個目前因 OOM 被 skip 的 monster DBF 都能進 staging。

### 主要瓶頸（Sprint 2 留下的）

```ts
// 現在所有 parser 都是這個 shape：
interface ParseResult {
  rows: Record<string, string>[];   // ← 全部 row 必須塞 memory 才能回傳
  row_count: number;
  parser: ParserName;
  ...
}
```

對 1.6 GB DBF：~5000 萬 rows × ~200 bytes/JS 物件 ≈ **10-30 GB heap** → OOM。
即使加 RAM 也只能多撐到 3-4 GB 檔（V8 GC 開始拖累），不能根治。

### Task A — Streaming-friendly ParseResult 介面（前提）

**TDD 寫測先**（`apps/superadmin/lib/people-db/parsers/__tests__/streaming-types.test.ts`）：
- 4 cases：sync iterator / async iterator / batched flush / cancellation

**新增介面**（不破壞舊的 `ParseResult`，加 sibling）：
```ts
// apps/superadmin/lib/people-db/parsers/types.ts
export interface StreamingParseResult {
  parser: ParserName;
  columns: string[];
  // Async iterator yields batches of rows (default batch=500).
  rowsIter: AsyncIterable<Record<string, string>[]>;
  // Resolves with totals AFTER iter exhausted.
  finalize(): Promise<{ row_count: number; warnings: string[]; likelyScanned?: boolean }>;
}
```

**驗收**：tsc 0 error；新介面有 jsdoc 說明何時用 streaming vs 何時用 in-memory。

### Task B — `parsers/dbf-stream.ts`（新檔，TDD）

**套件選擇（按優先序評估）**：
1. ✅ **自寫 streaming reader** — DBF 格式很簡單（fixed-width header + records），~150 行 TS 就能寫完，零依賴
2. ⚠️ `dbase-stream-reader` — npm 上有但 maintainer 不活躍、最後更新 2019
3. ❌ `dbffile` — 沒有 streaming API，這是現在 in-memory 的根因

**建議**：自寫。DBF 格式 spec：https://web.archive.org/web/20150323061445/http://ulisse.elettra.trieste.it/services/doc/dbase/DBFstruct.htm

**TDD**（`apps/superadmin/lib/people-db/parsers/__tests__/dbf-stream.test.ts`），至少 8 cases：
- 小 DBF（10 rows）正確 yield
- 多批次（PAGE_SIZE=500）切分正確
- BIG5 encoding（mock buffer）
- Date 欄位轉 ISO 字串
- 空 DBF（header only）→ 空 iterator + finalize 回 row_count=0
- Memo 欄位指向 .dbt 但檔案不存在 → warning，不 throw
- 中途 EOF（截斷）→ ParserFailureError 帶當前 row count
- Heap 守護：對 100 MB fixture（synthesise）跑完 heap 增量 < 100 MB（用 `process.memoryUsage`）

**檔案**：`apps/superadmin/lib/people-db/parsers/dbf-stream.ts`（建議 < 250 行）

### Task C — `parsers/xlsx-stream.ts`（新檔，TDD）

**套件選擇**：
- ✅ **`exceljs`** 的 `WorkbookReader` — 官方 streaming API，maintained，零 CVE 已知
  ```ts
  import ExcelJS from 'exceljs';
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, { sharedStrings: 'cache' });
  for await (const worksheet of reader) {
    for await (const row of worksheet) { ... }
  }
  ```
- ❌ 沿用 SheetJS — 沒有真正 streaming API；`stream` 套件是 wrapper

**注意**：`exceljs` 不在 package.json 裡，要 `npm i exceljs --workspace superadmin`。版本選 `^4.4.0`。

**TDD**（`__tests__/xlsx-stream.test.ts`），至少 7 cases：
- 單 sheet 正確切 batch
- 多 sheet → 加 `__sheet` 欄
- 空 sheet → warning
- shared strings 跨 sheet 正確（exceljs cache 模式）
- date cells → ISO string
- 大檔（100 MB fixture）heap 守護
- 損毀 zip → ParserFailureError

### Task D — Postgres COPY-based staging insert

**問題**：`staging.ts` 的 `insertStagingRecords` 用 PostgREST upsert（透過 Supabase HTTP API），對 1M+ rows 會慢到不行（網路 round-trip）。

**解法**：新增 `staging-copy.ts`，直接用 `pg-copy-streams` + `node-postgres` 走 `COPY` 指令：

```ts
// apps/superadmin/lib/people-db/staging-copy.ts
import { Pool } from 'pg';
import copyFrom from 'pg-copy-streams';
// PG_URL 走 service role 連線：postgres://postgres:postgres@127.0.0.1:54322/postgres
```

**套件**：`pg`（已可能在），`pg-copy-streams`（要裝）。

**TDD** 至少 5 cases：
- 1000 rows COPY → DB count 一致
- JSONB 欄位含中文/特殊字元正確 escape
- 批次 1M rows → 時間應 < 30s（標 perf test、可 skip）
- Conflict (file_id, record_index) 走 staging 表 unique constraint，COPY 後 DELETE-INSERT 或先 truncate 該 file_id 的舊 records 再 COPY
- 連線失敗 → throw ParserFailureError-equivalent，不 leak connection

### Task E — Streaming dispatcher + parse.ts CLI 整合

修 `parsers/index.ts`：對支援 streaming 的 ext 走 streaming path，否則 fallback in-memory。

修 `tools/people-db/parse.ts`：當 result 是 `StreamingParseResult`，邊讀 iter 邊 COPY 到 staging（背壓正常運作，不要先 `.toArray()`）。

**驗收**：對 `/Volumes/KLEVV-4T-2/台灣尋人資料庫/原始檔不要更動-RECOVERY-175G/資料(常常使用-2 )/500GB/綜合全.dbf`（1.6 GB）成功 parse 進 staging，worker 峰值 RSS < 500 MB。

### Task F — 收尾

1. 跑全套 jest：`npm test --workspace superadmin -- lib/people-db`
2. 跑剩餘 pending 大檔：`npx tsx tools/people-db/parse.ts --ext .dbf`
3. 更新 dev-spec：`project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md` 加 Sprint 2b 章節
4. 更新 roadmap：`apps/superadmin/app/data/roadmap.ts` Row 145 的 `developmentProgress`
5. 寫 dev-log + test-log + 更新 145-development-log-summary.md
6. Commit + PR 流程見 §8

## 7. 延後 / 待辦（不要這次做）

- Sprint 3：PDF transposed-table detection（已部分完成於 `parsers/pdf-transposed.ts`，跑 .pdf 時會用到，但別動它）
- Sprint 4：Entity Resolution（合併「武嵋嵋 / C100000290」這類同人不同來源）
- Sprint 5：IK Analyzer for Elasticsearch
- Sprint 6 監控頁面：已 merge，與 Sprint 2b 無關
- 別動 OCR 模組（`ocr/`）— 已 mock 跑通

## 8. 關鍵慣例 + 雷區（**這 session 我親身踩過**）

### 雷區 1：`apps/superadmin/lib/people-db/*` 的編輯會被自動 revert
**親身觀察**：本 session 我修了 `mdb.ts`（stderr cap）、`dbf.ts`（size cap）、`parse.ts`（ext flag、size guard）共 5+ 次，每次都被某個外部 process（可能是 lint hook、auto-format、或另一個 background agent）revert 回原狀。Jest 測試明明綠的，commit 前檔案就被改回去了。

**規避策略**：
1. **馬上 commit**：寫完 → 跑 test → 立刻 `git add + commit`，越快越好
2. **用 feature branch**：`git checkout -b feature/row-145-sprint-2b`，避免 main 上跟其他 agent 衝突
3. **小 commit、頻繁 push**：每完成 1 個 task（Task A、B、C…）就 commit + push 一次
4. **如果發現檔案被改回**：`git diff` 看哪些變化，用 `git checkout HEAD~1 -- <file>` 取回上一個版本

### 雷區 2：DB row 也會被外部介入
**親身觀察**：我跑 `parse.ts --ext .dbf` 兩次，每次跑到一半就被外部 process 把剩餘 pending rows 標成 `error_msg='user-skipped: all .dbf deferred to Sprint 2b'`，造成 worker 沒檔案做、退出。

**規避**：跑 parse 前先確認 pending count，跑後再確認 — 如果中途 pending 數突然歸零代表被介入。

### 雷區 3：這個 repo 的 critical-deps 鎖定
- `react`, `react-dom` 鎖 v19+
- `next` 鎖 v16+
- `react-leaflet` 鎖 v5+
- `typescript` 鎖 v5+
- 這些**禁止降級**，pre-commit hook 會擋

### 雷區 4：SQL `*.sql` 只能放 `supabase/migrations/`
不要把臨時 SQL 寫進 `apps/` 或 `tools/`。`tools/people-db/__sql/` 也不行。

### 雷區 5：本機 supabase migration 已有衝突
`supabase migration up` 會跳到 `20260413210000_create_bank_accounts.sql` 失敗（"column user_id does not exist"），這跟你無關。要套自己的新 migration，**直接用 psql**：
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -f supabase/migrations/<your_new_migration>.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -c "INSERT INTO supabase_migrations.schema_migrations(version, name) \
      VALUES ('<timestamp>', '<name>') ON CONFLICT DO NOTHING;"
```

### 雷區 6：PostgREST schema cache 失效（PGRST002）
新 migration 套完後 PostgREST 會回 `Could not query the database for the schema cache. Retrying.`，所有 PostgREST 操作 500。**規避**：套完 migration 後 `supabase stop && supabase start`，或者 `psql -c "SELECT pg_notify('pgrst', 'reload schema');"`。

### 雷區 7：Adapter config 命名規則
若改 `apps/superadmin/lib/adapter-config.ts`，pre-commit hook 會跑 `tools/testing/lint-adapter-model-ids.sh`，違反命名規則會被擋。詳見 `.claude/rules/backend/ai-adapter.md`。

### Supabase SDK 路徑（apps/superadmin）
```ts
// Server / Route Handler / Server Action（遵守 RLS）
import { createClient } from '@/utils/supabase/server';
// Client Component
import { createClient } from '@/utils/supabase/client';
// Service role（繞過 RLS，僅用於 worker / admin）
import { createAdminClient } from '@/utils/supabase/admin';
```

### RLS Migration template
新表必啟 RLS + super_admin policies。範本見 `supabase/migrations/20260419100000_create_people_db_files.sql`（67-117 行）— 直接複製改表名。

## 9. 驗收門檻

Sprint 2b 完成定義：

- [ ] Task A-E 全部 jest 綠（>= 30 個新 test cases）
- [ ] tsc 對新檔 0 error
- [ ] 對 `/Volumes/KLEVV-4T-2/.../綜合全.dbf` (1.6 GB) 成功跑進 staging，worker peak RSS < 500 MB
- [ ] 對 `/Volumes/KLEVV-4T-2/.../桃 男 全.xlsx` (148 MB) 成功跑進 staging
- [ ] `npx tsx tools/people-db/parse.ts --ext .dbf` 對所有 pending 完成（0 OOM、< 10% 失敗率，剩下的失敗率限於資料損毀）
- [ ] 更新 dev-spec + roadmap.ts + 145-development-log-summary.md 反映 Sprint 2b 結果
- [ ] PR 訊息格式遵循專案慣例（feat/fix/refactor 前綴）

### Commit message 範例
```
feat(people-db): streaming DBF parser + Postgres COPY for staging (Sprint 2b)

- Add parsers/dbf-stream.ts: zero-dep custom DBF reader, async iterator
- Add staging-copy.ts: pg-copy-streams for 50x faster bulk insert
- Refactor dispatcher to prefer streaming when available
- 1.6 GB DBF now parses in <500 MB heap (was OOM)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## 10. 動工前的最終確認指令

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
git checkout -b feature/row-145-sprint-2b   # 開分支，避免 main 干擾
git status --short                           # 應無輸出
git log --oneline -3                         # 9023149 在頂
supabase status -o json | grep SERVICE_ROLE_KEY > /dev/null && echo "✓ supabase up"
npm test --workspace superadmin -- lib/people-db 2>&1 | tail -3
```

---

**最後一句話確認**：開工前，請先**口頭重述 Task A-F 的順序與每個 task 要產出的檔案清單**給使用者確認，再動鍵盤 — 避免方向錯誤又被外部 agent 干擾，浪費往返成本。
```

---

## 使用方式

1. 開新 Claude Code session
2. 複製上方 fenced code block **整段**（從 `# Sprint 2b — Streaming Parsers...` 到結尾的 `--- 避免方向錯誤又被外部 agent 干擾，浪費往返成本。`）
3. 貼到新 session 的第一則 prompt
4. 新 AI 會照 §10 確認指令跑驗證、再口頭重述 Task A-F 拆解，等你確認

## 相關文件

- [Row 145 RFC v1.0](../features/people-db-bulk-ingestion-dev-spec-20260418.md)
- [Row 145 TDD Spec](../features/people-db-bulk-ingestion-tdd-spec-20260418.md)
- [Dev Log Summary](../dev-logs/145-development-log-summary.md)
- [TDD Progress Report (2026/04/19)](../test-logs/test-people-db-bulk-ingestion-2026-04-19.md)
- [`/handoff` command spec](../../.claude/commands/handoff.md)
