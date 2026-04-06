# Dev Spec: 表格偏好設定持久化（localStorage + DB 雙寫）

> **建立日期**: 2026-04-06 | **作者**: Claude Opus 4.6
> **Row ID**: 108 | **Phase**: development

## 功能概述

為 Superadmin 所有主要表格頁面提供使用者偏好設定的跨裝置持久化能力。使用者調整的欄寬、凍結欄/列、對齊方式等設定，透過 localStorage + Supabase DB 雙寫機制，確保切換瀏覽器或裝置後仍可還原。

## 架構設計

### 核心 Hook: `useTablePreferences<T>`

```
apps/superadmin/lib/hooks/useTablePreferences.ts
```

**泛型參數**: `T extends Record<string, unknown>` — 各頁面自定義的設定型別

**讀取流程**:
1. 初始化時從 localStorage 讀取（毫秒級還原，無閃爍）
2. mount 後非同步從 DB（`user_page_settings` 表）fetch
3. 若 localStorage 為空則採用 DB 資料；否則信任 localStorage（較新）

**寫入流程**:
1. `patch(partial)` → 立即寫入 localStorage
2. Debounce 1.5 秒後寫入 DB（防止拖曳操作產生大量 DB 寫入）
3. unmount 時 flush 尚未寫入的 pending writes

### Server Actions

```
apps/superadmin/lib/actions/table-settings.ts
```

- `getTableSettings<T>(pageKey)` — 從 `user_page_settings` 讀取（RLS: 只能讀自己的）
- `setTableSettings<T>(pageKey, settings)` — UPSERT 到 `user_page_settings`

### DB 表

複用既有的 `user_page_settings` 表（migration `20260219100000`）:
- PK: `(user_id, page_key)`
- `settings`: JSONB
- RLS: 使用者只能 CRUD 自己的 rows

## 已遷移頁面

| 頁面 | page_key | localStorage key | 設定欄位數 |
|------|----------|-----------------|-----------|
| PropertiesList | `properties_list` | `properties_list_settings_v2` | 6 |
| DevelopmentTab | `project_progress` | `project_progress_settings_v2` | 8 |
| ModelEvaluator | `model_evaluator` | `model_evaluator_settings_v2` | 6 |

### 各頁面設定欄位

**PropertiesList**: columnSizing, freezeRowCount, frozenDataColCount, tableAlignH, tableAlignV, pageSize

**DevelopmentTab**: colWidths, headerHeight, columnAlignments, freezeRowCount, frozenDataColCount, widthPresets, customRows, hiddenRowKeys

**ModelEvaluator**: columnWidths, promptColumnLabel, freezeRowCount, frozenColCount, tableAlignH, tableAlignV

## 遷移策略

每個頁面在 module scope 執行一次性遷移：
1. 檢查 v2 key 是否已存在
2. 若不存在，讀取所有舊 v1 keys 合併為 v2 格式
3. 寫入 v2 localStorage key
4. 舊 v1 keys 保留不刪（向後相容）

## 檔案清單

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `lib/hooks/useTablePreferences.ts` | 新增 | 核心雙寫 hook |
| `lib/actions/table-settings.ts` | 新增 | 通用 server actions |
| `components/admin/properties/PropertiesList.tsx` | 修改 | 遷移 3 個 localStorage states |
| `app/superadmin/dashboard/project-progress/components/DevelopmentTab.tsx` | 修改 | 移除 ~200 行 load/persist，遷移 8 個 keys |
| `components/ai-settings/ModelEvaluator.tsx` | 修改 | 遷移 4 個 localStorage states |

## 擴充指南

新增頁面時只需：
1. 定義 `interface MyPageSettings extends Record<string, unknown> { ... }`
2. 定義 defaults 常數
3. 在元件中呼叫 `useTablePreferences({ pageKey, storageKey, defaults })`
4. 使用 `settings.xxx` 讀取、`patch({ xxx: newValue })` 寫入
