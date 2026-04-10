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

### Numeric columns — THE primary rule

> **Cells store NUMBERS. Units live in the HEADER. Never embed `$`, `k`, `M`, `%`, `tok/s` or any other symbol in the cell value.**

This is the single most important rule for numeric columns. Follow it and TanStack's default numeric sort "just works" — no custom `sortingFn`, no auto-detection, no parser quirks. Break it and you will debug wrong sort order.

**Why it matters** — if the cell value is a `string`, TanStack v8 falls back to `alphanumeric` (lexicographic) sort:

| Raw data | TanStack default asc (wrong) | Correct asc |
|---|---|---|
| `"$4.50" / "$10.00" / "$5.63" / "$4.81"` | `$10.00, $4.50, $4.81, $5.63` ❌ | `$4.50, $4.81, $5.63, $10.00` |
| `"128k" / "32k" / "1M" / "200k"` | `128k, 1M, 200k, 32k` ❌ | `32k, 128k, 200k, 1M` |
| `"8.2" / "120.3" / "72.5" / "45"` | `120.3, 45, 72.5, 8.2` ❌ | `8.2, 45, 72.5, 120.3` |

Even *plain* numeric strings fail (`'8' > '1'` as characters). The only reliable fix is to stop treating these as strings in the data layer.

**The correct shape** — row type uses `number | null`, parser/API returns numbers:

```ts
// ✅ DO — numbers in the type, null for missing
type Row = {
  model: string;
  contextWindowTokens: number | null;    // 128_000, 1_000_000, null
  blendedUsdPer1m: number | null;        // 4.5, 10, 0.75, null
  medianTokensPerSecond: number | null;  // 72.5, 120.3, null
  latencyFirstChunkSeconds: number | null;
};

// ❌ DON'T — display strings in the type
type RowBad = {
  model: string;
  contextWindow: string;         // "128k"
  blendedUsdPer1m: string;       // "$4.50"
  medianTokensPerSecond: string; // "72.5"
};
```

**Column defs — units in header, formatting in cell renderer, NO `sortingFn`**:

```tsx
const PLACEHOLDER = '—';

function fmtNumber(
  n: number | null,
  opts?: { decimals?: number; withCommas?: boolean },
): string {
  if (n == null) return PLACEHOLDER;
  const { decimals, withCommas = false } = opts ?? {};
  if (withCommas) {
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    });
  }
  if (typeof decimals === 'number') return n.toFixed(decimals);
  return String(n);
}

// Currency — unit "(USD/1M)" in header, cell shows "4.50"
{
  id: 'col-price',
  accessorKey: 'blendedUsdPer1m',
  header: 'Price (USD/1M)',
  meta: { headerEn: 'Price (USD/1M)', headerZh: '價格 (USD/1M)' },
  cell: ({ row }) => (
    <span className="font-mono text-sm text-text-primary text-center block">
      {fmtNumber(row.original.blendedUsdPer1m, { decimals: 2 })}
    </span>
  ),
}

// Token counts — unit "(tokens)" in header, cell shows "128,000"
{
  id: 'col-context',
  accessorKey: 'contextWindowTokens',
  header: 'Context (tokens)',
  meta: { headerEn: 'Context (tokens)', headerZh: 'Context Window' },
  cell: ({ row }) => (
    <span className="font-mono text-sm text-text-primary text-center block">
      {fmtNumber(row.original.contextWindowTokens, { withCommas: true })}
    </span>
  ),
}

// Rate — unit "(tok/s)" in header, cell shows "72.5"
{
  id: 'col-rate',
  accessorKey: 'medianTokensPerSecond',
  header: 'Output (tok/s)',
  meta: { headerEn: 'Output (tok/s)', headerZh: '輸出速度 (tok/s)' },
  cell: ({ row }) => (
    <span className="font-mono text-sm text-text-primary text-center block">
      {fmtNumber(row.original.medianTokensPerSecond, { decimals: 1 })}
    </span>
  ),
}

// Percentage — unit "%" in header, cell shows "87"
{
  id: 'col-uptime',
  accessorKey: 'uptimePercent',
  header: 'Uptime (%)',
  meta: { headerEn: 'Uptime (%)', headerZh: '可用率 (%)' },
  cell: ({ row }) => (
    <span className="font-mono text-sm text-text-primary text-center block">
      {fmtNumber(row.original.uptimePercent, { decimals: 1 })}
    </span>
  ),
}
```

