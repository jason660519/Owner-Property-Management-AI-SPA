# Hermes Docker 更新備忘

## 適用範圍

本專案的 Hermes 透過 Docker Compose 啟動，不是系統全域安裝，也不是本機 git checkout 直接執行。

相關檔案：
- `start.sh`
- `tools/hermes-runtime/docker-compose.yml`

## 重要限制

Hermes Dashboard 內建的 `Update Hermes` 動作不適用於本專案目前的 Docker 部署模式。

原因：
- Dashboard 內部會嘗試走 `hermes update`
- `hermes update` 預期自己所在環境是可更新的 Hermes 程式目錄
- Docker container 內使用的是 image，不是可直接 `git pull` 的工作目錄
- 因此會出現 `Not a git repository. Please reinstall` 之類的訊息

這不是本專案故障，而是更新路徑不相容。

## 正確更新方式

在專案根目錄執行：

```bash
./start.sh hermes-update
```

等價的手動流程：

```bash
cd tools/hermes-runtime
docker compose pull
docker compose up -d
```

## 補充

- Hermes 設定與資料保存在 `~/.hermes-opm`
- 更新 container 不會清掉上述資料目錄
- 若 Dashboard 已在執行，`hermes-update` 會重新建立容器套用新 image
