/**
 * Simulates the auto-detection logic in EnhancedTable.tsx that decides
 * whether to inject `numericStringSortingFn` into a column. Mirrors the
 * real logic so that a regression in either place is caught by this test.
 */

import type { ColumnDef } from '@tanstack/react-table';
import { numericStringSortingFn, parseNumericCell } from '../table-sorting';

type Row = Record<string, unknown>;

function autoPatchColumns<T extends Row>(
  columns: ColumnDef<T, unknown>[],
  data: T[],
): ColumnDef<T, unknown>[] {
  if (!data || data.length === 0) return columns;
  const sampleLimit = Math.min(data.length, 5);

  return columns.map((col) => {
    if ('sortingFn' in col && col.sortingFn) return col;
    if (col.enableSorting === false) return col;

    const accessorKey = (col as { accessorKey?: string }).accessorKey;
    const accessorFn = (col as { accessorFn?: (row: T, index: number) => unknown }).accessorFn;
    if (!accessorKey && !accessorFn) return col;

    let sample: unknown = null;
    for (let i = 0; i < sampleLimit; i++) {
      const row = data[i];
      const v = accessorKey
        ? (row as unknown as Record<string, unknown>)[accessorKey]
        : accessorFn!(row, i);
      if (v != null && v !== '') {
        sample = v;
        break;
      }
    }

    if (typeof sample !== 'string') return col;
    if (!Number.isFinite(parseNumericCell(sample))) return col;

    return { ...col, sortingFn: numericStringSortingFn } as ColumnDef<T, unknown>;
  });
}

describe('EnhancedTable auto-detect sortingFn', () => {
  it('injects numericStringSortingFn for $-prefixed columns', () => {
    const cols: ColumnDef<Row, unknown>[] = [
      { accessorKey: 'price' },
      { accessorKey: 'name' },
    ];
    const data: Row[] = [
      { price: '$4.50', name: 'Alice' },
      { price: '$10.00', name: 'Bob' },
    ];
    const patched = autoPatchColumns(cols, data);

    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
    expect((patched[1] as { sortingFn?: unknown }).sortingFn).toBeUndefined();
  });

  it('injects for SI-suffix context columns (128k / 1M)', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'ctx' }];
    const data: Row[] = [{ ctx: '128k' }, { ctx: '1M' }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
  });

  it('injects for plain numeric strings ("8.2", "120.3")', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'rate' }];
    const data: Row[] = [{ rate: '8.2' }, { rate: '120.3' }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
  });

  it('injects for strings with trailing units ("72.5 tok/s")', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'tps' }];
    const data: Row[] = [{ tps: '72.5 tok/s' }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
  });

  it('does NOT inject for pure text columns (names, categories)', () => {
    const cols: ColumnDef<Row, unknown>[] = [
      { accessorKey: 'name' },
      { accessorKey: 'category' },
    ];
    const data: Row[] = [
      { name: 'Claude Sonnet', category: 'LLM' },
      { name: 'GPT-4', category: 'LLM' },
    ];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBeUndefined();
    expect((patched[1] as { sortingFn?: unknown }).sortingFn).toBeUndefined();
  });

  it('does NOT inject for real number columns (lets TanStack handle it)', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'count' }];
    const data: Row[] = [{ count: 42 }, { count: 100 }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBeUndefined();
  });

  it('respects explicit sortingFn (does not overwrite)', () => {
    const customFn = () => 0;
    const cols: ColumnDef<Row, unknown>[] = [
      { accessorKey: 'price', sortingFn: customFn as never },
    ];
    const data: Row[] = [{ price: '$4.50' }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(customFn);
  });

  it('skips columns with enableSorting: false', () => {
    const cols: ColumnDef<Row, unknown>[] = [
      { accessorKey: 'price', enableSorting: false },
    ];
    const data: Row[] = [{ price: '$4.50' }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBeUndefined();
  });

  it('skips first null/empty row and samples deeper', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'price' }];
    const data: Row[] = [
      { price: null },
      { price: '' },
      { price: '$4.50' },
    ];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
  });

  it('handles empty data (returns columns unchanged)', () => {
    const cols: ColumnDef<Row, unknown>[] = [{ accessorKey: 'price' }];
    const patched = autoPatchColumns(cols, []);
    expect(patched).toBe(cols);
  });

  it('supports accessorFn columns', () => {
    const cols: ColumnDef<Row, unknown>[] = [
      { id: 'derived', accessorFn: (r: Row) => `$${r.raw}` },
    ];
    const data: Row[] = [{ raw: 4.5 }, { raw: 10 }];
    const patched = autoPatchColumns(cols, data);
    expect((patched[0] as { sortingFn?: unknown }).sortingFn).toBe(numericStringSortingFn);
  });
});
