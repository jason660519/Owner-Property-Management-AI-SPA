# Agent Runtime Startup Hardening — DEV-SPEC

## 1. 背景

Row 126 原本聚焦於 Paperclip 的 Docker 啟停，但實際維運已擴展到三條 runtime 線：

- Paperclip：Docker
- Hermes：Docker
- OpenClaw：本機 CLI

本次工作目標是把三者都納入同一套本機開發維運規則，降低以下風險：

- 更新方式混淆
- 設定資料遺失
- 啟動摘要缺少真實 data path
- 備份缺少單一入口

## 2. 本次範圍

- `start.sh`
- `stop.sh`
- `tools/hermes-runtime/docker-compose.yml`
- `docs/operational-guides/hermes-docker-update.md`
- `docs/operational-guides/paperclip-docker-update.md`
- `docs/operational-guides/agent-local-data-and-backup.md`

## 3. 功能目標

1. Hermes 可由 `./start.sh hermes` 啟動，並自動開頁。
2. Hermes 可由 `./start.sh hermes-update` 走 Docker image 更新，而不是 Dashboard 內建 update。
3. Paperclip 可由 `./start.sh paperclip-update` 穩定更新，即使遇到 Docker recreate race 也能自動重試。
4. `./start.sh all` 要明確顯示 Hermes / Paperclip / OpenClaw 的資料落點。
5. `./start.sh backup-agent-data` 要能將三個 runtime 的持久資料與 Paperclip 啟動設定一起備份。

## 4. 資料保存設計

- Hermes data：`~/.hermes-opm`
- Paperclip env：`docker/paperclip/.env.paperclip`
- Paperclip data：`PAPERCLIP_DATA_DIR`，目前為 `/Users/jason66/.paperclip-data-owner-property-management`
- OpenClaw data：`~/.openclaw`

## 5. 非目標

- 不在本次範圍內實作完整 restore 流程
- 不在本次範圍內將 OpenClaw 改為 Docker
- 不在本次範圍內新增 CI 對 Docker / 全域 CLI 的端到端驗證

## 6. 風險與緩解

- Docker update 與 container recreate 存在競態：以自動重試與 log file 緩解
- 備份會掃到 runtime socket：以 tar file list + socket/pipe 排除緩解
- 使用者誤從 UI 內建 update 更新 Docker runtime：在 `start.sh` 與文件中反覆提示正確更新路徑
