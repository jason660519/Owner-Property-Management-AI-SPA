# Troubleshooting & Design Decisions

Known issues, fixes, and architectural rationale for EnhancedTable and BottomSheetTabs.

## Common Issues

### 1. ColumnMeta TypeScript Error

**Symptom**: `Property 'headerEn' does not exist on type 'ColumnMeta<...>'`

**Cause**: The `ColumnMeta` module augmentation is missing or duplicated.

**Fix**: Do NOT declare it in your file. It's already declared in `development-table/columns.tsx`:
```tsx
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    headerEn?: string;
    headerZh?: string;
  }
}
```
Just use `meta: { headerEn: '...', headerZh: '...' }` in your column defs. If TypeScript still complains, cast:
```tsx
meta: { headerEn: 'Name', headerZh: '名稱' } as Record<string, string>
```

### 2. initialWidths Length Mismatch

**Symptom**: Columns render with wrong widths or crash.

**Cause**: `initialWidths.length !== columns.length`

**Fix**: Count your columns and match the array length exactly. Verify with:
```tsx
console.assert(columns.length === WIDTHS.length, 'Column/width count mismatch');
```

### 3. Category Filter Buttons Not Showing

**Symptom**: No "All" / category chips visible.

**Cause**: `getCategoryValue` prop not provided.

**Fix**: Add `getCategoryValue={row => row.someField}`. Buttons show even when data is empty.

### 4. Frozen Row Not Working

**Symptom**: Header doesn't stick when scrolling vertically.

**Cause**: In CSS Grid layout, `position: sticky` on individual grid cells doesn't work for vertical sticking. It only works on the container wrapping the header row.

**Fix (already applied in EnhancedTable)**: The header container div has `sticky top-0`, not individual header cells. If you're building a custom table without EnhancedTable, apply `sticky top-0` to the header wrapper, not individual `<th>` elements.

### 5. Frozen Columns Not Visible

**Symptom**: Frozen columns don't stay in place during horizontal scroll.

**Cause**: `minWidth` not set, so the table doesn't overflow horizontally.

**Fix**: Set `minWidth` to a value larger than the container width:
```tsx
<EnhancedTable minWidth={1200} ... />
```

### 6. Two create-table Skills Listed

**Symptom**: Claude Code shows two `create-table` entries in the skill list.

**Cause**: Both `.claude/commands/create-table.md` and `.claude/skills/create-table/SKILL.md` exist.

**Fix**: Delete `.claude/commands/create-table.md`. The skill version supersedes the command.

### 7. Column Resize Handle Not Responding

**Symptom**: Cannot drag to resize columns on a newly-created table. Only the frozen columns (if any) are resizable.

**Cause (most common — CSS positioning)**:
Each header cell renders a 4px-wide resize handle positioned with `absolute right-0 top-0 bottom-0`. For the handle to anchor to the cell, the header cell `<div>` MUST have `position: relative` (`relative` in Tailwind). Without it, the handle escapes to the nearest positioned ancestor (the header wrapper, which has `relative z-10`), so every non-frozen column's handle collapses to the right edge of the whole header row and stacks invisibly on top of the last column. Frozen columns happen to work only because their `sticky` class creates a positioning context by accident.

**Fix**: On every header cell `<div>` that contains a resize handle, include `relative` in the className. This is already fixed in `EnhancedTable.tsx` and `development-table/TableCore.tsx`. If you write a **custom** table header (not using EnhancedTable), ensure each header cell has `position: relative`:

```tsx
<div className="relative min-w-0 px-4 py-3 ... flex flex-col">
  {/* header content */}
  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize ..."
       onMouseDown={...} />
</div>
```

**Other causes to check if the fix above doesn't help**:
- A parent element has `overflow: hidden` (the handle sits just outside the cell edge and may be clipped). The table container uses `overflow-auto`, not `overflow-hidden` — if you wrap EnhancedTable in a layout div with `overflow-hidden`, remove it.
- A parent has `pointer-events: none` — the mouse events never reach the handle.
- `initialWidths.length !== columns.length` — resize patches a wrong-length array and the state becomes unusable. See issue #2.
- `tableId` collides with another table — preferences overwrite each other. See issue #8.

**How to verify**: Hover between two column headers; you should see the cursor change to `col-resize` and a blue line appear on hover. If you only see the blue line at the very right of the table, the `relative` class is missing somewhere.

### 8. Preferences Not Persisting

**Symptom**: Column widths reset on page reload.

**Cause**: `tableId` is not unique across tables, or localStorage is cleared.

**Fix**: Use a globally unique `tableId` (e.g. `iam_overview_audit_log`, not just `audit_log`).

## Design Decisions

### Why CSS Grid instead of `<table>`?

- `<table>` elements have inconsistent `position: sticky` behavior across browsers
- CSS Grid allows precise percentage-based column widths with drag-to-resize
- Grid + `sticky` works reliably for both frozen rows and columns in a single container

### Why not TanStack's built-in Column Pinning?

TanStack's `columnPinning` splits the table into three separate `<table>` elements (left pinned, center scrollable, right pinned). This approach:
- Breaks column width synchronization in CSS Grid layouts
- Makes drag-to-resize unreliable across the three tables
- Adds complexity for minimal benefit at our current data scale

Our approach: CSS `position: sticky` + dynamically computed `left` pixel offsets (via `ResizeObserver`) on frozen columns within a single grid container.

### Why not `@tanstack/react-virtual`?

Current data volumes (< 200 rows per table) don't justify virtual scrolling. The overhead of virtualizer setup and the UX tradeoffs (scroll position jumps, reduced browser search compatibility) aren't worth it.

**When to add it**: If any table regularly exceeds 500 rows, add `useVirtualizer` inside `EnhancedTable.tsx`. The consumer API (Props) won't change — it's an internal optimization.

### Why dual-write persistence (localStorage + Supabase)?

- **localStorage**: Instant read/write, no network latency, works offline
- **Supabase**: Cross-device sync, survives browser data clearing

The `useTablePreferences` hook writes to both on save, reads from localStorage first (faster), falls back to DB.

### Why `useTablePreferences` instead of Zustand/Context?

Table preferences are per-table, not global. A hook with `tableId` as key is simpler than a global store with nested state. Each EnhancedTable instance manages its own preferences independently.