**Header unit conventions** — use parentheses, place at end of the English header:

| Quantity | Header format |
|---|---|
| Currency | `Price (USD/1M)`, `Revenue (TWD)` |
| Tokens | `Context (tokens)`, `Throughput (tok/s)` |
| Time | `Latency (s)`, `TTL (min)`, `Duration (h)` |
| Size | `RAM (GB)`, `File size (MB)` |
| Count | `Calls`, `Requests`, `Users` (no unit needed) |
| Percentage | `Uptime (%)`, `CTR (%)` |
| Temperature | `Max temp (°C)` |

Use the SAME unit for ALL rows in the column. Do NOT mix `"128k"` and `"1M"` in one column — pick one unit (tokens) and store the raw number.

**Parsing upstream data** — if your data source hands you pre-formatted strings like `"128k"` or `"$4.50"`, convert them to numbers at the parser/API boundary, NOT in the cell renderer. Use `parseNumericCell` from `@/lib/utils/table-sorting`:

```ts
// In your parser / API transform layer:
import { parseNumericCell } from '@/lib/utils/table-sorting';

function toNumberOrNull(raw: string): number | null {
  const n = parseNumericCell(raw);
  return Number.isFinite(n) ? n : null;
}

rows.push({
  contextWindowTokens: toNumberOrNull(stripHtml(tds[1])),  // "128k" → 128000
  blendedUsdPer1m: toNumberOrNull(stripHtml(tds[4])),      // "$4.50" → 4.5
  medianTokensPerSecond: toNumberOrNull(stripHtml(tds[5])),// "72.5" → 72.5
  // ...
});
```

`parseNumericCell` handles:
- Currency prefixes: `$`, `¥`, `€`, `£`, `₩`, `₹`
- Thousands separators: `1,234.56`
- SI suffixes: `k/K`, `M`, `B`, `T` (only if not followed by another letter/digit — so `"1.5kg"` → 1.5, not 1500)
- Accounting negative: `($1.50)` → -1.5
- Trailing units: `72.5 tok/s`, `0.5 s`, `15%`
- Missing markers: `—`, `-`, `N/A`, `n/a`, empty string → `NaN`

### Fallback: when you CANNOT convert the data to numbers

If you're consuming a read-only API, a third-party component, or a legacy table whose row type is locked, `EnhancedTable` has a safety net: it walks every column on render, samples the first non-null value in the first 5 rows, and if the string parses as a finite number via `parseNumericCell`, it auto-injects `sortingFn: numericStringSortingFn` (from `@/lib/utils/table-sorting`). You get correct sort with ZERO column-def changes.

Caveats:
- **Don't rely on this.** It's a safety net, not the primary pattern. Refactor the data shape when you can.
- Only works inside `EnhancedTable`. If you build a custom `useReactTable` flow, you must add `sortingFn: numericStringSortingFn` yourself.
- Columns with an explicit `sortingFn` or `enableSorting: false` are skipped.

### Sorting override recipes

```tsx
import { numericStringSortingFn } from '@/lib/utils/table-sorting';

// Force numeric sort on a string column (safety net)
{ accessorKey: 'priceDisplay', sortingFn: numericStringSortingFn }

// Force text sort for version strings ("v1.10" should be AFTER "v1.9")
{ accessorKey: 'version', sortingFn: 'alphanumeric' }

// Disable sorting entirely (actions column, checkbox column)
{ accessorKey: 'actions', enableSorting: false }
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
