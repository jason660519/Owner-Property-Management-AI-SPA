# Complex Cell & Multi-File Table Patterns

For tables whose rows host **interactive widgets** (file uploads, model dropdowns, async "Run" buttons, status-driven previews, side-sheet detail) instead of plain text. Reference implementation: **Image-to-Image Evaluation Panel** under `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/`.

When you have ≥ 3 cells with > 30 lines of JSX each, async side effects, or different cell shapes per `runStatus`, follow these patterns rather than inlining everything in `columns.tsx`.

---

## File Organization (one panel, many files)

```
api_key_and_model_setting/
├── ImageToImageEvaluationPanel.tsx          # main panel (composes EnhancedTable + toolbar + sheet)
├── ImageToImageEvaluationDetailSheet.tsx    # right-side detail panel (full output, run history)
├── ImageToImageFloorPlanInputCell.tsx       # one cell per file
├── ImageToImageRawOutputCell.tsx
├── ImageToImageRenderedImageCell.tsx
├── ImageToImageRequestedEffectiveCell.tsx
├── ImageToImageRowActionsCell.tsx
├── ImageToImageShouldTestCell.tsx
├── image-to-image-evaluation-columns.tsx    # column defs + row type + style/output options
├── image-to-image-model-capabilities.ts     # domain config (allowed providers/models)
├── image-to-image-row-state.ts              # localStorage migration (fromStoredRows / rowToStored)
└── image-to-image-shared-file-store.ts      # IndexedDB binary-blob persistence
```

Rules of thumb:

| Concern | Lives in |
|---|---|
| `ColumnDef[]` array, row type, enum/option arrays | `*-evaluation-columns.tsx` |
| Cells longer than ~30 lines or with their own `useState/useMemo/useEffect` | dedicated `*Cell.tsx` |
| Domain whitelists / capability lookups (which provider+model is supported) | `*-capabilities.ts` (pure, no React) |
| `localStorage` schema migration | `*-row-state.ts` |
| Binary blobs (uploaded files, large outputs) | `*-shared-file-store.ts` (IndexedDB, NOT localStorage) |
| Detail sheet / drawer | `*DetailSheet.tsx` |
| Composition (state, callbacks, EnhancedTable wiring) | `*Panel.tsx` |

Why split: `columns.tsx` becomes the "table contract" (what columns, what type), while cell files are independent React components you can test, memoize, and refactor in isolation.

---

## Cell Component Pattern

A cell file exports a single named component receiving `row` plus a callback bag. **No internal data fetching.** State lives in the parent panel; cells are pure presentation + event delegators.

```tsx
// ImageToImageFloorPlanInputCell.tsx
type Props = {
  row: ImageToImageEvaluationRow;
  onUploadFile: (rowId: string, file: File | null) => void;
};

export function ImageToImageFloorPlanInputCell({ row, onUploadFile }: Props) {
  // local UI state ONLY (preview URL, hover, expand) — NEVER row data
  const previewUrl = useMemo(() => /* ... */);
  return ( /* ... */ );
}
```

In the column def:

```tsx
{
  id: 'input-floor-plan',
  header: 'Input',
  meta: { headerEn: 'Input floor plan', headerZh: 'INPUT FLOOR PLAN' },
  cell: ({ row }) => (
    <ImageToImageFloorPlanInputCell row={row.original} onUploadFile={onUploadFile} />
  ),
}
```

Pass callbacks via the `createColumns(deps)` factory pattern (see "Column factory" below).

---

## Pointer-Event Isolation (the #1 silent killer)

Cells with interactive children (`<select>`, `<textarea>`, `<input type="file">`, drag handles, prompt editors) must stop their pointer/mouse events from bubbling to the row, or **EnhancedTable's column resize / row-click handlers steal them**.

```tsx
function stopTablePointerEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

<select
  onMouseDown={stopTablePointerEvent}
  onPointerDown={stopTablePointerEvent}
  onClick={stopTablePointerEvent}
  onChange={...}
>
  ...
</select>
```

