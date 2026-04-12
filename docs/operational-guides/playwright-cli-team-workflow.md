# Playwright CLI Team Workflow

目標：讓所有 AI 工程師用同一套瀏覽器自動化入口，降低 token 成本與 IDE/MCP 差異造成的不穩定。

## 為什麼這樣做

- `playwright-cli` 適合 AI 的快速互動式瀏覽器操作（探索、重現、生成步驟）。
- 正式可回歸測試仍以 `@playwright/test` 為主（可 CI、可審核、可重跑）。
- 透過版本鎖定，避免每位工程師各自安裝不同版本造成行為差異。

## Repo 內統一入口

- 版本檔：`tools/testing/playwright-cli-version.txt`
- 執行器：`tools/testing/playwright-cli.sh`
- 更新檢查：`tools/testing/check-playwright-cli-update.sh`

需求：本機需有 `bash`、`npm`，且執行更新檢查時可連線 npm registry。

## 常用命令

```bash
# 檢查目前鎖定版本是否可執行
npm run pwcli:version

# 直接開 superadmin（headed）
npm run pwcli:open:superadmin

# 檢查是否有新版可升級
npm run pwcli:update:check

# 將版本檔更新到 npm 最新版本
npm run pwcli:update:apply
```

## 建議工作流程（給 AI 工程師）

1. 先用 `playwright-cli` 快速重現流程、蒐集互動步驟。
2. 將產生的動作轉成 `apps/superadmin/e2e/**` 正式測試檔。
3. 補上必要 `expect` 斷言，不只做操作錄製。
4. 透過現有 `test-manifest.json` 與 nightly runner 編排執行。

## 定期更新機制建議

- 每週（或每個 sprint）至少執行一次 `npm run pwcli:update:check`。
- 若顯示有更新，先在功能分支執行 `npm run pwcli:update:apply`，再跑關鍵 smoke/regression 測試。
- 驗證通過才合併，避免新版本導入大規模 flaky。
- `tools/testing/run-superadmin-nightly.sh` 已整合 `pwcli:update:check`，採 non-blocking 模式（檢查失敗僅警告，不中斷 nightly 主測試）。
