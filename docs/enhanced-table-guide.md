# EnhancedTable & BottomSheetTabs 建表指南

> **建立日期**: 2026-04-08 | **位置**: `docs/enhanced-table-guide.md`
> **快捷方式**: 在 Claude Code 中執行 `/create-table` 可自動產出表格程式碼

---

## 架構總覽

本專案使用 **TanStack Table v8** 作為統一的表格解決方案，封裝為兩個共用元件：

```
apps/superadmin/components/ui/
├── EnhancedTable.tsx      (~580 行) TanStack Table 包裝器，內建完整 toolbar
└── BottomSheetTabs.tsx    (~70 行)  Excel 風格底部分頁切換
```

### 為什麼選擇 TanStack Table？

| 考量 | 手刻 CSS Grid 表格 | TanStack Table |
|:---|:---|:---|
| 排序 | 需自行實作 | `getSortedRowModel()` 內建 |
| 篩選 | 需自行管理 state | `getFilteredRowModel()` 內建 |
| 分頁 | 需自行切割 data | `getPaginationRowModel()` 內建 |
| 欄位定義 | 散佈在 JSX 中 | 集中在 `ColumnDef[]` |
| 虛擬捲動 | 需自行實作 | `@tanstack/react-virtual` 整合 |
| 型別安全 | 弱 | 泛型全覆蓋 |
| 維護成本 | 高（DevelopmentTab 曾達 1,893 行） | 低（EnhancedTable 統一維護） |

### 為什麼不用 TanStack 內建的 Column Pinning？

TanStack 的 `columnPinning` 是透過將 table 拆成左/中/右三個 `<table>` 來實現，在 CSS Grid 佈局下會破壞欄寬同步。本專案改用 **CSS `position: sticky` + 動態計算 `left` offset**，在單一 grid 容器中實現凍結效果，同時保持欄寬拖曳一致性。

---

## 快速開始：5 分鐘建一張表

### 1. 定義欄位

```tsx
// my-feature/columns.tsx
import type { ColumnDef } from '@tanstack/react-table';
import type { MyRow } from './types';

export function createColumns(): ColumnDef<MyRow, unknown>[] {
  return [
    {
      id: 'col-name',
      accessorKey: 'name',
      header: 'Name',
      meta: { headerEn: 'Name', headerZh: '名稱' },
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-text-primary truncate">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'col-status',
      accessorKey: 'status',
      header: 'Status',
      meta: { headerEn: 'Status', headerZh: '狀態' },
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary">
            {v}
          </span>
        );
      },
    },
    // ...
  ];
}
```

### 2. 設定欄寬

```tsx
// 每個數字代表該欄佔比 %，總和 ≈ 100
const INITIAL_WIDTHS = [30, 20, 20, 15, 15];
```

### 3. 組裝 EnhancedTable

```tsx
import { useMemo } from 'react';
import EnhancedTable from '@/components/ui/EnhancedTable';
import { createColumns } from './columns';

const WIDTHS = [30, 20, 20, 15, 15];

export function MyFeatureTable({ data }: { data: MyRow[] }) {
  const columns = useMemo(() => createColumns(), []);

  return (
    <EnhancedTable<MyRow>
      tableId="my_feature"
      columns={columns}
      data={data}
      initialWidths={WIDTHS}
      getCategoryValue={r => r.category}
      getSearchValue={r => `${r.name} ${r.category}`}
      minWidth={900}
    />
  );
}
```

這樣就完成了。EnhancedTable 自動提供：搜尋框、分類篩選、排版對齊、View 凍結、Save/Reset Widths、欄寬拖曳、排序。

---

## EnhancedTable Props 完整文件

| Prop | 型別 | 必填 | 預設 | 說明 |
|:---|:---|:---|:---|:---|
| `tableId` | `string` | ✅ | — | localStorage / DB 持久化 key，全域唯一 |
| `columns` | `ColumnDef<T>[]` | ✅ | — | TanStack column definitions |
| `data` | `T[]` | ✅ | — | 資料陣列 |
| `initialWidths` | `number[]` | ✅ | — | 欄寬百分比（長度 = columns 長度，sum ≈ 100） |
| `getCategoryValue` | `(row: T) => string` | | — | 啟用分類篩選；即使 data 為空仍顯示按鈕 |
| `getSearchValue` | `(row: T) => string` | | — | 全域搜尋用的字串組合器 |
| `enableRowSelection` | `boolean` | | `false` | 啟用 checkbox 行選取 |
| `onSelectionChange` | `(rows: T[]) => void` | | — | 行選取變更回調 |
| `renderBatchActions` | `(rows, clear) => ReactNode` | | — | 選取後顯示的批次操作 UI |
| `onAddRow` | `() => void` | | — | 顯示「新增 Row」按鈕並綁定回調 |
| `pageSizes` | `number[]` | | — | 分頁選項（如 `[20, 50, 100]`）；省略則不分頁 |
| `minWidth` | `number` | | — | 表格最小寬度 px（啟用水平捲動） |
| `extraToolbar` | `ReactNode` | | — | 工具列右側額外按鈕（如 CSV export） |

---

## BottomSheetTabs 用法

適用場景：一個頁面內有多個相關但獨立的表格或視圖（如「開發/測試/部署/運維」）。