Apply on every `<select>`, `<textarea>`, `<label htmlFor="...file">`, `<input type="file">`, and any `<button>` inside a cell that the user might drag near a column edge. Symptoms when missed: dropdown won't open, textarea can't be focused, file picker only fires sometimes.

---

## Stacking Context Isolation for Absolute-Positioned Overlays

When a cell renders an absolutely-positioned overlay inside it (a "✓ 已生成" badge, hover toolbar, status pill anchored to a thumbnail), give the cell wrapper **`isolate`** so the inner `z-index` cannot leak into adjacent columns.

```tsx
// ✅ DO — isolate creates its own stacking context
<button className="relative isolate block h-24 w-full max-w-full overflow-hidden ...">
  <span className="absolute left-1.5 top-1.5 z-10 ...">{label} 已生成</span>
  <NextImage ... />
</button>

// ❌ DON'T — z-10 escapes into other cells when scrolling/resizing
<button className="relative block h-24 w-full min-w-[180px] overflow-hidden ...">
  <span className="absolute left-1.5 top-1.5 z-10 ...">{label} 已生成</span>
</button>
```

Symptoms when missed: overlay badges from one column appear floating on top of unrelated columns when you horizontally scroll the table. `overflow-hidden` alone does NOT contain `z-index` — only `isolate` (CSS `isolation: isolate`) does.

Related rule: do **not** put `min-w-[XXXpx]` on cell content. Let the column control width with `w-full max-w-full`. A cell button that's wider than its column overflows into neighbours regardless of `overflow-hidden` on the button itself, because the surrounding `<td>`/grid cell defaults to `overflow: visible`.

---

## File Preview (createObjectURL pattern)

For uploaded `File` blobs displayed as inline thumbnails:

```tsx
const isImage =
  row.file?.type.toLowerCase().startsWith('image/') === true ||
  (row.file != null && IMAGE_EXT_RE.test(row.file.name)) ||
  (row.file != null && IMAGE_EXT_RE.test(row.fileName));

const previewUrl = useMemo(() => {
  if (!row.file || !isImage || typeof URL.createObjectURL !== 'function') return '';
  return URL.createObjectURL(row.file);
}, [row.file, isImage]);

useEffect(() => {
  if (!previewUrl) return;
  return () => URL.revokeObjectURL(previewUrl);   // free the blob URL on unmount/replace
}, [previewUrl]);
```

Three details that bite if you skip them:

1. **Always revoke** in the cleanup function — leaked blob URLs accumulate in memory.
2. **`URL.createObjectURL` may not exist** during SSR — guard with `typeof ... === 'function'`.
3. **`File.type` may be empty string** when restored from IndexedDB or some upload paths. Fall back to **filename extension** (`/\.(png|jpe?g|webp|gif)$/i`) so the thumbnail still renders.

Use `<NextImage ... unoptimized />` for blob URLs — Next.js's optimizer rejects non-HTTP sources.

---

## Two-Layer Persistence: localStorage + IndexedDB

Tables that hold both lightweight settings and large binary content need **two stores** — `localStorage` is JSON-only and capped near 5 MB.

| Layer | Stores | Why |
|---|---|---|
| `localStorage` (`writeLocalStorage(LS_KEY, rows.map(rowToStored))`) | row settings: `id`, `providerId`, `modelId`, `style`, `outputMode`, `prompt`, **`fileName`** (string), result URLs, `runStatus` | fast sync read on mount, survives refresh |
| `IndexedDB` (custom `*-shared-file-store.ts`) | the **`File` / `Blob` itself** with `mimeType` + `updatedAt` | binary, no size limit, async API |

The row type has **`file: File \| null`** but the stored shape (`StoredImageToImageRow`) has only `fileName`. On load:

1. Hydrate rows from `localStorage` → `file: null`, `fileName: <string>`.
2. Async `loadSharedFloorPlanFile()` from IndexedDB → `setRows(prev => prev.map(r => ({ ...r, file })))`.

When restoring the `File`, **always re-derive `mimeType`** from the stored field, then `blob.type`, then a filename-extension fallback — or downstream `isImageMime()` checks fail and API calls fall back to text-only:

