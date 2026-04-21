---
name: 'Create TanStack Table'
description: 'Build data tables using the project EnhancedTable wrapper and BottomSheetTabs. Triggered when creating, migrating, or adding tables in the superadmin app. Covers column definitions, toolbar, sheet tabs, row selection, persistence, scroll/layout pitfalls (nested overflow, horizontal sync bar), and width-preset UX.'
---

# Create TanStack Table Skill

Build data tables in the superadmin app using `EnhancedTable` (TanStack Table v8 wrapper) and optionally `BottomSheetTabs` for multi-sheet pages.

## When to Use This Skill

- Creating a new table or data grid in `apps/superadmin/`
- Migrating a hand-rolled `<table>` or CSS Grid table to TanStack Table
- Adding sheet tabs (Excel-style bottom tabs) to a page
- Adding features to an existing EnhancedTable (row selection, batch actions, category filter)

## When NOT to Use

- Tables in `apps/web/` (different design system — evaluate first)
- Simple lists or cards that don't need sorting/filtering/pagination
- Read-only data with < 5 rows (a plain `<ul>` is simpler)

## Source Files (always read these first)

Before generating any code, read the latest source to ensure API accuracy:

1. `apps/superadmin/components/ui/EnhancedTable.tsx` — the wrapper component
2. `apps/superadmin/components/ui/BottomSheetTabs.tsx` — bottom sheet tabs
3. `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/columns.tsx` — ColumnMeta augmentation & ColumnDef examples

## Procedure

### Step 1: Gather Requirements

If the user hasn't specified, ask:

1. **Page path** — Where does this table live? (e.g. `superadmin/dashboard/xxx`)
2. **Data source** — API endpoint? Static data? Props from parent?
3. **Columns** — What fields? Name, type, Chinese/English headers?
4. **Multi-sheet?** — Does the page need multiple tabs/views?
5. **Row selection?** — Need checkboxes + batch actions?
6. **Add row?** — Need a "新增 Row" button?
7. **Pagination?** — How much data? Need page sizes?

### Step 2: Define Columns

Create column definitions following the patterns in `references/column-patterns.md`.

Key rules:
- Use `id` with `col-` prefix to avoid TanStack internal ID conflicts
- Set `meta: { headerEn: '...', headerZh: '...' }` for bilingual headers
- Use CSS tokens for colors (`text-text-primary`, not `text-gray-700`)
- Do NOT redeclare the `ColumnMeta` module augmentation — it's already in `columns.tsx`
- **Numeric columns: cells store numbers, units live in the header** — this is the single most important rule for any column displaying quantities (prices, counts, rates, durations, percentages). Never embed `$`, `k`, `M`, `%`, `tok/s`, or any other unit symbol in the cell value. Instead:
  - Row type: `foo: number | null` (NOT `foo: string`).
  - Header: carries the unit in parentheses — `'Price (USD/1M)'`, `'Context (tokens)'`, `'Latency (s)'`, `'Uptime (%)'`.
  - Cell renderer: formats the raw number for display (use `fmtNumber(n, { decimals, withCommas })` helper — see the leaderboard panel for an example).
  - Parser layer: if the upstream source gives you strings like `"$4.50"` or `"128k"`, convert to `number | null` at the parser/API boundary using `parseNumericCell` from `@/lib/utils/table-sorting`.
  - With this shape, TanStack's default numeric sort works natively — no `sortingFn` needed, no custom parser at sort time.
  - Why it matters: if cells are strings, TanStack v8 uses lexicographic sort → `"$10.00" < "$4.50"`, `"120.3" < "8.2"`, `"128k" < "1M" < "32k"`. All wrong.
- **Fallback for locked data shapes** — if you truly cannot change the row type to numbers (third-party API, legacy table), `EnhancedTable` has a safety net: it auto-injects `numericStringSortingFn` on any column whose first sample is a numeric-looking string. But this is NOT the primary pattern — refactor to numbers whenever possible. See `references/column-patterns.md` for details.

If the table has > 10 columns, extract to a separate `columns.tsx` file. Otherwise, `useMemo` inline is fine.

### Step 3: Configure EnhancedTable

Wire up the component following `references/enhanced-table-props.md`.

Key rules:
- `initialWidths` array length MUST equal `columns` array length, sum ≈ 100
  - Mismatch silently breaks column resize (widths reset on every render, drag is lost on remount)
- `tableId` must be globally unique (used as localStorage + Supabase persistence key)
  - Collisions cause saved widths from another table to overwrite the current one
