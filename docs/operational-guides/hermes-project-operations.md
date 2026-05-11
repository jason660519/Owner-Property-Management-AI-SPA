# 不動產專案 Hermes 使用、安裝與運作注意事項

## 目的

本文件定義 Owner Property Management AI SPA 使用 Hermes Agent 的專案隔離、安裝、啟動、更新與維運規則。核心原則是：本專案 Hermes 必須和 SayDo、其他 side project、以及系統全域 Hermes `default` profile 分開。

本專案已有 Docker 化 Hermes runtime，請以此為主，不要改回系統全域 `hermes` 直接執行。

## 目前採用架構

本專案 Hermes 採用「Docker Compose + 專案專屬資料目錄」：

- Gateway container：`hermes-opm`
- Dashboard container：`hermes-dashboard`
- Compose file：`tools/hermes-runtime/docker-compose.yml`
- 本機持久資料：`~/.hermes-opm`
- Container 內 Hermes data dir：`/opt/data`
- Container 內專案目錄：`/workspace/project`
- Dashboard 預設 port：`9119`
- Gateway 目前只在 Docker network 內供 Dashboard 使用，尚未發布到 host port

這代表 Hermes 的設定、API keys、skills、sessions、memories、cron、logs 會保存在 `~/.hermes-opm`，不會寫入系統全域 `~/.hermes`。

## 啟動與停止

### 啟動 Hermes Dashboard

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
./start.sh hermes
```

啟動後開啟：

```text
http://127.0.0.1:9119
```

### 停止 Hermes

```bash
./stop.sh
```

`stop.sh` 會停止 `hermes-opm` 與 `hermes-dashboard`，並釋放 Hermes Dashboard port。

### 查看 runtime log

```bash
tail -n 80 logs/dev/hermes-runtime.log
```

若 Dashboard 無法啟動，先看這個 log，再檢查 Docker Desktop 是否已開啟。

## 更新方式

Docker 模式不可使用 Hermes Dashboard 內建的 `Update Hermes`。本專案的正確更新方式是：

```bash
./start.sh hermes-update
```

手動等價流程：

```bash
cd tools/hermes-runtime
HERMES_HOME_DIR="$HOME/.hermes-opm" \
PROJECT_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA" \
docker compose pull

HERMES_HOME_DIR="$HOME/.hermes-opm" \
PROJECT_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA" \
docker compose up -d
```

更新 image 不會清除 `~/.hermes-opm`。

## 初始化與設定

首次啟動時，如果 `~/.hermes-opm/config.yaml` 不存在，`./start.sh hermes` 會先啟動 Dashboard，讓你在 browser 內完成設定。

若要用 CLI setup，可使用 container 方式，不要使用全域 `~/.hermes`：

```bash
docker run -it --rm \
  -v "$HOME/.hermes-opm:/opt/data" \
  -e HERMES_HOME=/opt/data \
  nousresearch/hermes-agent setup
```

需要設定 API server 或 tokens 時，應寫入 `~/.hermes-opm/.env`，不要寫到 repo 的 `.env`，也不要寫到 `~/.hermes/.env`。

範例：

```bash
cat >> "$HOME/.hermes-opm/.env" <<'EOF'
API_SERVER_ENABLED=true
API_SERVER_PORT=8642
API_SERVER_KEY=replace-with-opm-local-secret
TERMINAL_CWD=/workspace/project
EOF
```

如果 SayDo 同機也使用 Hermes Gateway，請確認兩邊 port 不重疊。必要時本專案可改用 `8643`，並同步調整 compose / adapter 設定。

目前 `tools/hermes-runtime/docker-compose.yml` 沒有把 Gateway `8642` 發布到 host。若未來 Superadmin app 要從 host 直接呼叫 Hermes API，必須先在 compose 補上明確的 localhost port mapping，例如 `127.0.0.1:8643:8642`，並同步更新 app adapter 的 base URL。

## 與本專案開發流程的關係

Hermes 在本專案應定位為「開發協作與記憶/排程 runtime」，不是專案資料庫的 source of truth。

可以交給 Hermes 的工作：

- 摘要開發進度與每日站會
- 整理阻塞、踩雷與待辦
- 協助產生 project-process 報告草稿
- 追蹤 cron 提醒與定期檢查
- 保存跨 session 的開發 lesson

不應交給 Hermes 單獨決定的工作：

- 直接改 Supabase migration
- 直接 merge main 或 force push
- 在未驗證情況下更新 roadmap completion
- 把記憶中的推測寫成真實業務資料
- 跨出本專案目錄修改 SayDo 或其他 repo

正式進度資料仍以以下位置為準：

- `apps/superadmin/app/data/roadmap.ts`
- `project-process/`
- `docs/update-project-progress-guide.md`
- Superadmin project progress dashboard

## 防污染規則

- 本專案只使用 `~/.hermes-opm`，不可掛載 `~/.hermes` 或 `~/.hermes-saydo`。
- Container 名稱保留 `hermes-opm`，避免和 SayDo 的 `hermes-saydo` 混淆。
- Dashboard 預設 `9119`；若其他專案也開 Dashboard，必須改 port。
- tokens、OAuth、Telegram/Slack channel 設定放在 `~/.hermes-opm/.env` 或 Hermes auth，不提交到 Git。
- Hermes prompt 必須明確限制工作目錄為本 repo。
- 使用 Paperclip、OpenClaw、Codex、Cursor 等其他 agent 時，Hermes 只能做協調與記憶，不應覆蓋它們的 worktree 狀態。
- 若 Hermes 產生任務結果，落地前要依本專案測試與 project-progress 規範驗證。

## 備份

本專案 Hermes 資料屬於敏感本機 agent data，包含設定、記憶、sessions 與可能的 tokens。

建議備份：

```bash
./start.sh backup-agent-data
```

或手動備份：

```bash
tar -czf "$HOME/Desktop/hermes-opm-backup-$(date +%Y%m%d%H%M%S).tgz" -C "$HOME" .hermes-opm
```

備份檔不可提交到 Git。

## 維運檢查表

啟動前：

- Docker Desktop 已開啟
- `~/.hermes-opm` 存在，且不是 symlink 到其他專案資料夾
- `tools/hermes-runtime/docker-compose.yml` 仍掛載 `~/.hermes-opm:/opt/data`
- Dashboard port `9119` 沒被其他服務占用

交付 Hermes 任務前：

- 任務 prompt 指定本專案根目錄
- 任務不要求 Hermes 直接製造真實業務資料
- 涉及 roadmap/project-process 時，遵守 `docs/update-project-progress-guide.md`
- 涉及程式碼時，完成對應測試或明確記錄未測原因

故障時：

- 先看 `logs/dev/hermes-runtime.log`
- 再看 `docker ps -a | grep hermes`
- 必要時執行 `./start.sh hermes-update`
- 不要刪 `~/.hermes-opm`，除非已備份且確認要重設 Hermes 記憶
