# Claude Commands 整合 — `/wrap-up` 編排器 — 開發日誌

> **日期**: 2026-04-20 | **作者**: Claude Opus 4.7 | **Row ID**: N/A（內部開發工具，不入 roadmap）
> **影響範圍**: `.claude/commands/wrap-up.md`（新增）、`.claude/commands/daily-report.md`（旗標補強）
> **狀態**: Done（已自我試跑）

---

## 1. 本日完成任務清單

| # | 任務 | 交付物 | 完成度 |
|:--|:-----|:-------|:-------|
| 1 | 盤點 5 個 session 收尾相關 command 的職責重疊 | 重疊分析（見 §2） | 100% |
| 2 | 設計薄編排器 vs 巨型 command 的取捨並提案 | `/wrap-up` 命名與 4 步流程 | 100% |
| 3 | 新增 `/wrap-up` command 檔 | `.claude/commands/wrap-up.md`（~120 行） | 100% |
| 4 | 補強 `/daily-report` 加入 `--no-vis` 旗標 | `.claude/commands/daily-report.md` 旗標表 | 100% |
| 5 | 自我試跑 `/wrap-up` 全流程 | 本 dev-log + handoff + commit + PR | 100% |

---

## 2. 技術困難：5 個 command 的職責重疊與整合策略

### 問題現象

專案有 5 個與 session 收尾相關的 command，職責重疊不清：

- `daily-report` — 寫 dev log + 更新 roadmap + 建 VIS issue
- `roadmap-update` — 只更新 roadmap
- `commit-push-pr` — commit / push / 開 PR
- `commit-push-pr-merge-clanup-handoff` — commit → PR → merge → cleanup → handoff
- `handoff` — 寫接手 prompt + 落檔

每次收尾要記得依序呼叫哪幾個、用什麼順序，使用者本人都會忘。

### 排查過程

1. **逐檔閱讀 5 個 command** — 釐清每個的實際職責邊界
2. **找出隱性重疊**：
   - `daily-report` 步驟三**已經會更新 roadmap.ts**（覆蓋 `roadmap-update`）
   - `commit-push-pr-merge-clanup-handoff` 步驟 11 **已經會產 handoff**（覆蓋 `handoff`）
3. **找出隱性衝突**：
   - `daily-report` 步驟五會開 Playwright 建 VIS issue 且**送出前要 user 確認** → 與「全自動」衝突
4. **評估兩種整合方案**：
   - 方案 A：合併成一個巨型 `/git-commit-auto-all` — 600+ 行，難維護，難局部執行
   - 方案 B：薄編排器 `/wrap-up`（~120 行）+ 子 command 保留可單獨呼叫 — 易維護、易拆解

### 根因分析

**為何 5 個 command 自然演化出重疊**：

- 早期需求逐步加入：先有 `commit-push-pr` → 加 `handoff` → 為了 full-auto 整合成 `commit-push-pr-merge-clanup-handoff` → 為了寫日誌另外做 `daily-report`
- 沒有「session 收尾」這個明確抽象層，導致每個 command 都嘗試「順手做完」周邊事項，職責邊界滲漏
- 命名沒有反映層級（`commit-push-pr-merge-clanup-handoff` 名稱已經暴露 ad-hoc 演化痕跡）

### 解決方案：薄編排器模式

採用方案 B，新增 `/wrap-up` 作為**唯一入口的編排器**：

**4 步流程**：
1. 步驟 1 — 呼叫 `/daily-report --no-vis`（產 dev-log + 更新 roadmap）
2. 步驟 2 — Sanity check（`git status` + 檢查 secrets / 大改動）
3. 步驟 3 — 呼叫 `/commit-push-pr-merge-clanup-handoff`（commit → PR → merge → cleanup）
4. 步驟 4 — 呼叫 `/handoff` Full-Auto 最小必要模式

**旗標系統**（保留局部執行能力）：
- `--no-report` / `--with-vis` / `--no-merge` / `--no-handoff` / `--dry-run`

**子 command 各自保留可單獨呼叫的能力**：
- 只想 commit + PR → `/commit-push-pr`
- 只想寫日誌 → `/daily-report`
- 只想寫 handoff → `/handoff`

**`--no-vis` 旗標補強**：
- 修改 `.claude/commands/daily-report.md`，於檔頭新增「旗標」段落
- 明確列出 `--no-vis` 跳過 Playwright VIS 互動步驟，供 `/wrap-up` 等全自動編排器呼叫

---

## 3. 踩雷事件與下次避免措施

### 踩雷 A — 子 command 命名拼字錯（`clanup`）

`commit-push-pr-merge-clanup-handoff.md` 的 `clanup` 應為 `cleanup`。

**為何沒立刻改**：
- 改檔名等同改 slash command 觸發詞，可能影響使用者肌肉記憶
- 不在本次任務範圍（本次只整合，不重構命名）

**下次避免**：
- 之後若有「重構命名」的獨立 PR，把 `clanup` 一併修正
- `/rules-audit` 可加一條檢查：command 檔名拼字檢查

### 踩雷 B — 5 個 command 各自演化導致重疊

**事前可預防指標**：
- 任何專案的 `.claude/commands/` 達到 5 個以上時，應檢查是否需要編排器層
- 任何 command 的名字超過 4 個 dash-segment（例：`commit-push-pr-merge-clanup-handoff`）通常是「應該抽編排器」的訊號

---

## 4. 下次避免措施 — 流程優化建議

1. **新增 command 前先審視重疊** — 在 `.claude/rules/` 加一條：寫新 command 前先讀 `.claude/commands/` 全表
2. **編排器與子 command 命名分層** — 編排器用動詞（`/wrap-up` / `/ship-it`），子 command 用具體動作（`/commit-push-pr`）
3. **/wrap-up 自身演進** — 之後若再多步驟（如自動跑 lint / test），改 `/wrap-up` 一處即可，不必動子 command

---

## 5. 明日優先工作

| 優先級 | 工作 | 預估工時 | 相依 |
|:-------|:-----|:---------|:-----|
| P2 | 觀察 `/wrap-up` 實戰幾次後，調整失敗處理表 | 0.5h | 累積 3-5 次實戰經驗 |
| P3 | 把 `clanup` typo 與 `/wrap-up` 一起納入命名重構 PR | 0.5h | 獨立 PR |
| P3 | `/rules-audit` 加 command 檔名拼字檢查 | 1h | 工具腳本擴充 |

---

## 6. 相關文件

- 主檔案：[.claude/commands/wrap-up.md](../../.claude/commands/wrap-up.md)
- 補強：[.claude/commands/daily-report.md](../../.claude/commands/daily-report.md)
- 子 command 群：
  - [.claude/commands/commit-push-pr.md](../../.claude/commands/commit-push-pr.md)
  - [.claude/commands/commit-push-pr-merge-clanup-handoff.md](../../.claude/commands/commit-push-pr-merge-clanup-handoff.md)
  - [.claude/commands/handoff.md](../../.claude/commands/handoff.md)
  - [.claude/commands/roadmap-update.md](../../.claude/commands/roadmap-update.md)