- Provide `getCategoryValue` even if data might be empty (buttons still show)
- Set `minWidth` if the table has > 6 columns (enables horizontal scroll)
- **Column resize is automatic** — do NOT pass any extra prop. Just make sure:
  - You do NOT wrap `<EnhancedTable>` in a parent with `overflow: hidden` or `pointer-events: none`
  - You do NOT ship a custom header renderer that drops the `relative` class from each header cell (see `references/troubleshooting.md` #7 for the CSS positioning requirement)
- **gridTemplateColumns MUST use pure percentages** (`${w}%`). Do NOT use `minmax()`, `fr` units, or any other CSS Grid track syntax. `minmax()` prevents horizontal scroll from working (see `references/troubleshooting.md` "Why pure `${w}%`" design decision). Column minimum widths are enforced in the resize handler (40px), not in CSS.
- If you need custom default widths after real-world usage, update `initialWidths`; users can also use the toolbar `Save Widths` button to persist their own preset via `useTablePreferences`
- **Toolbar + wide rows** — the toolbar row uses `min-w-0` so a single long flex row does not expand past the viewport and “eat” horizontal scroll. If you wrap `EnhancedTable` in custom shells, keep **`min-w-0 w-full`** (or `max-w-full`) on flex children that should shrink with the viewport.
- **`persistentHorizontalScrollbar`** — use when users struggle to notice the native horizontal bar (tall pages, sticky chrome). It renders a **second track synced with the grid**, **inside the bordered table card**, **directly under the main table scrollport** (above pagination). Do **not** re-implement this with `createPortal` to the viewport or above `BottomSheetTabs`: that duplicates bars, fights tab chrome, and confuses which strip scrolls the grid. See `references/troubleshooting.md` #11.
- **Width preset overwrite UX** — when the user saves over an existing named preset, `EnhancedTable` shows a short toast and calls **`onAfterWidthPresetOverwrite`** (e.g. `focusEvaluationsGlobalTab()`, scroll to `#evaluations-global`). Wire this on settings pages where overwrite should also switch tabs or hash.

### Layout & scroll shells (avoid double scrollbars)

These mistakes recur on settings pages with long content + tables:

1. **Double vertical scrollbars** — if the app layout `<main>` (or parent) already scrolls with `overflow-y-auto`, avoid adding **another** full-height `overflow-y-auto` on an inner wrapper around the same content. Prefer **`overflow-hidden` + `flex` + `min-h-0`** on intermediate shells so **one** scroll region owns the flow (often the outer layout), or deliberately isolate scroll to the table panel only — but not both at once for the same column of content.
2. **Table height in flex pages** — for a table that should fill remaining space under a header, wrap the table area with **`flex-1 min-h-0 flex flex-col`** so the inner scrollport can shrink; `EnhancedTable` with `persistentHorizontalScrollbar` uses **`flex min-h-0 flex-1 flex-col`** on its root so the sync strip stays with the card.
3. **Blocks that must not shrink** — put **`shrink-0`** on sections above a flex-grown table (security banners, static cards) so they don’t collapse when space is tight.

See `references/troubleshooting.md` #10 for the nested-scroll pattern.

### Step 4: Add Sheet Tabs (if needed)

Follow `references/bottom-sheet-tabs.md` for multi-tab pages.

Key rules:
- Outer container needs `flex-1 min-h-0 flex flex-col`
- Each tab can have its own EnhancedTable with independent `tableId`
- Sync with `window.location.hash` for URL navigation
- Keep **horizontal scroll UX inside the active tab’s table card** (use `persistentHorizontalScrollbar` on `EnhancedTable`). Do not dock a duplicate bar to the window bottom over the tab strip — it reads as global chrome and breaks mental model (“which bar scrolls this table?”).

### Step 5: Verify

Run through the checklist:

- [ ] `npx tsc --noEmit` — no new TypeScript errors
- [ ] All columns render correctly with test data
- [ ] **Column resize handles work on EVERY non-last column** (not just the rightmost one)
  - Hover between each pair of headers — cursor becomes `col-resize` + blue line highlights
  - Drag left/right changes both adjacent columns; sum stays stable
  - If only the rightmost handle responds → the `relative` class is missing on header cells (see troubleshooting #7)
  - Columns cannot be dragged below ~40px; layout stays stable even after aggressive resizing (see troubleshooting #8)
- [ ] **Horizontal scroll works** when table has many columns (`minWidth` set)
  - If no scrollbar appears → check that `gridTemplateColumns` uses pure `${w}%`, NOT `minmax()` (see troubleshooting design decisions)
- [ ] **Only one vertical scrollbar** for the main page column (no nested `overflow-y-auto` fighting the layout `<main>` — see troubleshooting #10)
- [ ] If `persistentHorizontalScrollbar`: **one** horizontal strip under the grid (inside card), synced with scroll; no duplicate docked bar at viewport bottom
- [ ] If using **width preset overwrite** + tab/hash: `onAfterWidthPresetOverwrite` runs after toast (tab focus / `location.hash` as needed)
- [ ] Widths persist across page reload (localStorage)
- [ ] `Reset Widths` returns to `initialWidths`
- [ ] Search filters rows
- [ ] Category filter shows correct chips
- [ ] Sort works (click header: asc → desc → none)
- [ ] **Numeric-string columns sort by numeric value, not lexicographically**
  - e.g. `$4.50 < $5.63 < $10.00` (NOT `$10.00 < $4.50 < $5.63`)
  - e.g. `32k < 128k < 1M` (NOT `128k < 1M < 32k`)
  - If wrong: the column is missing `sortingFn: numericStringSortingFn`
- [ ] Save/Load width presets work
- [ ] View freeze row/col works
- [ ] If Sheet Tabs: URL hash updates on tab switch
- [ ] If row selection: batch actions appear on selection
- [ ] If pagination: page navigation works

## Existing Implementations (reference)

| Page | File | Columns | Features |
|:---|:---|:---|:---|
| Project Progress (Dev) | `development-table/columns.tsx` + `TableCore.tsx` | 14 | Custom TableCore, Prompt Modal |
| Project Progress (Test/Deploy/Ops) | `phase-columns.tsx` + `page.tsx` | 8-9 | Per-sheet custom rows |
| Contacts | `ContactLeadsTable.tsx` | 8 | Row selection + batch actions |
| Prompt Management | `PromptTable.tsx` | 5 | Category filter + pagination |
| IAM Overview | `OverviewTab.tsx` | 6 | extraToolbar CSV export |
| IAM Roles | `RolesTab.tsx` | 17 | Dynamic role columns |
| LLM Monitor | `LLMMonitorClient.tsx` | 8+6 | 2 tables + Sheet Tabs |

## References

Load these as needed for detailed patterns:

- `references/enhanced-table-props.md` — Full Props API with examples
- `references/column-patterns.md` — ColumnDef recipes for common cell types
- `references/bottom-sheet-tabs.md` — Sheet Tabs setup and hash navigation
- `references/troubleshooting.md` — Known issues, fixes, and design decisions
