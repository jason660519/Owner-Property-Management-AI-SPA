根據本次對話已完成的工作，寫一份**自包含**的接手 prompt 給下一個 AI session 使用。
使用者會開新 session 把你的輸出整份貼進去，新 AI 必須**從零**就能理解並直接動工。

## 動筆前必做的現場偵察

這些是**必跑**，不是可選：

1. `git status --short` + `git log --oneline -10` — 確認本次 session 的 commit 與未提交變更
2. 讀本次 session 最後 commit 的核心檔案（看**現況內容**，不是只看 diff；Jason 常在平行分支編輯）
3. 讀 `apps/superadmin/app/data/roadmap.ts` 最末端的相關 Row entry，確認 `percentage` / `lastUpdated` / `developmentProgress` 與現況一致
4. 若有 dev-spec / tdd-spec（`project-process/features/*.md`），讀「下一 Sprint」章節把具體任務拆解帶出來
5. 掃一下 `.claude/rules/` 與 `CLAUDE.md`，把**非直覺**的慣例挑出來（例：TS strict 禁 any、SQL 只放 migrations、Supabase client 依環境選 path、RLS 雙軌）

## 輸出格式

用一個 markdown fenced code block 包住**整份 prompt**，讓 Jason 一鍵複製。內含以下段落（依序）：

1. **身分與慣例**
   - 回覆語言繁中、程式碼註解英文、TS strict 禁 `any`
   - SQL 只能放 `supabase/migrations/`，檔名 `YYYYMMDDHHMMSS_description.sql`
   - **Jason 常在不同分支並行開發**：動工前 + 每次 commit 前都要 `git status` 避免覆寫他的平行變更
   - 進度更新要改 `apps/superadmin/app/data/roadmap.ts`（percentage + lastUpdated + developmentProgress）

2. **專案位置** — 絕對路徑

3. **剛完成（commit hash）**
   - 條列交付物（檔案路徑 + 功能摘要）
   - 附「先讀這幾個檔案建立脈絡」的**優先序清單**

4. **驗證基線綠的指令** — 讓新 AI 一開始就能確認環境 OK：
   ```
   cd apps/superadmin && npx jest <path> --no-coverage
   cd apps/superadmin && npx tsc --noEmit
   ```

5. **下一步任務拆解**
   - 要建立哪些檔案（絕對 / repo-relative 完整路徑）
   - 用什麼套件（說明為什麼：避 CVE、效能、peer dep 相容）
   - TDD 要先寫什麼測試（引用 tdd-spec 對應章節）

6. **延後 / 待辦** — 本次暫時不做但要記得的事

7. **關鍵慣例與雷區**
   - Supabase client import 選哪個（server / client / admin）
   - RLS 政策範本（deny_all + superadmin 四政策 + service_role 雙軌）
   - Pre-commit hooks 會擋什麼（`scripts/check-staged-no-any.js`、`scripts/check-critical-deps.js`、`tools/testing/lint-adapter-model-ids.sh`、`tools/testing/validate-test-manifest.sh`）
   - 不准降級：react 19 / react-leaflet 5 / next 16 / typescript 5

8. **驗收門檻** — 下一任務完成條件 + commit message 格式

9. **動工前的確認指令** — `git status` + `git log --oneline -5` 驗證 baseline commit

## 品質要求

- 每個檔案路徑寫**絕對路徑或 repo-relative 完整路徑**，不要含糊的「在 lib 裡」
- 列套件建議時**說明為什麼**（避 CVE / 效能 / peer dep）
- 不寫「Based on my analysis...」這種空話，直接給指令
- 結尾留一句：動工前先跟我確認 Sprint 拆解，避免悶頭寫錯方向

## 特別強調

$ARGUMENTS
