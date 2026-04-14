# TDD — Row 009 網路安全／隱私審計（Security Dashboard）

**Issue:** VIS-96  
**Date:** 2026-04-14  

## Scope

- UI: `apps/superadmin/app/superadmin/dashboard/security/components/SecurityDashboardClient.tsx`
- Server actions: `apps/superadmin/app/superadmin/dashboard/security/actions.ts`（mock 於測試中）

## Tests added

| File | Notes |
|------|--------|
| `apps/superadmin/unit_test/009/security-dashboard.test.tsx` | 8 cases：標題與統計、稽核表列、異常分頁與 resolve、執行偵測、SSL 警示、白／黑名單新增、空稽核狀態 |

## Tooling fix

- `apps/superadmin/jest.config.js`：在載入 `next/jest` 前設定 `process.env.NODE_ENV = 'test'`，避免載入 `react.production`（無 `exports.act`）導致 `@testing-library/react` 失敗。

## Run

```bash
cd apps/superadmin && npx jest unit_test/009
```

## Outcome

- 8/8 tests passed（本機執行約 3–4 分鐘，含 Next/Jest 冷啟動）。
