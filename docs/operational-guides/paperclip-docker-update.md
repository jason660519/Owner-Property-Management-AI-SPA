# Paperclip Docker 更新備忘

## 適用範圍

本專案的 Paperclip 透過 Docker Compose 啟動，不是系統全域安裝。

相關檔案：
- `start.sh`
- `docker/paperclip/docker-compose.paperclip.yml`
- `docker/paperclip/.env.paperclip`

## 正確更新方式

在專案根目錄執行：

```bash
./start.sh paperclip-update
```

等價的手動流程：

```bash
docker pull $(grep '^PAPERCLIP_IMAGE=' docker/paperclip/.env.paperclip | cut -d= -f2-)
docker compose --env-file docker/paperclip/.env.paperclip -f docker/paperclip/docker-compose.paperclip.yml up -d --force-recreate paperclip
```

## 補充

- 啟動指令是 `./start.sh paperclip`
- 如果 `PAPERCLIP_AUTO_PULL=1`，每次啟動前都會先嘗試拉新 image
- 若容器目前未啟動，`paperclip-update` 只會更新 image；之後執行 `./start.sh paperclip` 即可使用新版本
