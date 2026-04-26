# Agent Runtime Startup Hardening — TDD Progress Report

## 1. 今日驗證摘要

- `bash -n ./start.sh`：通過
- `./start.sh hermes`：最終通過，Dashboard 可連線
- `./start.sh hermes-update`：通過
- `./start.sh paperclip-update`：通過，容器成功重建
- `./start.sh backup-agent-data`：通過，成功產出 archive

## 2. 具體驗證結果

### Hermes

- 驗證：`curl http://localhost:9119`
- 結果：可連線
- 補充：曾出現 `Refusing to bind to 0.0.0.0`，經 compose 與 stale container 清理後恢復

### Paperclip

- 驗證：`docker compose --env-file docker/paperclip/.env.paperclip -f docker/paperclip/docker-compose.paperclip.yml ps`
- 結果：`paperclip-paperclip-1` 為 `Up`
- 驗證：`docker inspect --format '{{.Image}} {{.Created}}' paperclip-paperclip-1`
- 結果：container 已切到新 digest `sha256:c0ad6ea60f91a184aac3f32e1686bd78bb03a7da8a409a54d8a6d20917e1b5a5`

### Backup

- 驗證：`./start.sh backup-agent-data`
- 結果：成功產生 `backups/agent-data/agent-data-20260427-070556.tar.gz`
- 補充：目前已針對 socket/pipe 排除做修正，仍需再跑一次完整驗證確認警告已完全消失

## 3. 覆蓋率判定

- 單元測試覆蓋率：0%（本次未新增自動化單元測試）
- E2E 覆蓋率：0%（本次未新增 browser E2E）
- 手動 / smoke 驗證完成度：100%

## 4. 待補事項

- 建立 Row 126 專屬 shell smoke 腳本
- 讓 `backup-agent-data` 與未來 `restore-agent-data` 具備 fixture-based 自動化驗證
