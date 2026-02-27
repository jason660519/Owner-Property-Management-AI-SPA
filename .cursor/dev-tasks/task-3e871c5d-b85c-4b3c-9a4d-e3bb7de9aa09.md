# Dev Task 005 – 超級管理員針對 各種Roles的 Access Matrix管理平台

## Context
- IDE: Cursor
- Row ID: 005
- Task ID: 3e871c5d-b85c-4b3c-9a4d-e3bb7de9aa09

## Prompt

請針對這一筆工作（Row ID「005」）以及選定的 IDE「Cursor」以測試為先進行開發與驗證。
請先閱讀：
1) Feature Spec URL：/project-process/features/iam-system.html
2) TDD Spec URL：/project-process/features/tdd-superadmin-platform-20260221.html

角色重點：先撰寫單元測試（Vitest）與 E2E（Playwright），覆蓋 Happy Path、邊界條件與錯誤路徑，再撰寫實作以通過測試。目標覆蓋率 80%+，並確保 TDD 報告中列出所有測試案例與執行結果。
單元測試目錄：apps/superadmin/unit_test/005
E2E 測試目錄：apps/superadmin/e2e/005

完成後請新增或更新 TDD PROGRESS REPORT：測試案例清單、通過/失敗、重試與修正說明。
確認完成今日的 TDD Progress Report、測試腳本全部通過後，請自行 git commit and push to github repo。

## Metadata
```json
{
  "e2eFolder": "apps/superadmin/e2e/005",
  "tddSpecDocPath": "/project-process/features/tdd-superadmin-platform-20260221.html",
  "unitTestFolder": "apps/superadmin/unit_test/005",
  "featureSpecDocPath": "/project-process/features/iam-system.html"
}
```

> 依照上述 Prompt 與 Metadata，使用指定 IDE 執行 TDD 開發與測試。