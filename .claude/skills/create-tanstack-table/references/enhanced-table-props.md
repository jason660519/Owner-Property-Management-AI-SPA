# EnhancedTable Props API

Source: `apps/superadmin/components/ui/EnhancedTable.tsx`

## Props Interface

```tsx
interface EnhancedTableProps<T> {
  tableId: string;                    // Required — localStorage + DB persistence key
  columns: ColumnDef<T, unknown>[];   // Required — TanStack column definitions
  data: T[];                          // Required — row data array
  initialWidths: number[];            // Required — column width percentages (sum ≈ 100)

  enableRowSelection?: boolean;       // Show checkbox column
  onSelectionChange?: (selectedRows: T[]) => void;
  getCategoryValue?: (row: T) => string;     // Enables category filter chips
  getSearchValue?: (row: T) => string;       // Enables global search
  renderBatchActions?: (selectedRows: T[], clearSelection: () => void) => React.ReactNode;
  onAddRow?: () => void;              // Shows "新增 Row" button
  pageSizes?: number[];               // Enables pagination (e.g. [20, 50, 100])
  minWidth?: number;                  // Enables horizontal scroll (px)
  extraToolbar?: React.ReactNode;     // Extra buttons after standard toolbar
}
```

## Built-in Features (no config needed)

Once you render `<EnhancedTable>`, these features work automatically:

- **Search box** — filters rows using `getSearchValue`
- **Category chips** — "All" + unique values from `getCategoryValue`
- **Alignment controls** — per-column horizontal (left/center/right) + vertical (top/middle/bottom)
- **View dropdown** — freeze row count (0 or 1) + freeze data column count
- **Save / Load / Reset Widths** — named width presets persisted to localStorage + DB
- **Column resize** — drag handle between column headers (see "Column Resize" section below)
- **Sorting** — click header to cycle: ascending → descending → none
- **Preferences persistence** — via `useTablePreferences` hook (localStorage + Supabase `user_table_preferences`)

## Column Resize (how it works + requirements)

Column resize is built into `EnhancedTable` — you do NOT need to pass any extra prop or enable it. A 4px-wide drag handle is rendered on the right edge of every non-last header cell.

**Requirements for resize to work correctly on a new table**:

1. **`initialWidths.length === columns.length`** — EnhancedTable patches a percentage array on drag; a length mismatch silently falls back to `initialWidths` every render and the user's drag is lost on the next mount. Assert this at module top:
   ```tsx
   const WIDTHS = [10, 20, 25, 25, 20];
   // At build/dev time:
   if (WIDTHS.length !== columns.length) {
     throw new Error('WIDTHS length must match columns length');
   }
   ```

2. **`initialWidths` values sum to ~100** — they are percentages of the table inner width. A sum far from 100 makes dragging feel wrong (columns jump or clip).

3. **Each column needs ≥ 40px equivalent in percentage** — `handleResizeStart` refuses to shrink a column below `(40 / containerW) * 100` percent. On a 1200px container that's ~3.3%. Don't start with values smaller than ~4%.

4. **Do NOT wrap `<EnhancedTable>` in a container with `overflow: hidden`** — the resize handle sits right on the cell edge and can be clipped. Use `overflow-auto` or leave overflow default. If you need a bounded layout, set `minWidth` prop and let EnhancedTable's internal `overflow-auto` scroll.

5. **Do NOT wrap in a parent with `pointer-events: none`** — the `onMouseDown` on the drag handle won't fire.

6. **Unique `tableId`** — `colWidths` is persisted per `tableId` in localStorage + `user_table_preferences` (Supabase). If two tables share a `tableId`, their widths overwrite each other and the user will see mysterious resets.

**How the user drags**:
- Hover between two column headers → cursor becomes `col-resize` + a blue line highlights
- Drag left/right to shrink/grow the two adjacent columns (sum is preserved)
- On mouse up, the new widths are immediately saved via `patch({ colWidths: ... })`
- `Save Widths` / `Load` / `Reset Widths` buttons in the toolbar save named presets

**To persist the new widths as the default** (for all users):
Either update `initialWidths` in the source, or let users `Save Widths` which writes to their own preferences row in Supabase.

**Known bug (fixed 2026-04-11)**: Header cells previously lacked `position: relative`, so the absolute-positioned resize handle escaped to the outer header wrapper and all handles for non-frozen columns collapsed onto the same right edge — making resize appear broken on every new table. Fixed in `EnhancedTable.tsx` and `development-table/TableCore.tsx`. See `troubleshooting.md` issue #7 for details.

## Minimal Example

```tsx
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import EnhancedTable from '@/components/ui/EnhancedTable';

interface User { id: string; name: string; role: string; email: string; }

const WIDTHS = [10, 30, 25, 35];

export function UserTable({ users }: { users: User[] }) {
  const columns = useMemo<ColumnDef<User, unknown>[]>(() => [
    { id: 'col-id', accessorKey: 'id', header: 'ID',
      meta: { headerEn: 'ID', headerZh: '編碼' } },
    { id: 'col-name', accessorKey: 'name', header: 'Name',
      meta: { headerEn: 'Name', headerZh: '名稱' } },
    { id: 'col-role', accessorKey: 'role', header: 'Role',
      meta: { headerEn: 'Role', headerZh: '角色' } },
    { id: 'col-email', accessorKey: 'email', header: 'Email',
      meta: { headerEn: 'Email', headerZh: '電郵' } },
  ], []);

  return (
    <EnhancedTable<User>
      tableId="user_table"
      columns={columns}
      data={users}
      initialWidths={WIDTHS}
      getCategoryValue={u => u.role}
      getSearchValue={u => `${u.name} ${u.email} ${u.role}`}
      minWidth={700}
    />
  );
}
```

## With Row Selection + Batch Actions

```tsx
<EnhancedTable<User>
  tableId="user_table"
  columns={columns}
  data={users}
  initialWidths={WIDTHS}
  enableRowSelection
  renderBatchActions={(selected, clear) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <span className="text-sm font-medium">{selected.length} 項已選</span>
      <button
        type="button"
        onClick={() => { handleDelete(selected); clear(); }}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
      >
        批次刪除
      </button>
    </div>
  )}
/>
```

## With Pagination

```tsx
<EnhancedTable<User>
  tableId="user_table"
  columns={columns}
  data={users}
  initialWidths={WIDTHS}
  pageSizes={[20, 50, 100]}    // First value is default page size
/>
```

## With Extra Toolbar (e.g. CSV Export)

```tsx
<EnhancedTable<AuditLog>
  tableId="audit_log"
  columns={columns}
  data={logs}
  initialWidths={WIDTHS}
  extraToolbar={
    <button
      type="button"
      onClick={handleExportCSV}
      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border-default hover:bg-bg-secondary"
    >
      <Download className="w-3.5 h-3.5" /> CSV
    </button>
  }
/>
```

## With Add Row

```tsx
const [showAddModal, setShowAddModal] = useState(false);

<EnhancedTable<MyRow>
  tableId="my_table"
  columns={columns}
  data={rows}
  initialWidths={WIDTHS}
  onAddRow={() => setShowAddModal(true)}
/>
{showAddModal && <AddRowModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
```

## Import

```tsx
import EnhancedTable from '@/components/ui/EnhancedTable';
```

Note: it's a **default export**.
