根據本次 session 已完成的工作，寫一份**自包含**的接手 prompt 給下一個 AI session 使用。
使用者會開新 session 把你的輸出整份貼進去，新 AI 必須**從零**就能理解並直接動工。

## 觸發條件（以下表達都視為呼叫 `/handoff` command）

凡看到以下任一表達，**都是本 command 的觸發訊號**，必須執行本檔流程，不得略過：

- 直接輸入 `/handoff`
- 「寫 handoff」「handoff prompt」「寫接手 prompt」「接手 prompt」
- 「給下一個 session / AI 的指引 / 交接 / 接手」「留訊息給下個 session」
- 使用者在 session 尾端要求「收尾」「結束前交代一下」「handoff 一下」
- 使用者已同意「選項 X = 做收尾 / 寫 handoff」等複合指令中含 handoff 語意
- 你自己判斷 session 即將結束且本 session 有重大交付（PR merged、新檔落地、Sprint 推進）未落地

**絕對禁止**以下反模式：

- ❌ 在 chat 訊息裡 ad-hoc 手寫一份 markdown 當成 handoff，卻沒按本 command 流程執行
- ❌ 只產 chat fenced block、略過「B. 同時存成檔案」部分
- ❌ 用「建議你存檔到 `/tmp/xxx.md`」這種口頭引導取代實際 `Write` 工具落地

違反任一條 → handoff 只存在對話 log，session 結束即消失 → 等於沒寫，下一個 AI 無法接手。

**AI 工程師自檢**：如果你正打算「自己在訊息裡寫 handoff 內容」而沒完整執行本 command 或沒動 `Write` 工具 → **立即停手** → 回到本檔流程（尤其「完成檢查清單」最末段）。

## 動筆前必做的現場偵察

這些是**必跑**，不是可選：

1. `git status --short` + `git log --oneline -10` — 確認本次 session 的 commit 與未提交變更
2. 讀本次 session 最後 commit 的核心檔案（看**現況內容**，不是只看 diff；User, AI Engineers, Jason 常在平行分支編輯）
3. 讀 `apps/superadmin/app/data/roadmap.ts` 最末端的相關 Row entry，確認 `percentage` / `lastUpdated` / `developmentProgress` 與現況一致
4. 若有 dev-spec / tdd-spec（`project-process/features/*.md`），讀「下一 Sprint」章節把具體任務拆解帶出來
5. 掃一下 `.claude/rules/` 與 `CLAUDE.md`，把**非直覺**的慣例挑出來（例：TS strict 禁 any、SQL 只放 migrations、Supabase client 依環境選 path、RLS 雙軌）
6. **驗證你要在 prompt 中提及的每個技術斷言** — 任何「專案使用 X 套件」、「已有 Y provider / helper」、「在 Z 路徑」的陳述，**都要在寫下前用 grep/Glob/Read 驗證**；沒驗證就不准寫。常見翻車題見下方「常見臆測陷阱」。
7. **API shape 確認** — 若下一任務需要某 API 回特定欄位，必須**實際 Read 那支 route.ts** 確認現況是否已支援；若不支援，在 prompt 中**明確標註「需擴充 X API，補 Y 欄位」**，不得假設它已能回。

## 輸出格式（**雙軌**：chat 顯示 + 檔案落地）

**必須兩件事都做**，缺一不可：

### A. Chat 輸出
用一個 markdown fenced code block 包住**整份 prompt**，讓 Jason 一鍵複製貼到下個 session。

### B. 同時存成檔案

存到 **`project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`**：

| 欄位 | 規則 |
|:--|:--|
| `topic` | kebab-case，含 row 編號與 sprint，例：`row-145-sprint-2b`、`auth-audit-pr-h` |
| `YYYYMMDD` | 產出當日（用 8 位數字、無連字號） |

**檔案結構**：

```markdown
# Handoff — {主題}

> **產出時間**：YYYY/MM/DD
> **產出者**：Claude {model}（與 {使用者} 對話）
> **接手對象**：下一個 Claude session
> **承接內容**：（一句話為什麼需要這份 handoff）
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt

---

```markdown
（chat 裡那份 fenced 內容原樣再貼一次，作為主體）
```

---

## 使用方式
（簡短複製步驟）

## 相關文件
（cross-link 到 dev-spec、tdd-spec、dev-log、test-log、roadmap.ts entry）
```

