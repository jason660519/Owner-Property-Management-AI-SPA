# 尋人資料庫 — 大規模批次 Ingestion Pipeline（RFC / Dev-Spec）

**Row**：145
**功能名稱**：People DB Bulk Ingestion Pipeline
**文檔版本**：1.0（決議版）
**建立日期**：2026/04/18
**負責人**：Claude Opus 4.7
**狀態**：決議通過（Jason 2026/04/18），待進入 Sprint 1
**承接**：Row 131（基礎匯入）、Row 132（精準搜尋）、Row 144（樹狀資料來源 + 親友圖譜）

---

## 一、背景 / Problem Statement

### 1.1 實際資料規模

`/Volumes/KLEVV-4T-2/台灣尋人資料庫` 實測 **474 GB**，30+ 個子資料夾，檔案格式分佈：

| 類別 | 副檔名 | 是否為結構化 | 目前支援 |
| :--- | :--- | :--- | :--- |
| Excel / 試算表 | `.xls`（舊 BIFF）、`.xlsx`、`.csv`、`.txt` | ✅ 表格 | ✅ `.xlsx/.csv/.txt`（Sprint 5）／❌ `.xls` |
| Access DB | `.mdb`、`.accdb` | ✅ 表格 | ❌ |
| dBASE | `.dbf` | ✅ 表格 | ❌ |
| 數位 PDF | `.pdf`（有文字層） | ⚠️ 半結構化 | ✅ 啟發式（轉置表會出錯） |
| 掃描 PDF | `.pdf`（純圖片） | ❌ 非結構化 | ❌（Sprint 5b 預留 OpenClaw 串接） |
| 影像 | `.jpg`、`.png`（可能） | ❌ 非結構化 | ❌ |

### 1.2 現行架構的侷限（Row 131–144）

目前的匯入流程是「UI 上傳 1 個檔 → 即時解析 → 寫 ES」，無法支撐 474 GB 規模：

1. **無檔案清冊**：同一份檔案在多個備份目錄重複出現，會被重複入庫。
2. **無副檔名路由**：`.mdb/.dbf/.accdb` 完全不支援；`.xls` 被明確略過（Sprint 3 因 CVE）；掃描 PDF 沒有 OCR 路徑。
3. **無 Entity Resolution**：同一個人出現在 N 份資料集會產生 N 筆獨立 record，使用者看到重複資料。
4. **ES 無中文分詞器**：目前用 ES 預設 analyzer，中文逐字拆 token，效能差、排序不準。
5. **PDF 啟發式崩潰於轉置表**：里長 PDF 的「編號/姓名在左欄、人在右欄」佈局會導致欄列錯位（2026/04/18 實測：闕貴卿被配到江輝吉的地址）。

### 1.3 目標 / Goals

- ✅ 能批次吃完 474 GB 硬碟而不重複、不遺漏、可重跑。
- ✅ 只有真的需要 OCR 的檔案才送 OpenClaw（成本與時間控制）。
- ✅ 同一個人在多個來源被正確合併成一筆 `person_id`。
- ✅ ES 搜尋使用正規中文分詞器，中文人名/地址排序準確。
- ✅ 整個過程可觀測、可重跑（idempotent）、可回溯（record 能追回單一來源檔案）。

### 1.4 非目標 / Non-Goals

- ❌ 即時 OCR（OpenClaw 是批次 queue）。
- ❌ 處理非台灣資料（地址正規化僅涵蓋台灣縣市）。
- ❌ 取代既有 UI 上傳流程（單檔人工上傳維持）。
- ❌ 做為通用 ETL 平台（只服務 people-db）。

---

## 二、評審決議（2026/04/18 Jason 拍板）

> 以下 4 項決議已鎖定，Sprint 實作照此執行。

### 決議 1 — ER 自動合併策略：保守路線

- **自動合併**：只對「身分證 exact match」自動合併成同一 `person_id`。
- **半自動**：`name + phone` / `name + address` 產出**候選配對**寫入 `people_db_merge_candidates` 表，由 admin 在 UI 上逐筆 `confirm / reject`。
- **黑名單**：被 reject 的配對寫入 `people_db_merge_blacklist`，下次 ER 不再提示。
- 理由：474 GB 資料裡同名同區很常見（如「王小明」在重陽路），全自動合併會造成無可挽回的誤併。

### 決議 2 — Sprint 排程：並行加速

