---
name: 'Create TanStack Table'
description: 'Build data tables using the project EnhancedTable wrapper and BottomSheetTabs. Triggered when creating, migrating, or adding tables in the superadmin app. Provides column definitions, toolbar setup, sheet tabs, row selection, and persistence.'
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

If the table has > 10 columns, extract to a separate `columns.tsx` file. Otherwise, `useMemo` inline is fine.

### Step 3: Configure EnhancedTable

Wire up the component following `references/enhanced-table-props.md`.

Key rules:
- `initialWidths` array length MUST equal `columns` array length, sum ≈ 100
- `tableId` must be globally unique (used as localStorage key)
- Provide `getCategoryValue` even if data might be empty (buttons still show)
- Set `minWidth` if the table has > 6 columns (enables horizontal scroll)

### Step 4: Add Sheet Tabs (if needed)

Follow `references/bottom-sheet-tabs.md` for multi-tab pages.

Key rules:
- Outer container needs `flex-1 min-h-0 flex flex-col`
- Each tab can have its own EnhancedTable with independent `tableId`
- Sync with `window.location.hash` for URL navigation

### Step 5: Verify

Run through the checklist:

- [ ] `npx tsc --noEmit` — no new TypeScript errors
- [ ] All columns render correctly with test data
- [ ] Column resize handles work (drag between headers)
- [ ] Search filters rows
- [ ] Category filter shows correct chips
- [ ] Sort works (click header: asc → desc → none)
- [ ] Save/Reset Widths persists to localStorage
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
