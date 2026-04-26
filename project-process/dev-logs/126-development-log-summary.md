# Row 126 開發日誌匯總（2026-04-27）

## 1. 今日完成項目

- 任務 A：Hermes Docker 啟停與更新流程補回 `start.sh`
  - 交付物：`tools/hermes-runtime/docker-compose.yml`、`start.sh` Hermes 啟動/更新入口、`stop.sh` Hermes 清理
  - 完成度：100%
- 任務 B：Paperclip 更新流程穩定化與 Docker-only 提示補強
  - 交付物：`start.sh` 的 `paperclip-update` 重試保護、啟動/更新提示文案、`docs/operational-guides/paperclip-docker-update.md`
  - 完成度：100%
- 任務 C：Hermes 更新路徑與資料保存說明補齊
  - 交付物：`start.sh` 的 `hermes-update`、啟動成功提示、`docs/operational-guides/hermes-docker-update.md`
  - 完成度：100%
- 任務 D：釐清 Hermes / Paperclip / OpenClaw 本機資料保存位置並接入摘要
  - 交付物：`start.sh all` 顯示資料路徑、`docs/operational-guides/agent-local-data-and-backup.md`
  - 完成度：100%
- 任務 E：新增一鍵備份 agent runtime 本機資料
  - 交付物：`start.sh backup-agent-data`、備份輸出到 `backups/agent-data/`
  - 完成度：100%

## 2. 技術與流程困難

### 困難 A：Hermes Dashboard container 持續 restart，`./start.sh hermes` 初期失敗

- 問題現象：Hermes Dashboard 無法連線，container 反覆 restart，畫面只看到 `Refusing to bind to 0.0.0.0`。
- 排查過程：
  - 檢查 `docker ps -a`、`docker inspect hermes-dashboard` 與 `docker logs hermes-dashboard`
  - 比對目前 compose 設定與 Hermes Docker 文件
  - 驗證 `curl http://localhost:9119` 與 `./start.sh hermes`
- 根因分析：Hermes dashboard 預設拒絕對 `0.0.0.0` 綁定，舊 container 又卡在 restart 狀態，形成啟動與重建混合故障。
- 最終解決方案：
  - `tools/hermes-runtime/docker-compose.yml` 加上 `--insecure`
  - host 端只綁定 `127.0.0.1`
  - `start.sh` 啟動前主動清理 stale `hermes-dashboard` / `hermes-opm` container
  - 補上 `hermes-update` 與啟動成功後的正確更新提示

### 困難 B：Paperclip 更新成功但 `paperclip-update` 曾回傳失敗

- 問題現象：`docker pull` 已完成，但 `docker compose up -d --force-recreate paperclip` 回報 `removal of container ... is already in progress`。
- 排查過程：
  - 比對更新失敗當下的 terminal output 與後續 `docker compose ... ps`
  - 確認新 digest 已下載、container 最後其實已恢復為 `Up`
  - 重跑同一條 update 流程驗證是否為 transient race
- 根因分析：Docker 在 force-recreate 過程中，舊 container 尚在移除狀態，新的 recreate 指令過早送出，造成一次性競態。
- 最終解決方案：
  - `start.sh` 的 `update_paperclip_image()` 加入失敗 log
  - 若偵測到 `removal ... already in progress`，等待 2 秒後自動重試一次
  - 重新驗證後可穩定回到 `Paperclip 已更新並重啟`

### 困難 C：一鍵備份雖成功，但夾帶 Unix socket 警告

- 問題現象：`./start.sh backup-agent-data` 成功產生 archive，但 tar 額外輸出 `pax format cannot archive sockets`。
- 排查過程：
  - 檢查警告檔案位置，定位為 Paperclip data 目錄中的執行期 socket
  - 審視備份函式目前直接打包整個目錄的做法
- 根因分析：備份流程未區分持久資料與執行期 socket / pipe，導致 tar 掃到不可歸檔的 runtime 檔案。
- 最終解決方案：
  - `backup_agent_data()` 改成先建立 tar 清單
  - 以 `find ... \( -type s -o -type p \) -prune -o -print` 排除 socket 與 pipe
  - 後續仍需再做一次完整執行驗證，確認輸出完全無噪音

## 3. 本日踩雷事件

### 踩雷 1：把 Docker 版 Hermes 的更新方式誤當成 repo / installer 型更新

- 影響：一開始從 Dashboard 內建 update 觸發 `Not a git repository. Please reinstall`，造成判斷延遲。
- 資源浪費：重複閱讀錯誤訊息與驗證更新路徑，增加診斷時間。
- 事前可預防指標：
  - 服務若來自 Docker image 而非本機 repo，內建 update 很可能不適用
  - 錯誤訊息若提到 `git repository` 或 `install.sh`，應優先懷疑部署型態不符

### 踩雷 2：備份指令成功但伴隨 runtime 檔案噪音

- 影響：雖然 archive 可用，但輸出看起來像半成功，降低後續維運信心。
- 資源浪費：需要二次人工確認是否只是警告、備份是否真的完整。
- 事前可預防指標：
  - 備份來源含 `.sock`、`tasks/`、`runtime-deps/` 等執行期目錄時，應先做 socket/pipe 排除
  - 備份函式若直接對整棵目錄 `tar`，高度可能混入非持久資料

## 4. 下次避免措施

- 流程優化：對所有 agent runtime 明確標記「本機 CLI」或「Docker image」，避免更新與資料保存路徑混淆。
- 工具導入：在 `start.sh` 維持每個 runtime 專屬的 update 指令與提示文案，禁止依賴 UI 內建 update 做唯一更新入口。
- 自動化需求：未來可追加 `./start.sh list-agent-data`，固定列出資料路徑、容量、最後修改時間，降低靠記憶維運的風險。
- 備份治理：backup / restore 腳本都應先定義「可持久化檔案白名單」與「runtime 噪音黑名單」，避免 socket、lock、PID 類型檔案混入。
- 驗證規則：任何 `*-update` 指令完成後，至少執行一次 container `ps` 與健康檢查，避免只以 pull 成功誤判整體更新成功。

## 5. 明日優先工作項目

- P1：補 `restore-agent-data` 還原腳本
  - 預估工時：2.5 小時
  - 相依性：需先決定還原時是否強制停止 Hermes / Paperclip / OpenClaw
  - 風險：若資料目錄與執行中 process 同步寫入，可能造成部份檔案覆蓋不一致
- P2：補 `list-agent-data` / 健康檢查摘要
  - 預估工時：1.5 小時
  - 相依性：依賴目前已確認的三個 data path
  - 風險：若 OpenClaw 未來更換 config root，需同步調整 path discovery
- P3：將 Row 126 的驗證腳本從手動 smoke 提升為自動化腳本
  - 預估工時：2 小時
  - 相依性：需決定要用 shell smoke、unit test，或 e2e/common 驗證策略
  - 風險：若測試直接操作本機 Docker / 全域 CLI，CI 與本機環境可能會有行為差異

## 6. 狀態判定

- 今日範圍內的 runtime 啟停、更新、資料保存與備份治理：Done
- 還原與資料盤點工具：Todo
- 自動化驗證擴充：Todo
