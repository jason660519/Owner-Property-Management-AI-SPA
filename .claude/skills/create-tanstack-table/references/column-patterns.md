# ColumnDef Patterns

Source: `@tanstack/react-table` v8 — column definitions for EnhancedTable.

## ColumnMeta Type Augmentation

Already declared once in `development-table/columns.tsx`. Do NOT redeclare:

```tsx
// This exists in columns.tsx — do NOT add again
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    headerEn?: string;
    headerZh?: string;
  }
}
```

Just use `meta: { headerEn: '...', headerZh: '...' }` in your column defs.

## Column ID Convention

Use `col-` prefix to avoid conflicts with TanStack internal IDs:

```tsx
{ id: 'col-name', ... }     // Good
{ id: 'name', ... }         // Risky — may conflict
```

## Common Cell Patterns

### Sequential ID (auto-generated)

```tsx
{
  id: 'col-id',
  accessorFn: (_, idx) => idx,
  header: 'ID',
  meta: { headerEn: 'ID', headerZh: '編碼' },
  cell: ({ row }) => (
    <span className="font-mono text-xs text-text-secondary">
      {(row.index + 1).toString().padStart(3, '0')}
    </span>
  ),
}
```

### Text (truncated)

```tsx
{
  id: 'col-name',
  accessorKey: 'name',
  header: 'Name',
  meta: { headerEn: 'Name', headerZh: '名稱' },
  cell: ({ getValue }) => (
    <span className="text-sm font-medium text-text-primary truncate block max-w-[200px]" title={getValue() as string}>
      {getValue() as string}
    </span>
  ),
}
```

### Badge / Pill

```tsx
{
  id: 'col-category',
  accessorKey: 'category',
  header: 'Category',
  meta: { headerEn: 'Category', headerZh: '分類' },
  cell: ({ getValue }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary whitespace-nowrap">
      {getValue() as string}
    </span>
  ),
}
```

### Status Badge (colored)

```tsx
{
  id: 'col-status',
  accessorKey: 'status',
  header: 'Status',
  meta: { headerEn: 'Status', headerZh: '狀態' },
  cell: ({ getValue }) => {
    const v = getValue() as string;
    const colors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[v] ?? colors.inactive}`}>
        {v}
      </span>
    );
  },
}
```

### Progress Bar

```tsx
{
  id: 'col-progress',
  accessorKey: 'percentage',
  header: 'Progress',
  meta: { headerEn: 'Progress', headerZh: '進度' },
  cell: ({ getValue }) => {
    const v = (getValue() as number) ?? 0;
    return (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(v, 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-text-secondary w-8 text-right">{v}%</span>
      </div>
    );
  },
}
```

### Date

```tsx
{
  id: 'col-date',
  accessorKey: 'createdAt',
  header: 'Date',
  meta: { headerEn: 'Date', headerZh: '日期' },
  cell: ({ getValue }) => {
    const v = getValue() as string | undefined;
    if (!v) return <span className="text-text-muted italic text-xs">&mdash;</span>;
    return (
      <span className="text-xs font-mono text-text-secondary">
        {new Date(v).toLocaleDateString('zh-TW')}
      </span>
    );
  },
}
```

### Number (formatted)

```tsx
{
  id: 'col-amount',
  accessorKey: 'amount',
  header: 'Amount',
  meta: { headerEn: 'Amount', headerZh: '金額' },
  cell: ({ getValue }) => (
    <span className="text-sm font-mono text-text-primary">
      {((getValue() as number) ?? 0).toLocaleString()}
    </span>
  ),
}
```

### Action Buttons

```tsx
{
  id: 'col-actions',
  header: '',
  enableSorting: false,
  meta: { headerEn: 'Actions', headerZh: '操作' },
  cell: ({ row }) => (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onEdit(row.original)}
        className="p-1 rounded hover:bg-bg-secondary text-text-muted hover:text-accent">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onDelete(row.original.id)}
        className="p-1 rounded hover:bg-bg-secondary text-text-muted hover:text-red-500">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  ),
}
```

### Clickable Link / Name

```tsx
{
  id: 'col-name',
  accessorKey: 'name',
  header: 'Name',
  meta: { headerEn: 'Name', headerZh: '名稱' },
  cell: ({ row }) => (
    <button type="button" onClick={() => onEdit(row.original)}
      className="text-left font-medium text-text-primary hover:text-accent transition-colors truncate max-w-[200px] block"
      title={row.original.name}>
      {row.original.name}
    </button>
  ),
}
```

### Boolean Toggle (Star / Favorite)

```tsx
{
  id: 'col-favorite',
  header: '★',
  enableSorting: false,
  cell: ({ row }) => (
    <button type="button" onClick={() => onToggleFavorite(row.original.id)} className="p-0.5">
      <Star className={`w-4 h-4 ${row.original.isFavorite
        ? 'fill-yellow-400 text-yellow-400'
        : 'text-text-muted hover:text-yellow-400'}`} />
    </button>
  ),
}
```

### Empty / Null Placeholder

Use consistently across all columns:

```tsx
<span className="text-text-muted italic text-xs">&mdash;</span>
```

## Column Width Guidelines

| Column Type | Suggested Width % |
|:---|:---|
| ID / Index | 4–6 |
| Name / Title | 18–25 |
| Category / Status badge | 10–15 |
| Date | 10–12 |
| Progress bar | 12–18 |
| Actions (2-3 buttons) | 8–10 |
| Description / Long text | 20–30 |

Adjust so total ≈ 100. Example for 6 columns:
```tsx
const WIDTHS = [5, 25, 15, 20, 20, 15];  // sum = 100
```

## Dynamic Columns

For columns generated at runtime (e.g. role-based permissions matrix):

```tsx
const dynamicColumns = useMemo<ColumnDef<MyRow, unknown>[]>(() => {
  const base: ColumnDef<MyRow, unknown>[] = [
    { id: 'col-name', accessorKey: 'name', header: 'Name', meta: { headerEn: 'Name', headerZh: '名稱' } },
  ];
  const dynamic = roles.map(role => ({
    id: `col-role-${role.id}`,
    header: role.name,
    meta: { headerEn: role.name, headerZh: role.name },
    cell: ({ row }: { row: Row<MyRow> }) => (
      <input type="checkbox" checked={row.original.permissions[role.id]} onChange={...} />
    ),
  }));
  return [...base, ...dynamic];
}, [roles]);

// initialWidths must also be dynamic
const widths = useMemo(() => {
  const baseWidths = [20]; // name column
  const roleWidth = Math.max(5, 80 / roles.length);
  return [...baseWidths, ...roles.map(() => roleWidth)];
}, [roles]);
```