```ts
function inferMimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return '';
}

const type = record.mimeType || record.blob.type || inferMimeFromName(record.fileName);
return new File([record.blob], record.fileName, { type, lastModified: ... });
```

---

## Schema Migration on Load (`fromStoredRows`)

When the row schema or a default value evolves, migrate stored data on hydration — never on save. This keeps localStorage authoritative and lets old browsers refresh into the new shape automatically.

```ts
export function fromStoredRows(stored: StoredRow[]): Row[] {
  const baseline = createBaselineRow();
  const merged = stored.length > 0 ? stored : [rowToStored(baseline)];

  return merged.map((row, index) => {
    const isBaselineRow = row.id === baseline.id;
    return {
      ...row,
      // 1. force baseline row to current canonical model — heals stale model IDs after capability list updates
      ...(isBaselineRow && row.modelId !== CANONICAL_MODEL
        ? { providerId: CANONICAL_PROVIDER, modelId: CANONICAL_MODEL }
        : {}),
      // 2. re-index — `no` is derived, never authoritative
      no: index + 1,
      // 3. rebuild derived prompt from current style/mode (so prompt template updates take effect)
      prompt: buildPrompt(row.style, row.outputMode),
      // 4. clear transients — File can't survive JSON, status can't be 'running' after page reload
      file: null,
      fileName: '',
      runStatus: row.runStatus === 'running' ? 'idle' : row.runStatus,
      runStartedAtMs: null,
    };
  });
}
```

Migration triage list:

- **Stale ID / capability**: force-correct on baseline rows; `coerce*` to fallback for orphaned custom rows.
- **Derived fields** (computed prompt, display name): rebuild every load.
- **Transients** (`runStatus: 'running'`, in-flight timers, blob handles): reset to idle/null.
- **Increment `LS_KEY` version** (`'ai-settings:image-to-image:rows:v2'`) only for **breaking** schema changes that the merger can't repair.

---

## Per-Row Async Action Pattern (Run / Test)

Action cells that hit an API need to: (1) optimistic-patch row to `running`, (2) await the call, (3) patch back result, (4) persist history. **Never throw inside the cell.**

```ts
async function persistRun(row: Row, result: Partial<Row>) {
  const response = await fetch('/api/.../runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rowId: row.id, /* ... */ }),
  });
  if (!response.ok) throw new Error('persist failed');
  return response.json();
}

const runRow = useCallback(async (row: Row) => {
  if (!row.file) {
    patchRow(row.id, { runStatus: 'failed', message: '請先上傳格局圖。' });
    return;
  }

  const startedAt = Date.now();
  patchRow(row.id, {
    runStatus: 'running',
    message: '模型評估中...',
    runStartedAtMs: startedAt,
    e2eMs: null,
  });

  try {
    const result = await runOnce(row, onTestModel);  // pure async function, returns Partial<Row>
    const next: Partial<Row> = {
      ...result,
      runStartedAtMs: null,
      e2eMs: Date.now() - startedAt,
      lastRunAt: new Date().toISOString(),
    };
    patchRow(row.id, next);
    void persistRun(row, next).catch(err => console.warn('history save failed', err));
  } catch (err) {
    const next = {
      runStatus: 'failed' as const,
      message: err instanceof Error ? err.message : '測試失敗。',
      runStartedAtMs: null,
      e2eMs: Date.now() - startedAt,
    };
    patchRow(row.id, next);
    void persistRun(row, next).catch(saveErr => console.warn('history save failed', saveErr));
  }
}, [onTestModel, patchRow]);
```

For "Run All", run rows in `Promise.allSettled` — never `Promise.all` — so one rejection doesn't poison the rest.

---

## Run-Status State Machine

Drive multiple cells from one field rather than scattering booleans:

```ts
type RunStatus = 'idle' | 'running' | 'done' | 'failed';
```

| Status | Run column | Result column | Detail badge |
|---|---|---|---|
| `idle` | Play button | "尚未測試" emptyState | — |
| `running` | Spinner + Cancel | "生成中..." emptyState | Pulse |
| `done` | Replay | Thumbnail + "✓ 已生成" overlay | Green |
| `failed` | Retry | Error text | Red |

