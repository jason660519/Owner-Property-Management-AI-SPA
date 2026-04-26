# Claude Code Background Shell — 已知漏水點

> 寫新的長壽進程（dev server / watcher / docker compose up / tail -f）之前**必讀**。
> 違反這條規則的後果：磁碟被 `/private/tmp/claude-{UID}/tasks/` 吃掉幾十 GB，且**沒有自動清理機制**。

---

## 問題描述

Claude Code 對 `run_in_background: true` 的子進程會在 OS 層攔截 stdout/stderr，存到：

```
/private/tmp/claude-{UID}/tasks/{task_id}.output
```

**沒有 rotation、沒有 size limit、沒有自動清理**。Session 結束、CLI 退出、orphan 子進程都不會清。即使在 child 端做 `> /dev/null 2>&1`，wrapping shell 自己的輸出（warning、shell trace、exit message）仍會被攔下。

### GitHub 已知 issue

- [anthropics/claude-code#35164](https://github.com/anthropics/claude-code/issues/35164) — `/tmp/claude-{UID}/` never cleaned, 100GB+ 累積案例
- [anthropics/claude-code#15700](https://github.com/anthropics/claude-code/issues/15700) — `CLAUDE_CODE_TMPDIR` 失效，CLI hardcode 在 `/tmp/claude/`
- [anthropics/claude-code#33789](https://github.com/anthropics/claude-code/issues/33789) — Task output 路徑無法 override

---

## 規則

### 禁止

- **禁止**在 Claude Code 對話內用 `run_in_background: true` 起 Next.js dev server / `pnpm dev` / `npm run dev` / webpack watch / `docker compose up`（不加 `-d`）等長壽進程。
- **禁止**寫「我先在背景開 dev server，等一下回來看 log」這類流程。應改為使用者自己在獨立 Terminal 視窗起 dev server，Claude 只負責讀 log file。
- **禁止**用 `> /dev/null 2>&1` 當作唯一防線──那只擋 child 輸出，不擋 wrapping shell 本身的輸出。

### 允許

- **短任務**（< 30 秒、輸出有限）：可以用 `run_in_background: true`，但跑完看一次 `BashOutput` 後**必須** `KillShell` 收尾，不要讓它持續活著。
- **真的要起 dev server**：用 `./start.sh`（互動模式會走 `osascript` 開新 Terminal 視窗，不被 Claude 攔截；headless 模式會偵測 `CLAUDECODE` 自動把 log 重導 `/dev/null`）。
- **CI / headless**：依靠 `start.sh` 的偵測自動處理，不會吃磁碟。

---

## 防禦設計（已內建於專案）

### `start.sh`

新增兩個 helper：

```bash
is_headless_claude() {
    [ -n "${CLAUDECODE:-}" ] || [ -n "${CLAUDE_CODE:-}" ] || [ ! -t 0 ]
}

dev_log_target() {
    if is_headless_claude; then echo "/dev/null"; else echo "$1"; fi
}
```

`start_web` / `start_web_au` / `start_admin` 三個函式的 nohup 都改用 `dev_log_target` 決定要不要寫檔。Headless 環境下輸出直接丟 `/dev/null`，避免 Claude 攔截累積。

### `stop.sh`

每次 `./stop.sh` 會清 `/private/tmp/claude-$(id -u)/tasks/` 內**超過 24 小時**的檔案（保留 active session 的 log），避免無上限累積。

---

## 定期維護

### 每週手動檢查

```bash
du -sh /private/tmp/claude-* 2>/dev/null
```

如果單一 UID 目錄超過 1 GB，先確認沒有正在執行的 active session（`ps aux | grep claude`），再手動清：

```bash
rm -rf /private/tmp/claude-$(id -u)/tasks/*
```

### 磁碟告警時

如果磁碟接近爆掉，且這個目錄是元凶，可以直接：

```bash
# 強制清整個目錄（會中斷正在執行的 background task）
sudo rm -rf /private/tmp/claude-*
```

---

## 為什麼 `> /dev/null 2>&1` 不夠

Claude Code 攔的是它**直接 spawn 的 shell 進程的 fd**，不是 child 的 fd。所以：

```bash
# Claude 的 Bash 工具收到的 command：
"pnpm dev > /dev/null 2>&1 &"
```

執行流程：

1. Claude spawn 一個 `bash -c "pnpm dev > /dev/null 2>&1 &"`，**這個 bash 的 stdout/stderr 被 Claude 攔下到 `/private/tmp/claude-*/tasks/*.output`**。
2. bash 內部 spawn `pnpm dev`，並把它的 stdout/stderr 重導 `/dev/null`。
3. `pnpm dev` 本身的輸出確實丟了，但只要 wrapping bash 有任何 stderr（例如 `nohup: ignoring input`、shell trap 訊息、exit code 不為 0），那一條還是寫進攔截檔。

而且如果 `pnpm dev` 在 reload 時 fork 子進程，子進程的 fd 繼承複雜，常常還是會有東西漏到攔截檔。

**結論**：`> /dev/null 2>&1` 是 layered defense 的一層，但不能單靠它。最可靠的解是**根本不在 Claude 內 background 長壽進程**。

---

## 歷史事件

- **2026-04-26**：使用者回報 `/private/tmp/claude-{UID}/` 累積到 79GB。原因：dev server 跳 ERROR 連續刷 + Claude session 結束後 child process 沒 kill。建立本規則並改造 `start.sh` / `stop.sh`。
  - 觸發場景推測：多個 `.paperclip-worktrees/row-XXX/` 各自起 `nohup npm run dev`，再加上 Claude 攔截疊加。
  - 既有 worktrees（`.paperclip-worktrees/row-006`、`.paperclip-worktrees/row-1730`）的 `start.sh` 是 issue 建立時的快照，**不會自動套用本次修改**。下次 worktree 重建時才會繼承。

---

## 相關檔案

- 啟動腳本：[start.sh](../../start.sh)（`is_headless_claude` / `dev_log_target` helpers）
- 停止腳本：[stop.sh](../../stop.sh)（`/private/tmp/claude-*/tasks/` 清理）
- 規則索引：[CLAUDE.md](../../CLAUDE.md) `## Rules 索引`
