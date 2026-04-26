# Agent Runtime Startup Hardening — TDD SPEC

## 1. 測試目標

驗證 Row 126 在本次維護後具備以下能力：

1. Hermes 啟動與更新流程可用
2. Paperclip 更新流程在 Docker recreate transient race 下仍可收斂成功
3. 啟動摘要能反映 Hermes / Paperclip / OpenClaw 的資料保存位置
4. agent data backup 可正常產出 archive，且不混入 socket 警告

## 2. 測試分層

### 手動 / smoke

- `bash -n ./start.sh`
- `./start.sh hermes`
- `./start.sh hermes-update`
- `./start.sh paperclip-update`
- `./start.sh backup-agent-data`
- `docker compose ... ps`
- `curl http://localhost:9119`

### 待補自動化

- 單元測試：抽出 shell helper 後再測 `get_hermes_status_summary`、backup source 列表生成
- shell smoke：用 fixture 目錄驗證 backup 會排除 socket / pipe

## 3. 驗證案例

### Case A：Hermes 既有壞掉 container 可被清理並重建

- 前置：存在 restart 中的 `hermes-dashboard`
- 預期：`./start.sh hermes` 會移除舊 container，重新建立後可連 `http://localhost:9119`

### Case B：Hermes Docker 更新路徑正確

- 前置：Hermes 使用 Docker image 啟動
- 預期：`./start.sh hermes-update` 完成 pull + recreate；不依賴 Dashboard 內建 update

### Case C：Paperclip 更新遭遇 transient race 仍可成功

- 前置：`docker compose up -d --force-recreate paperclip` 首次回傳 `removal ... already in progress`
- 預期：腳本自動等待並重試一次，最後 container 狀態回到 `Up`

### Case D：backup 不再輸出 socket 警告

- 前置：Paperclip data 目錄含 `.sock`
- 預期：`./start.sh backup-agent-data` 成功產出 archive，且輸出不出現 `pax format cannot archive sockets`

## 4. 驗證紀錄策略

- 本次以 terminal smoke 與 container state 檢查為主
- 後續若將 Row 126 納入自動化，建議補一支 `tools/agent-runtime/check-backup.sh`