> 為什麼要落地？Chat 輸出會隨 session 結束消失；檔案進 git 後永久可追溯，且儀表板（dashboard）能 cross-link、Search 可索引。

## Full-Auto 最小必要輸出模式（給 `/commit-push-pr --full-auto`）

當此 command 是被 `--full-auto` 串接呼叫時，允許使用「最小必要模式」，以縮短收尾時間，但仍必須滿足可接手性：

1. 仍需完成「雙軌輸出」（chat fenced code block + handoff 檔案落地）
2. 可將內容精簡為以下 6 段（其餘段落可省略）：
   - 身分與硬性規範（繁中、註解英文、TS strict 禁 any、SQL migration 規則）
   - 本次產出摘要（commit hash、PR URL、merge 結果、cleanup 結果）
   - 當前 repo 狀態（`git status --short` 關鍵結果）
   - 阻塞與風險（若 auto-merge 被擋，列明原因）
   - 下一步待辦（可直接執行的 3-5 條）
   - 動工前確認指令（`git status`、`git log --oneline -5`）
3. 若 `--full-auto` 流程中任何步驟失敗，handoff 必須明確標註：
   - 失敗步驟
   - 失敗訊息摘要
   - 建議人工處理指令
4. 最小必要模式不得省略檔案路徑與 commit/PR 證據連結

### 內含以下段落（依序）：

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
- **技術斷言必須附證據**：每個提及「專案既有 X」的句子，後面要掛 grep 結果、檔案路徑、或 package.json 欄位當**證據**。例：「專案使用 TanStack Query（見 `apps/web/app/providers.tsx:3` 的 `QueryClientProvider`）」；若 grep 查不到，禁止寫「專案使用 X」這類句式，改寫「可評估引入 X」或「依循既有 pattern（useState + fetch，見 `.../search/page.tsx`）」
- 不寫「Based on my analysis...」這種空話，直接給指令
- 結尾留一句：動工前先跟我確認 Sprint 拆解，避免悶頭寫錯方向

## 常見臆測陷阱（寫前必 grep）

這些是訓練資料印象 vs. repo reality 常分歧的地雷。凡是要在 prompt 中斷言，**先用左欄指令驗證**：

| 要斷言的事 | 驗證指令 | 若查不到就不准寫 |
| :-- | :-- | :-- |
| 專案使用 TanStack Query | `grep -r "@tanstack/react-query" apps/<target-app>` | 不准寫「用 useQuery」；改寫現行 `useState + fetch` |
| 專案使用 SWR | `grep -r "from 'swr'" apps/<target-app>` | 同上 |
| 專案使用 Zustand / Jotai / Redux | `grep -r "zustand\|jotai\|redux" apps/<target-app>` | 同上 |
| 專案用 sonner / react-hot-toast | `grep -r "sonner\|react-hot-toast" apps/<target-app>` | 讀 `components/ui/Toast*.tsx` 看自製方案 |
| 專案用 shadcn/ui / radix | 看 `components/ui/` 檔案 + `package.json` | 別假設 variant 集合（例 Badge 無 `danger`，用 `error`）|
| 某 provider 檔案存在 | `Read <path>` 成功才算 | 不准憑「常見 Next.js 架構」寫「QueryProvider 在 …」|
| API 已回某欄位 | Read `route.ts` | 若沒回，要明寫「**需擴充 API**」|
| Migration 已存在某表 | `ls supabase/migrations | grep <keyword>` | 沒有就標註為「需新 migration」|

違反任何一條寫出錯誤斷言 → 接手 AI 會照錯誤描述動工，浪費時間排雷。

## 完成檢查清單（落地前自我驗證）

- [ ] Chat 已輸出 fenced code block
- [ ] 已建立 `project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md` 檔案（用 Write tool）
- [ ] 檔案內含「使用方式」與「相關文件」cross-link
- [ ] 跑 `ls project-process/handoffs/` 確認檔案存在
- [ ] 在 chat 結尾告知使用者**兩個位置**：「複製下方 / 或日後從 `project-process/handoffs/...` 取回」

## 特別強調

$ARGUMENTS
