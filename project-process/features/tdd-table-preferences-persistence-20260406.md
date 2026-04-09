# TDD Spec: 表格偏好設定持久化

> **建立日期**: 2026-04-06 | **作者**: Claude Opus 4.6
> **Row ID**: 108

## 測試範圍

### 單元測試

#### useTablePreferences hook

| # | 測試案例 | 預期結果 |
|---|---------|---------|
| 1 | 初始化時無 localStorage 資料 | 使用 defaults |
| 2 | 初始化時有 localStorage 資料 | 合併 defaults + localStorage |
| 3 | `patch()` 後 localStorage 立即更新 | JSON.parse(localStorage.getItem(key)) 包含更新值 |
| 4 | `patch()` 後 debounce 1.5s 觸發 DB 寫入 | `setTableSettings` 被呼叫 |
| 5 | 連續 `patch()` 只觸發一次 DB 寫入 | debounce 合併多次呼叫 |
| 6 | unmount 時 flush pending writes | `setTableSettings` 被呼叫 |
| 7 | DB fetch 失敗時 graceful fallback | 不 crash，使用 localStorage 資料 |

#### table-settings server actions

| # | 測試案例 | 預期結果 |
|---|---------|---------|
| 1 | 未登入時呼叫 getTableSettings | 回傳 `{ data: null, error: 'Unauthorized' }` |
| 2 | 登入後 setTableSettings + getTableSettings round-trip | 資料一致 |
| 3 | upsert 同一 page_key 多次 | 最後一次的值覆蓋前次 |

### 整合測試

| # | 測試案例 | 預期結果 |
|---|---------|---------|
| 1 | PropertiesList 調整欄寬後重新載入 | 欄寬保持不變 |
| 2 | DevelopmentTab 凍結列後切換頁面再回來 | 凍結設定保持 |
| 3 | ModelEvaluator 對齊設定跨 session 持久化 | 設定保持 |
| 4 | v1 localStorage 遷移至 v2 | 舊設定正確還原 |

### Mock 策略

- `localStorage`: 使用 jsdom 內建實作
- `setTableSettings` / `getTableSettings`: jest.mock server actions
- Supabase client: 不在單元測試中直接測試（由 server actions 封裝）

## 測試檔案位置

- `apps/superadmin/lib/hooks/__tests__/useTablePreferences.test.ts`
- `apps/superadmin/lib/actions/__tests__/table-settings.test.ts`