- **Sprint 5（IK Analyzer）提前到與 Sprint 2 並行**，兩者無 code 依賴。
- Plugin 安裝、`people_v2` mapping 準備、reindex 腳本都可先做；真正切 alias 要等 Sprint 4 產生 person 聚合後才切。
- **原本 15 天 → 改為約 11 工作天**（關鍵路徑：Sprint 1 → (2 ∥ 5) → 3 → 4 → 6）。

### 決議 3 — OpenClaw：Mock 先行

- Sprint 3 定義 `OcrClient` interface：`enqueue(fileId, pdfBuffer) → jobId` / `onCallback(jobId, result)`。
- 實作用 in-memory mock + fixture 結果通過單測與整合測試。
- `feature/openclaw-migration` 合併後直接替換成真 client，interface 不動。

### 決議 4 — 硬碟存取：先本機後 NAS

- **目前**：Sprint 1–6 全部以 `/Volumes/KLEVV-4T-2/台灣尋人資料庫` 本機路徑開發與驗證。
- **Production**：家中 NAS **尚未 setup**，暫緩；在 NAS 就緒前不做正式入庫。
- **配置抽象**：File Inventory CLI 走環境變數 `PEOPLE_DB_SOURCE_ROOT`（預設當前本機路徑），NAS 上線後只改 env，不動 code。
- **Sprint 7（新增，暫定）**：NAS 掛載文件 + 檔案清冊路徑遷移腳本（以 `sha256` 為主鍵，搬 mount point 不丟失處理進度）。

---

## 三、架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│  Source Tree                                                    │
│  $PEOPLE_DB_SOURCE_ROOT                                         │
│  預設: /Volumes/KLEVV-4T-2/台灣尋人資料庫（本機）               │
│  未來: /mnt/nas/taiwan-people-db（NAS，尚未 setup）             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ① File Inventory                                               │
│     Postgres: people_db_files                                   │
│     欄位: path, size, mtime, sha256, mime, ext, status,         │
│            dataset_root, dataset_subpath, error_msg, attempts   │
│     冪等：(sha256) 唯一索引，同檔只處理一次                     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ② Router                                                       │
│  ┌──────────┬──────────────────────────────────────────────┐   │
│  │ .mdb     │ mdbtools → mdb-export → rows                 │   │
│  │ .accdb   │ mdbtools（相容有限，fallback UCanAccess）    │   │
│  │ .dbf     │ node-dbf                                     │   │
│  │ .xls     │ node-xlsx readonly BIFF                      │   │
│  │ .xlsx    │ 現有 xlsx-parse（Row 144）                   │   │
│  │ .csv/.txt│ 現有 csv-parse（Row 144）                    │   │
│  │ .pdf     │ pdfjs extract → 檢測文字層                   │   │
│  │          │   有文字層 → pdf-parse + 轉置表偵測          │   │
│  │          │   無文字層 → OpenClaw OCR queue（mock）      │   │
│  └──────────┴──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ③ Normalize（擴充現有 import-mapper + address-normalize）      │
│     - 姓名：去空白、去特殊符號、全形轉半形                      │
│     - 電話：Row 132 normalizePhone                              │
│     - 身分證：大寫 + checksum 校驗                              │
│     - 地址：Row 144 台灣縣市切割                                │
│     - 出生年：民國 ↔ 西元                                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ④ Entity Resolution                                            │
│     - 身分證 exact → 自動合併進 people_db_persons               │
│     - name+phone / name+addr → people_db_merge_candidates       │
│     - admin 在 /merge-candidates 頁 confirm / reject             │
│     - reject 寫 people_db_merge_blacklist                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⑤ Elasticsearch                                                │
│     - IK Analyzer plugin（與 Sprint 2 並行安裝）                │
│     - people_v2 index + ik_max_word / ik_smart                  │
│     - person 聚合索引 people_persons                            │
│     - blue/green reindex，切 alias 不中斷搜尋                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⑥ Orchestrator                                                 │
│     CLI: tools/people-db/ingest.ts                              │
│     子指令：scan / parse / resolve / reindex / status / retry   │
│     進度寫入 people_db_ingest_runs，監控頁讀取                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、資料模型（新增）

### 4.1 `people_db_files`（檔案清冊 — Sprint 1）

