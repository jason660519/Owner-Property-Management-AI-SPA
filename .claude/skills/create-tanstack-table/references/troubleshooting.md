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
- `tableId` collides with another table — preferences overwrite each other. See issue #9.

**How to verify**: Hover between two column headers; you should see the cursor change to `col-resize` and a blue line appear on hover. If you only see the blue line at the very right of the table, the `relative` class is missing somewhere.

### 8. Column Resize Breaks Table Layout

**Symptom**: After dragging column resize handles, columns collapse to near-zero width, header text wraps chaotically, and the overall grid layout becomes misaligned.

**Cause**: Using pure percentage values in `gridTemplateColumns` (e.g., `"4% 5% 20% ..."`) provides no minimum pixel constraint. When a column shrinks to a very small percentage, CSS Grid renders it at sub-usable widths. Additionally, if the resize handler's minimum threshold is too low (e.g., 8px), users can drag columns smaller than any content can fit.

**Fix**: Raise the resize handler minimum from 8px to 40px so users can't drag columns below usable width:
```tsx
const minPct = (40 / containerWidth) * 100;
```

**Do NOT use `minmax()` in `gridTemplateColumns`**. While `minmax(40px, ${w}%)` prevents columns from collapsing, it also prevents CSS Grid from overflowing the container — breaking horizontal scroll. The table relies on `minWidth: max(100%, Xpx)` on the inner div to enable scroll, which requires pure percentage grid tracks (e.g., `${w}%`).

**Why 40px?** It's wide enough to show a resize handle, a truncated header, and an ellipsis — the minimum for a usable column. If your columns need wider minimums (e.g., checkbox columns), adjust accordingly.

### 9. Preferences Not Persisting

**Symptom**: Column widths reset on page reload.

**Cause**: `tableId` is not unique across tables, or localStorage is cleared.

**Fix**: Use a globally unique `tableId` (e.g. `iam_overview_audit_log`, not just `audit_log`).

### 10. Double Vertical Scrollbars (nested `overflow-y-auto`)

**Symptom**: Two scrollbars on the same page — e.g. one on the shell `<main>` and one on an inner “content” div wrapping settings + tables.

**Cause**: Stacking scrollable ancestors (`overflow-y-auto` / `overflow-auto`) on the same vertical axis so both try to own scroll.

**Fix**: Pick **one** primary scroll owner. Typical pattern for long settings pages inside a layout that already scrolls:

- On the **middle shell** between layout and page body: `overflow-hidden flex flex-col min-h-0` (or equivalent) so you do **not** add a second full-column `overflow-y-auto` unless that shell is intentionally the only scroll region.
- Use **`flex-1 min-h-0`** on flex children that should shrink so inner regions don’t force overflow on the wrong ancestor.

If the table itself must scroll vertically inside a fixed viewport, isolate that to the table card — but then the outer page usually should **not** also scroll the same content.

### 11. Confusing or Duplicate Horizontal Scrollbars

**Symptom A**: Two horizontal bars (native under the grid + a custom strip) — looks broken.

**Symptom B**: A “global” horizontal bar docked at the viewport bottom, disconnected from the table card or sitting above `BottomSheetTabs`.

**Cause A**: `persistentHorizontalScrollbar` adds a synced strip; the native horizontal scrollbar on the same scrollport was still visible.

**Fix A**: Rely on `EnhancedTable`’s scrollport class `enhanced-table-scrollport--hide-native-h-scrollbar` (see `apps/superadmin/app/globals.css`). That hides the **native horizontal** track on **WebKit/Chromium**. Firefox may still show a thin native bar depending on OS settings — acceptable tradeoff unless you add Firefox-specific CSS.

**Cause B**: Custom `createPortal` / “dock” pattern for the sync bar.

**Fix B**: **Do not portal** the horizontal strip. `EnhancedTable` places the synced strip **inside the table card**, **below the grid scrollport**, **above pagination**. That keeps the affordance visually tied to the grid and avoids fighting bottom tab chrome.

**Related**: Wide toolbars — ensure outer wrappers use **`min-w-0`** / **`w-full`** so flex layout does not block horizontal overflow from reaching the table’s scrollport (see main skill “Toolbar + wide rows”).

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

### Why pure `${w}%` in gridTemplateColumns (not `minmax()`)?

The table enables horizontal scroll via `minWidth: max(100%, Xpx)` on an inner wrapper div. CSS Grid columns use pure percentages (e.g., `"4% 5% 20% ..."`), which resolve as fractions of the inner div's width. When the inner div is wider than the scroll container, columns overflow and a scrollbar appears.

Using `minmax(40px, ${w}%)` prevents this: CSS Grid treats the percentage as a maximum and keeps all tracks within the container, so no overflow occurs and the horizontal scrollbar disappears. This is a critical UX regression for tables with many columns.

**The correct approach to minimum column widths**:
- Enforce the minimum in the **resize handler** (`const minPct = (40 / containerW) * 100`), not in the CSS.
- Keep `gridTemplateColumns` as pure `${w}%` — no `minmax()`, no `fr` units.
- This way the grid overflows naturally for scroll, while the resize handler prevents columns from going below 40px during drag.
