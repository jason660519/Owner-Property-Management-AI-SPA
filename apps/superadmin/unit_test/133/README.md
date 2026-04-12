# Unit tests — ID 133

**對應 roadmap 列**: Paperclip 全自動開發流程優化（功能代號 **133**，測試與 manifest 用此編號；`project-progress` Development Tab 顯示之 **Row ID** 依陣列順序可能為 **132**，送 Paperclip 時以 Modal 內實際 Row ID 為準。）  
**DEV-SPEC**: `project-process/features/paperclip-automation-optimization-dev-spec-20260413.md`  
**TDD-SPEC**: `project-process/features/paperclip-automation-optimization-tdd-spec-20260413.md`  
**運維指南**: `docs/operational-guides/paperclip-mac-mini-24h.md`  
**健康檢查**: `tools/paperclip/health-check.sh`

## 說明

審查通過後，請依 TDD-SPEC 在此目錄新增測試（或將測試放在與改動檔案鄰近的 `__tests__` 目錄，並在 TDD-SPEC／`test-manifest.json` 更新路徑）。

## 跨 ID 工具

可重用腳本請放在 `tools/<domain>/`，**不要**把 `tools/...` 路徑填入 `testScriptPath`（見 `docs/update-project-progress-guide.md`）。