```sql
CREATE TABLE people_db_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256            TEXT NOT NULL UNIQUE,
  source_path       TEXT NOT NULL,
  dataset_root      TEXT NOT NULL,
  dataset_subpath   TEXT,
  ext               TEXT NOT NULL,
  mime              TEXT,
  size_bytes        BIGINT NOT NULL,
  mtime             TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
                    -- pending | parsing | parsed | ocr_queued | normalized
                    -- | resolved | indexed | failed | skipped_duplicate | missing
  parser            TEXT,
  row_count         INTEGER,
  error_msg         TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON people_db_files (status);
CREATE INDEX ON people_db_files (dataset_root);
```

### 4.2 `people_db_persons` / `people_db_person_sources`（Sprint 4）

```sql
CREATE TABLE people_db_persons (
  person_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    TEXT NOT NULL,
  canonical_id_no   TEXT UNIQUE,
  canonical_phones  TEXT[],
  canonical_address TEXT,
  source_count      INTEGER NOT NULL DEFAULT 0,
  quality_score     NUMERIC(3,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE people_db_person_sources (
  person_id    UUID REFERENCES people_db_persons(person_id) ON DELETE CASCADE,
  record_id    TEXT NOT NULL,
  file_id      UUID REFERENCES people_db_files(id),
  match_reason TEXT NOT NULL,       -- id_exact | confirmed_name_phone | confirmed_name_addr | new
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, record_id)
);
```

### 4.3 `people_db_merge_candidates` / `people_db_merge_blacklist`（Sprint 4 — 決議 1 產物）

```sql
CREATE TABLE people_db_merge_candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id   UUID REFERENCES people_db_persons(person_id),
  record_b_id   TEXT NOT NULL,
  match_reason  TEXT NOT NULL,       -- name_phone | name_addr
  confidence    NUMERIC(3,2),
  status        TEXT NOT NULL DEFAULT 'pending',
                                     -- pending | confirmed | rejected
  decided_by    UUID,                -- auth.users.id
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON people_db_merge_candidates (status);

CREATE TABLE people_db_merge_blacklist (
  person_a_id  UUID,
  record_b_id  TEXT,
  PRIMARY KEY (person_a_id, record_b_id)
);
```

### 4.4 `people_db_ingest_runs`（執行歷程 — Sprint 6）

```sql
CREATE TABLE people_db_ingest_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  stage           TEXT NOT NULL,
  files_total     INTEGER,
  files_success   INTEGER,
  files_failed    INTEGER,
  notes           TEXT
);
```

所有表啟用 RLS，只允許 `super_admin` role 讀寫；worker 以 `service_role` 繞過 RLS。

---

## 五、Sprint 拆解（可執行 Tasks）

> Sprint 2 與 Sprint 5 **並行**（決議 2）。關鍵路徑：1 → (2 ∥ 5) → 3 → 4 → 6 →（NAS 就緒後）7。

### Sprint 1 — File Inventory（掃描 + 去重）

**目標**：遞迴掃描 `$PEOPLE_DB_SOURCE_ROOT`，元資料 + sha256 寫入 `people_db_files`。重跑時只處理新增/修改檔案。

**交付**：
- [ ] Migration `20260419_create_people_db_files.sql`（含 RLS）
- [ ] `tools/people-db/scan.ts`：CLI，讀 `PEOPLE_DB_SOURCE_ROOT` env（決議 4）
- [ ] `apps/superadmin/lib/people-db/inventory.ts`：`upsertFile(sha256, meta)` 純函式
- [ ] API `GET /api/people-db/ingest/files?status=&dataset_root=`
- [ ] Unit test：stream sha256、upsert 冪等、mtime 偵測改動、deleted file → status=missing

**驗收**：
- 對 `/Volumes/KLEVV-4T-2/台灣尋人資料庫` 跑完 `scan` 後，`SELECT count(*)` 與實際檔案數一致；重跑新增 0。
- 刪掉 1 檔再跑，status 變 `missing`（soft-delete）。

**預估**：5 points / 2 天

---

### Sprint 2 — Router + 結構化 parser（mdb/accdb/dbf/xls）

**目標**：補齊 Row 144 未支援的結構化檔案 parser。

**交付**：
- [ ] 擴充 `apps/superadmin/lib/people-db/parse-dispatch.ts`：加 `.mdb / .accdb / .dbf / .xls`
- [ ] `parsers/mdb-parse.ts`：spawn `mdb-tables` + `mdb-export`
- [ ] `parsers/dbf-parse.ts`：`node-dbf`
- [ ] `parsers/xls-parse.ts`：`node-xlsx` readonly BIFF
- [ ] CI image 加 `mdbtools`（apt）；本機 macOS 以 `brew install mdbtools`
- [ ] 失敗檔案進 dead-letter（`status='failed'`），不阻塞其他檔案
- [ ] Unit tests：每 parser 對 fixture 驗證欄列數

