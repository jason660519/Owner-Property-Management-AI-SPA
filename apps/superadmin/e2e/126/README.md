# Row 126 E2E Placeholder

本 Row 目前沒有 browser E2E 腳本。

原因：

- 涉及本機 Docker container 與全域 CLI (`openclaw`) 的環境相依
- 本次驗證以 terminal smoke 與 container state 檢查為主

後續若要補 E2E，建議拆為：

- 啟動摘要顯示資料路徑
- backup 執行結果顯示與下載入口（若未來提供 UI）
