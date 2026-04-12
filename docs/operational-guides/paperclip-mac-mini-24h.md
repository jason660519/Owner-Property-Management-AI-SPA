# Paperclip on Mac mini — 24h 運作與成本注意事項

**適用**: 本 repo 內 `docker/paperclip` + `start.sh` 啟動的本地 Paperclip（預設 `http://localhost:3187`）  
**相關儀表板**: Superadmin `project-progress`、`paperclip-worktrees`

---

## 1. 能源與睡眠

- **建議**: 系統睡眠設為「永不」或僅關閉螢幕；避免睡眠中斷 Docker 與長時間 agent run。
- **UPS**: 若常無人值守，建議不斷電，避免突然斷電造成 worktree 或 git index 異常。

---

## 2. Docker 與 Paperclip 程序

- **啟動**: 專案根目錄 `./start.sh` → 選 Paperclip 或 `all`。
- **健康檢查**: `PAPERCLIP_PUBLIC_URL`（預設 `http://localhost:3187`）之 `GET /api/health`（與 `start.sh` 內邏輯一致）。
- **一鍵檢查腳本**: `tools/paperclip/health-check.sh`（檢查容器名稱預設 `paperclip-paperclip-1` 與 HTTP health；可設環境變數覆寫，見腳本註解）。
- **映像更新**: 預設 `PAPERCLIP_AUTO_PULL=0` 避免每次啟動都 `pull`。需要升級映像時用 `start.sh` 選單之「更新 Paperclip 映像檔」或專案文件之 paperclip-update 流程；升級後驗證 `GET /api/health`。

---

## 3. 憑證與環境變數分層

| 位置 | 典型變數 | 說明 |
|------|-----------|------|
| `docker/paperclip/.env.paperclip` | `PAPERCLIP_PORT`, `BETTER_AUTH_SECRET`, `CLAUDE_CODE_OAUTH_TOKEN` | 容器專用；勿把未使用的雲端 LLM key 全塞進容器，減少誤用與外洩面。 |
| `apps/superadmin/.env.local` | `PAPERCLIP_API_KEY`, `NEXT_PUBLIC_PAPERCLIP_*` | Superadmin 代理送單與前端 base URL；**不要**把 `PAPERCLIP_API_KEY` 給前端 bundle。 |
| 主機 Codex / OpenAI | `OPENAI_API_KEY`（若 compose 有傳入容器） | 僅在實際使用 `codex_local` 等適配器時需要。 |

若曾外洩 key，應於供應商後台輪替後再更新上述檔案。

---

## 4. 磁碟與 worktree

- **Paperclip 資料目錄**: 預設 `$HOME/.paperclip-data-owner-property-management`（見 `.env.paperclip.example`），避免放在會被系統清理的 `/tmp`。
- **Git worktree**: 任務分支在 `.paperclip-worktrees/`（見既有 dev spec）；定期在 `paperclip-worktrees` 頁面 merge + cleanup，或依專案清理流程刪除已合併之分支。

---

## 5. API 帳單與輪詢（Superadmin 端）

- **PromptEngineerModal**: issue 送達後會依 issue／run 狀態**自適應輪詢間隔**（進行中較密、blocked 較疏、錯誤時 backoff），降低對 `/api/paperclip/issues/...` 的無效流量。
- **Worktrees 列表**: 列表輪詢間隔依「是否有活躍 issue／未完成 run／本機 commits」在 **10s–45s** 間切換；無 worktree 時最疏。
- **實務**: 長任務仍以 Paperclip 內 agent 設定與模型為主；本節僅限本 repo 可控制之流量。

---

## 6. 成本監控與驗證

### 6.1 確認帳單是否下降

- **LLM provider**：登入 Anthropic Console / OpenAI Dashboard → Usage 頁面，對比優化前後同時段的 token 消耗與花費。
- **Paperclip 內建 cost**：Superadmin `paperclip-worktrees` 每列顯示 cost chip（`costUsd`、`inputTokens`、`outputTokens`）；Modal 完成後也會拉一次 cost。
- **Next.js API 呼叫量**：若有 Vercel Analytics 或本機 access log，可比對 `/api/paperclip/issues/*/status` 與 `/api/paperclip/worktrees` 的 request count，確認輪詢間隔是否確實拉長。

### 6.2 輪詢自動停止

- 當 PromptEngineerModal 連續 5 次 status fetch 失敗，會顯示「連線中斷 · 點擊重試」按鈕，不再自動打 API。
- Worktrees 列表若某 worktree 的 cost 停在 loading 超過 3 分鐘，會自動降回慢速輪詢，避免卡住的 fetch 拖住整張表。

### 6.3 建立基線

建議在優化部署後的第一週：
1. 記錄每日 LLM 用量（token count 或 USD）。
2. 記錄每日 `/api/paperclip/*` 總 request 數。
3. 與前一週同工作量對比，確認 ≥30% 的 API call 減少。

---

## 7. 卡住時排查順序

1. `./tools/paperclip/health-check.sh` 或手動 `curl` health。
2. Docker Desktop / `docker ps` 是否仍有 `paperclip-paperclip-1`。
3. Superadmin `.env.local` 中 `PAPERCLIP_API_KEY` 與 `NEXT_PUBLIC_PAPERCLIP_BASE_URL`。
4. Paperclip UI：agent 是否 paused、最近一次 heartbeat run 錯誤訊息。
5. **勿**在未確認前重複送單製造多個 worktree；優先使用 Modal 內錯誤提示之「建議」段落。

---

## 8. 變更紀錄

| 日期 | 說明 |
|------|------|
| 2026/04/13 | 初版（配合 Row 133 優化交付） |
| 2026/04/13 | 新增第 6 節成本監控；輪詢自動停止（連錯 ≥5）與 cost loading 超時降速 |