```tsx
import { BottomSheetTabs, type SheetTabDef } from '@/components/ui/BottomSheetTabs';
import { FileText, Settings } from 'lucide-react';

const TABS: SheetTabDef[] = [
  {
    id: 'documents',
    label: 'Documents',
    zhLabel: '文件',
    icon: FileText,
    color: 'text-emerald-600',        // 非 active 時的 icon 色
    activeColor: 'bg-emerald-600 text-white',  // active 時的背景 + 文字色
    badge: 42,                         // 右上角數字（選用）
  },
  {
    id: 'settings',
    label: 'Settings',
    zhLabel: '設定',
    icon: Settings,
    color: 'text-blue-600',
    activeColor: 'bg-blue-600 text-white',
  },
];
```

### 頁面結構

```tsx
<div className="flex-1 min-h-0 flex flex-col">
  {/* Content area */}
  <div className="flex-1 min-h-0 flex flex-col">
    {activeTab === 'documents' && <DocumentsTable />}
    {activeTab === 'settings'  && <SettingsPanel />}
  </div>

  {/* Bottom tabs — always visible */}
  <BottomSheetTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
</div>
```

> **重要**：外層容器需要 `flex-1 min-h-0 flex flex-col`，讓 content 填滿剩餘空間，tabs 固定在底部。

---

## ColumnDef 撰寫技巧

### ColumnMeta 型別擴充

專案已在 `development-table/columns.tsx` 宣告 module augmentation：

```tsx
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerEn?: string;
    headerZh?: string;
  }
}
```

其他檔案**不需重複宣告**，直接使用 `meta: { headerEn: '...', headerZh: '...' }` 即可。

### 常見 cell 渲染模式

**文字**：
```tsx
cell: ({ getValue }) => (
  <span className="text-sm text-text-primary truncate">{getValue() as string}</span>
)
```

**Badge**：
```tsx
cell: ({ getValue }) => (
  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary">
    {getValue() as string}
  </span>
)
```

**進度條**：
```tsx
cell: ({ getValue }) => {
  const v = (getValue() as number) ?? 0;
  return <ProgressBar percentage={v} />;
}
```

**日期**：
```tsx
cell: ({ getValue }) => (
  <span className="text-xs font-mono text-text-secondary">
    {getValue() as string ?? '—'}
  </span>
)
```

**空值佔位**：
```tsx
<span className="text-text-muted italic text-xs">—</span>
```

---

## 持久化機制

`EnhancedTable` 內部使用 `useTablePreferences` hook 雙寫偏好設定：

1. **localStorage**：即時讀寫，無延遲
2. **Supabase DB**：背景同步（`user_table_preferences` 表），跨裝置持久化

持久化的項目：
- 欄寬百分比 (`colWidths`)
- 欄對齊設定 (`columnAlignments`)
- 凍結行/列數 (`freezeRowCount`, `frozenDataColCount`)
- 寬度預設集 (`widthPresets`)

---

## 設計決策記錄

### 為什麼用 CSS Grid 而非 `<table>`？

- `<table>` 的 sticky positioning 行為在不同瀏覽器中不一致
- CSS Grid 允許精確控制每欄寬度（百分比 + 拖曳調整）
- Grid 配合 `position: sticky` 可實現凍結行/列

### 為什麼凍結行要在 header container div 加 `sticky top-0`？

在 CSS Grid 中，個別 header cell 的 `sticky` 不會生效（因為 grid 的 implicit row 不構成 scroll container）。必須在包裹所有 header cells 的 container div 上設定 `sticky top-0`。

### 為什麼不用 `@tanstack/react-virtual`？

目前資料量（<200 行）不需要虛擬捲動。未來若資料量超過 500 行，可在 `EnhancedTable` 內加入 `useVirtualizer`，不影響 consumer 端 API。

---

## 現有實作一覽

| 頁面 | 表格元件 | 欄數 | 特色功能 |
|:---|:---|:---|:---|
| Project Progress (Dev) | 自訂 TableCore | 14 | Prompt Modal、Status dropdown、自訂列 |
| Project Progress (Test/Deploy/Ops) | EnhancedTable | 8-9 | Per-sheet 自訂列持久化 |
| Contacts | EnhancedTable | 8 | 行選取 + 批次操作（刪除/匯出/指派） |
| Prompt Management | EnhancedTable | 5 | 分類篩選 + 分頁 |
| IAM Overview (Audit Log) | EnhancedTable | 6 | extraToolbar CSV export |
| IAM Roles (RBAC Matrix) | EnhancedTable | 17 | 動態 role column generation |
| LLM Monitor (Usage Logs) | EnhancedTable | 8 | BottomSheetTabs 3 分頁 |
| LLM Monitor (Token Cost) | EnhancedTable | 6 | 同上 |

---

## 疑難排解

| 問題 | 原因 | 解法 |
|:---|:---|:---|
| 欄位數與 initialWidths 長度不符 | 陣列長度不匹配 | 確保 `columns.length === initialWidths.length` |
| 分類按鈕不出現 | 未提供 `getCategoryValue` | 加上 `getCategoryValue={r => r.category}` |
| 凍結列不固定 | `minWidth` 太小 | 增加 `minWidth` 確保需要水平捲動 |
| TypeScript ColumnMeta 錯誤 | 重複 module augmentation | 移除重複宣告，只保留 `columns.tsx` 中的一份 |
| 欄寬拖曳後不保存 | 未點 Save Widths | Save Widths 是手動操作；或使用寬度預設集 |