Cells switch on `row.runStatus` with one shared variable — no `isLoading + isError + isSuccess` combos that drift out of sync.

---

## Detail Sheet Companion

Click a row (or thumbnail) → open a side sheet with full output, run history, error trace, downloadable artifacts. Keeps cells compact and exposes data that doesn't fit in a table.

```tsx
const [detailRow, setDetailRow] = useState<Row | null>(null);
const detail = detailRow ? rows.find(r => r.id === detailRow.id) ?? detailRow : null;

<EnhancedTable
  ...
  // each cell that opens detail calls setDetailRow(row)
/>
<MyEvaluationDetailSheet
  detail={detail}
  open={detail != null}
  onClose={() => setDetailRow(null)}
  history={historyRuns}
  historyLoading={historyLoading}
/>
```

Pattern detail: keep a `detailRowId` reference, but always look up the **fresh** row by id from `rows` state — otherwise the sheet shows stale content while the underlying row is being patched (e.g. during a Run).

---

## Column Factory with Dependencies

When columns need callbacks (`onPatchRow`, `onUploadFile`, `onRunRow`, `onOpenDetail`), wrap the column array in a factory that takes the dependency bag:

```tsx
type CreateColumnsDeps = {
  modelOptions: ImageModelOption[];
  onPatchRow: (rowId: string, patch: Partial<Row>) => void;
  onUploadFile: (rowId: string, file: File | null) => void;
  onRunRow: (row: Row) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (row: Row) => void;
  onOpenDetail: (row: Row) => void;
};

export function createImageToImageColumns(deps: CreateColumnsDeps): ColumnDef<Row, unknown>[] {
  const { modelOptions, onPatchRow, onUploadFile, /* ... */ } = deps;
  return [
    /* col defs use deps callbacks here */
  ];
}

// in the panel:
const columns = useMemo(
  () => createImageToImageColumns({ modelOptions, onPatchRow, onUploadFile, /* ... */ }),
  [modelOptions, onPatchRow, onUploadFile, /* ... */],
);
```

Memoize **every callback** with `useCallback` so the columns array is stable across renders — otherwise EnhancedTable rebuilds its grid on every state change and you lose focus / drag state mid-interaction.

---

## Initial-State Seed (default + benchmark rows)

For evaluation tables, seed the empty state with one **baseline** row plus one **benchmark per cross-vendor provider** so the first-time user immediately sees a meaningful comparison.

```ts
// in panel mount:
useEffect(() => {
  setRows(prev => {
    const additions = suggestedBenchmarkRows(prev, modelOptions);
    if (additions.length === 0 || readLocalStorage(LS_BENCHMARK_SEEDED) === true) {
      return prev;
    }
    writeLocalStorage(LS_BENCHMARK_SEEDED, true);
    return normalizeImageToImageRows([...prev, ...additions]);
  });
}, [modelOptions]);
```

Use a separate `LS_*_SEEDED` flag so re-running the seed after the user deletes auto-seeded rows doesn't re-add them.

---

## Quick Self-Check (complex cells)

- [ ] Each non-trivial cell is its own `*Cell.tsx` file
- [ ] Every interactive child (`<select>`, `<textarea>`, file input) calls `stopTablePointerEvent` on `onMouseDown` / `onPointerDown` / `onClick`
- [ ] Cells with absolute-positioned overlays use `relative isolate` on the wrapper
- [ ] No `min-w-[Xpx]` on cell content — column controls width via `w-full max-w-full`
- [ ] `URL.createObjectURL` previews are revoked in `useEffect` cleanup
- [ ] Image-type detection has a filename-extension fallback (File.type may be empty)
- [ ] Binary blobs go to IndexedDB, not localStorage
- [ ] `fromStoredRows` resets `runStatus: 'running' → 'idle'` and clears in-memory-only fields (File, timers)
- [ ] Per-row async actions use `Promise.allSettled` for batch, never throw inside cells
- [ ] Column factory takes a deps bag; all callbacks are `useCallback`-stable
- [ ] Detail sheet looks up the live row by id every render (not the captured row from when it opened)
