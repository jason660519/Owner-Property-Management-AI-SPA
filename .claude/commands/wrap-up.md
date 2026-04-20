# Wrap Up — Session 收尾全自動

Session 結束時的「一鍵收尾」編排器。依序串接：寫日誌 → 更新 roadmap → commit → push → PR → merge → cleanup → handoff。

> **本檔是薄編排器**，實際邏輯在子命令裡。要改某一段請改對應子檔，不要把細節塞回本檔。

---

## 觸發詞（任一即視為呼叫本 command）

- `/wrap-up`
- 「收尾」「session 結束」「一鍵收工」「全自動收尾」「ship it」
- 使用者說「把今天的東西全部 commit + PR + merge + handoff 一次做完」

## 預設模式

預設等同 `--full-auto`，即：
- 產 daily report（**跳過 VIS issue 互動步驟**）
- 更新 roadmap.ts
- commit / push / 開 PR
- 自動 merge（條件符合時）
- 刪分支
- 產 handoff（最小必要模式）

## 可選參數

| 參數 | 行為 |
| :-- | :-- |
| `--no-report` | 跳過步驟 1（不寫 dev-log，不動 roadmap） |
| `--with-vis` | 步驟 1 包含 VIS Paperclip issue 建立（會中斷詢問 user 確認） |
| `--no-merge` | 步驟 3 只開 PR，不自動 merge / cleanup |
| `--no-handoff` | 跳過步驟 4 |
| `--dry-run` | 印出將執行的步驟與差異，不實際動手 |

---

## 流程（4 步）

### 步驟 1 — 產 dev log + 更新 roadmap

**呼叫子流程**：依 `.claude/commands/daily-report.md` 執行，**跳過步驟五（VIS Paperclip Issue）**，除非帶 `--with-vis`。

產出：
- `project-process/dev-logs/dev-{topic}-{YYYY-MM-DD}.md`
- `apps/superadmin/app/data/roadmap.ts` 對應 Row 的 `percentage` / `lastModifiedDate` / `devLogDocPath`

> ⚠️ 若本次 session **完全沒有實質交付**（純討論/規劃），跳過本步驟並繼續，但在最後告知 user「未產生 dev-log」。

### 步驟 2 — Sanity check

執行：
```bash
git status --short
git diff --stat
```

確認：
- 步驟 1 產出的檔案有出現在 untracked / modified
- 沒有意外的 secrets 檔（`.env`, `credentials.json`）
- 沒有非預期的大改動

若發現異常 → **中斷並回報 user**，不要繼續。

### 步驟 3 — Commit / Push / PR / Merge / Cleanup

**呼叫子流程**：依 `.claude/commands/commit-push-pr-merge-clanup-handoff.md` 執行（步驟 1–10）。

預設行為：
- 逐檔 `git add`（含步驟 1 產的 dev-log 與 roadmap.ts 變更）
- commit message：`<type>: <繁體中文描述>`
- push、開 PR、auto-merge（條件符合時）、刪分支

帶 `--no-merge` 時：只執行到步驟 6（開完 PR 即停），不 merge / cleanup。

### 步驟 4 — Handoff

**呼叫子流程**：依 `.claude/commands/handoff.md` 的「Full-Auto 最小必要輸出模式」執行。

產出：
- Chat fenced code block
- `project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`

handoff 內容必須包含：
- 步驟 1 產的 dev-log 路徑
- 步驟 3 的 commit hash + PR URL + merge 結果 + cleanup 結果
- 若帶 `--with-vis`，附 VIS issue 連結；否則註明「VIS issue 待手動建立」
- 任何步驟失敗的明確紀錄

---

## 失敗處理

任一步失敗，**停下來**並依以下規則：

| 失敗位置 | 行為 |
| :-- | :-- |
| 步驟 1（daily-report） | 中斷，回報問題，不進入後續步驟 |
| 步驟 2（sanity check） | 中斷，等 user 決定 |
| 步驟 3（commit/push） | 中斷，回報 git 錯誤 |
| 步驟 3（PR 開不了） | 中斷，回報 `gh` 錯誤 |
| 步驟 3（auto-merge 被擋） | 繼續到步驟 4，handoff 內明確記錄阻塞原因 |
| 步驟 3（cleanup 失敗） | 繼續到步驟 4，handoff 內標註需手動清理 |
| 步驟 4（handoff） | 重試一次；仍失敗則手動產 chat fenced block 並回報「檔案落地失敗」 |

**不准的反模式**：
- ❌ 跳過 sanity check 直接 commit
- ❌ 自動 merge 失敗時靜默忽略，只回報「成功」
- ❌ 任一步失敗仍標 `✅ 完成` 給 user

---

## 完成輸出格式

```
✅ Wrap-Up 完成

📄 Dev Log:    project-process/dev-logs/dev-{topic}-{YYYY-MM-DD}.md
📊 Roadmap:    Row {ID} {舊%} → {新%}
🔧 Commit:     {sha} <type>: <描述>
🔀 PR:         {URL}（{merged|open|blocked}）
🧹 Cleanup:    {分支名} 已刪除（local + remote）
📋 Handoff:    project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md

下一步建議：{1-2 句}
```

若有任何一段被跳過或失敗，對應行改為 `⚠️` 並寫明原因。

---

## 與其他 command 的關係

| 你想要 | 用哪個 |
| :-- | :-- |
| 一鍵收尾全部做完 | **`/wrap-up`**（本檔） |
| 只想 commit + PR，不 merge 不 handoff | `/commit-push-pr` |
| 已經 commit 了，只想跑 merge + cleanup + handoff | `/commit-push-pr-merge-clanup-handoff --no-commit`（需要時加旗標） |
| 只想寫 dev log + 更新 roadmap | `/daily-report` |
| 只想更新 roadmap | `/roadmap-update` |
| 只想寫 handoff 不動 git | `/handoff` |

---

## 注意事項

- 回覆繁體中文，程式碼註解英文
- 不要 commit secrets
- 不要 force push
- 不要刪保護分支（`main` / `master` / `develop`）
- 子命令 spec 異動時，回頭檢查本檔的「步驟對應」段是否還對得上

## 特別強調

$ARGUMENTS
