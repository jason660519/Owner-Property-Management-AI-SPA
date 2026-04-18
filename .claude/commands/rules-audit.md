掃描專案規則與記憶檔，找出重複、過期、死連結。不自動修復，只列報告等使用者決定。

## 目標

控制「每 session 必讀」檔案（`CLAUDE.md`、`AGENTS.md`）的膨脹，確保細節在 `.claude/rules/`，並清掉快照式過期資料。

## 流程

1. **檔案大小健檢**
   - `wc -l CLAUDE.md AGENTS.md CLAUDE.local.md .claude/rules/*.md .claude/rules/**/*.md .claude/memory/*.md 2>/dev/null`
   - 標示：`CLAUDE.md > 120 行`、`AGENTS.md > 40 行`、單一 rules 檔 > 200 行

2. **CLAUDE.md ↔ AGENTS.md 重複**
   - 抓兩檔各自的 H2（`^## `）段落標題比對
   - 若 AGENTS.md 有非 pointer 內容重複 CLAUDE.md → 建議瘦成 pointer

3. **CLAUDE.md ↔ rules/ 重複**
   - 對每個 rules 檔，抓關鍵 token（表格欄位、code block 內容、特定 import 路徑）在 CLAUDE.md 內 grep
   - 命中 → 列出「CLAUDE.md 第 N 行 vs rules/xxx.md 第 M 行」，建議 CLAUDE.md 改成 pointer

4. **memory 快照式過期資料**
   - 讀 `.claude/memory/*.md`。若內容是表格式的 feature/roadmap/progress 快照 → 標記「應刪，指向 `roadmap.ts` 或 dashboard 即可」
   - 若有 `Last synced:` / `Last updated:` 日期欄 > 30 天前 → 同上

5. **死連結 / 失效路徑**
   - 抽出所有 `.md` 內的相對路徑（`./...`、`../...`、`apps/...`、`.claude/...`、`docs/...`、`backend/...`）
   - 逐一 `test -e` 驗證，列出不存在的目標與出處

6. **輸出報告**（不改檔，只回報）
   - 用三段：`🔴 建議處理`（重複、死連結）/ `🟡 可精簡`（體積、過期快照）/ `✅ 健康`
   - 每條附建議動作與預估省下行數

7. **問使用者要不要執行**，使用者同意後才動檔。

## 判斷原則

- `CLAUDE.md` 每 session 都載入 → 每行成本 × N sessions。能搬到 rules/ 就搬。
- `.claude/memory/` 若存放的是「roadmap.ts 已有」的資料 → 直接刪，指向 source。
- rules/ 可以長（按需讀），但單檔 > 200 行該拆成多檔。
- `AGENTS.md` 目標是純 pointer（< 30 行），不要重複 `CLAUDE.md`。