**驗收**：
- `/Volumes/KLEVV-4T-2/台灣尋人資料庫/20120620-RECOVERY-DBF-25G整理好/(5)綜合全.mdb` 能吐 N 筆 row
- `/Volumes/KLEVV-4T-2/台灣尋人資料庫/學校名單資料/三光小學-5.xls` 能吐 row

**風險**：`.accdb`（新版 Jet）mdbtools 支援有限；失敗就進 dead-letter，後續評估 UCanAccess。

**預估**：8 points / 3 天 **（與 Sprint 5 並行）**

---

### Sprint 3 — PDF 轉置表偵測 + OpenClaw Mock Queue

**目標**：修 Row 144 PDF 欄列錯位；掃描件送 OpenClaw（mock）。

**交付**：
- [ ] `pdf-parse.ts` 新增 `detectTransposedTable()`：首欄命中「姓名/編號/電話/地址/性別」等字典 → 轉置後再送 mapper
- [ ] `parsers/pdf-ocr-dispatch.ts`：`likelyScanned === true` 時 enqueue 到 OCR queue
- [ ] 定義 `OcrClient` interface（決議 3）+ `MockOcrClient` 實作 + fixture callback
- [ ] `/api/people-db/ingest/ocr/callback`：webhook 接 OCR 結果
- [ ] Unit test：里長 PDF 解析後 闕貴卿 → 南港路 212 號 2 樓（不再跑成重陽路）
- [ ] 整合 test：mock queue → callback → indexed

**驗收**：
- 里長 PDF 每筆 row 欄位對應正確
- 掃描 PDF 進 `ocr_queued`，mock callback 後變 `parsed`
- 真 OpenClaw 上線後只替換 `OcrClient` 實作，無需改 business logic

**預估**：8 points / 3 天

---

### Sprint 4 — Entity Resolution（保守 + 半自動）

**目標**：身分證 exact 自動合併；模糊配對走半自動 admin 確認（決議 1）。

**交付**：
- [ ] Migration `20260420_create_people_db_persons.sql`（含 merge_candidates、blacklist）
- [ ] `apps/superadmin/lib/people-db/entity-resolution.ts`：`resolvePerson(record) → { action, person_id?, candidateId? }`
  - `action = 'auto_merge'`：id exact
  - `action = 'candidate'`：name+phone / name+addr，寫 candidates 表
  - `action = 'new_person'`：無配對
- [ ] `tools/people-db/resolve.ts`：對 `status='normalized'` 跑 ER
- [ ] API：`GET /api/people-db/merge-candidates`、`POST /api/people-db/merge-candidates/[id]/confirm`、`POST /.../reject`
- [ ] 前端：`app/superadmin/settings/people-database/merge-candidates/page.tsx`
  - 列表（pending 筆數 badge）、左右對照、confirm/reject 按鈕、reject 進 blacklist
- [ ] 搜尋結果頁 toggle：「依 person 聚合（預設）」/「依 record 展開」
- [ ] Unit tests：3 種配對規則各 5 cases、blacklist 排除驗證

**驗收**：
- 同資料跑完後搜尋「闕貴卿」預設顯示 1 筆 person（底下 N 筆 source）
- Admin 在 merge-candidates 頁 reject 一筆後，下次 ER 該對不再出現

**風險**：候選列表可能爆量；API 分頁 + 只看 pending 且加 confidence 排序。

**預估**：10 points / 3.5 天（比原 8 pt 增加，含半自動 UI）

---

### Sprint 5 — IK Analyzer + Blue/Green Reindex（**與 Sprint 2 並行**）

**目標**：ES 升級支援中文分詞，舊索引不中斷搜尋。

**交付**：
- [ ] `backend/elasticsearch/` Dockerfile 或 ES image 安裝 `analysis-ik`（版本對齊 ES）
- [ ] ES mapping `tools/people-db/es-mappings/people_v2.json`：人名 = `name (ik_smart)` + `name.keyword`；地址 = `address (ik_max_word)` + `address_normalized`
- [ ] `tools/people-db/reindex.ts`：`_reindex` API + `requests_per_second` 節流
- [ ] `tools/people-db/swap-alias.sh`：`people` alias v1 → v2，驗證後移除 v1
- [ ] 搜尋 `search-strategy.ts` 不改（`multi_match` 自動套新 analyzer）
- [ ] 整合 test：`_analyze?analyzer=ik_max_word&text=闕貴卿` 回合理切法

