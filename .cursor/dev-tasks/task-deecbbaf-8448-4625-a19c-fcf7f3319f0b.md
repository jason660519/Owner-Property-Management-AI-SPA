# Dev Task 015 – 公司產品費用說明頁

## Context
- IDE: Cursor
- Row ID: 015
- Task ID: deecbbaf-8448-4625-a19c-fcf7f3319f0b

## Prompt

請針對這一筆工作（Row ID「015」）以及選定的 IDE「Cursor」從架構與技術決策角度進行檢視與實作。
請先閱讀：
1) Feature Spec URL：（尚未設定 Feature Spec URL）
2) TDD Spec URL：/project-process/features/tdd-company-pages-thirdparty-20260221.html

角色重點：架構一致性、擴展性、安全性與技術選型；與既有 docs/、.claude/rules/ 及 docs/technical-selection 對齊。必要時產出或更新架構說明、決策記錄與風險評估。仍須依 TDD 撰寫測試並更新 TDD PROGRESS REPORT。
單元測試：apps/superadmin/unit_test/015
E2E 測試：apps/superadmin/e2e/015

完成後請更新 TDD PROGRESS REPORT：架構/決策摘要、變更清單、測試結果。
確認完成今日的 TDD Progress Report、測試腳本全部通過後，請自行 git commit and push to github repo。

## Metadata
```json
{
  "e2eFolder": "apps/superadmin/e2e/015",
  "tddSpecDocPath": "/project-process/features/tdd-company-pages-thirdparty-20260221.html",
  "unitTestFolder": "apps/superadmin/unit_test/015",
  "featureSpecDocPath": null
}
```

> 依照上述 Prompt 與 Metadata，使用指定 IDE 執行 TDD 開發與測試。