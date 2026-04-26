# Agent 本機資料位置與備份

本專案目前有三套 agent/runtime：Hermes、Paperclip、OpenClaw。

## 資料位置

### Hermes

- 啟動方式：Docker Compose
- 本機持久資料：`~/.hermes-opm`
- Compose 掛載：`/opt/data`

Hermes 的設定、API keys、skills、sessions、memories 都會保存在這個目錄。

### Paperclip

- 啟動方式：Docker Compose
- 啟動設定檔：`docker/paperclip/.env.paperclip`
- 本機持久資料：目前是 `/Users/jason66/.paperclip-data-owner-property-management`
- Compose 掛載：`/paperclip`

Paperclip 的 app state、內部資料與長期設定會保存在 `PAPERCLIP_DATA_DIR` 指向的目錄。

### OpenClaw

- 啟動方式：本機 CLI
- 本機設定與資料根目錄：`~/.openclaw`
- 主要設定檔：`~/.openclaw/openclaw.json`

目前觀察到 `~/.openclaw` 下面還有 `agents/`、`flows/`、`identity/`、`logs/` 等子目錄。

## 重點

- 更新 Hermes image 不會清掉 `~/.hermes-opm`
- 更新 Paperclip image 不會清掉 `PAPERCLIP_DATA_DIR`
- OpenClaw 因為是本機安裝，設定直接留在 `~/.openclaw`
- repo 掛到 container 內的 `/workspace` 主要是讓 agent 看到專案程式碼，不是主要設定儲存位置

## 一鍵備份

可在 repo 根目錄執行：

```bash
./start.sh backup-agent-data
```

它會將以下內容打包到：

```bash
backups/agent-data/agent-data-YYYYMMDD-HHMMSS.tar.gz
```

備份內容包含：
- `docker/paperclip/.env.paperclip`
- `~/.hermes-opm`
- `PAPERCLIP_DATA_DIR` 指向的目錄
- `~/.openclaw`

如果只是想看目前資料位置，也可以直接執行：

```bash
./start.sh all
```

啟動摘要中現在會列出 Hermes / Paperclip / OpenClaw 的 data path。