**驗收**：
- `GET /people_v2/_analyze` 對中文人名/地址不是逐字切
- 切 alias 後前端搜尋無感知

**風險**：IK 版本必須嚴格對齊 ES；先查 `backend/elasticsearch/docker-compose.yml` 的 ES 版本。

**預估**：5 points / 2 天 **（與 Sprint 2 並行）**

---

### Sprint 6 — Orchestrator + 監控 UI

**目標**：把前 5 個 Sprint 的 CLI 串成一條龍，加觀測性。

**交付**：
- [ ] `tools/people-db/ingest.ts`：主 CLI，`--stage=all|scan|parse|resolve|reindex`
- [ ] `app/superadmin/settings/people-database/ingest/page.tsx`：
  - 各 stage 檔案數（pending/processing/done/failed）
  - Dead-letter 列表 + 單檔 retry
  - 最近 10 次 run timeline
- [ ] API `POST /api/people-db/ingest/retry/[fileId]`
- [ ] E2E `e2e/145/ingest-flow.spec.ts`：mock 3 檔跑完一輪

**驗收**：UI 能看到 474 GB 裡 pending / indexed / failed 數量；失敗能點 retry。

**預估**：5 points / 2 天

---

### Sprint 7（暫定）— NAS 上線後遷移（決議 4）

**觸發條件**：家中 NAS setup 完成後啟動。

**交付**：
- [ ] `docs/operational-guides/people-db-nas-setup.md`：NAS 掛載步驟、權限、備份策略
- [ ] `tools/people-db/migrate-source-path.ts`：以 `sha256` 為主鍵比對，把 `people_db_files.source_path` 從本機路徑改為 NAS mount point
- [ ] Smoke test：改 env → 重跑 `scan --dry-run` 不新增任何 row（因 sha256 沒變）
- [ ] 備份機制：raw file + Postgres + ES snapshot 至少保留 1 份異地

**預估**：3 points / 1 天（NAS 本身 setup 不計）

---

## 六、總表

| Sprint | 主題 | Points | 天數 | 可並行 | 可獨立交付 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | File Inventory | 5 | 2 | — | ✅ |
| 2 | 結構化 parser | 8 | 3 | 與 5 並行 | ✅ |
| 3 | PDF 轉置 + OCR Mock | 8 | 3 | — | ✅ |
| 4 | ER（半自動 UI） | 10 | 3.5 | — | ✅ |
| 5 | IK Analyzer + Reindex | 5 | 2 | 與 2 並行 | ✅ |
| 6 | Orchestrator + UI | 5 | 2 | — | 需 1–4 |
| 7 | NAS 遷移（暫定） | 3 | 1 | — | 需 NAS ready |
| **合計** | | **44** | **約 11 工作天**（關鍵路徑） | | |

---

## 七、被拒絕的替代方案

1. **整顆硬碟全部走 OCR**：90%+ 檔案本身結構化，不需要 OCR。
2. **擴 Row 144 `/import/jobs` 當批次入口**：那組 API 給 UI 單檔上傳，沒有去重/排程/dead-letter。
3. **用 Airflow / Dagster**：1 個 pipeline 過度設計。
4. **前端 WASM 跑 mdb-parse**：474 GB 不可能走前端。
5. **ER 全自動合併（含 name+phone）**：同名同區誤併風險高，已改保守（決議 1）。

---

## 八、依賴與前置條件

- **OpenClaw**：Sprint 3 先 mock；`feature/openclaw-migration` 合併後替換真 client。
- **ES 版本**：Sprint 5 需先查 `backend/elasticsearch/docker-compose.yml` 鎖定 IK 版本。
- **mdbtools**：Sprint 2 CI image `apt-get install mdbtools`；本機 `brew install mdbtools`。
- **硬碟存取**：Sprint 1–6 走本機 `/Volumes/KLEVV-4T-2/`；NAS 待 Sprint 7。

---

## 九、關聯文件

- 承接：`/project-process/features/people-database-dev-spec-20260412.md`（Row 131）
- 承接：`/project-process/features/people-db-dataset-tree-dev-spec-20260417.md`（Row 144）
- OCR：`/project-process/features/openclaw-mobile-dev-feasibility-2026-03-22.md`
- TDD Spec：待建立 `/project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md`
