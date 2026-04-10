/**
 * Custom TanStack Table sorting functions for EnhancedTable columns.
 *
 * TanStack's default `alphanumeric` / `text` sorters operate on the raw cell
 * value as a string. For columns whose underlying data is a DISPLAY string
 * that happens to carry a numeric meaning (e.g. "$4.50", "128k", "72.5 tok/s",
 * "1.2M"), string ordering gives wrong results ("$10" sorts before "$4").
 *
 * Use `numericStringSortingFn` on any such column. See `parseNumericCell`
 * below for the exact parsing rules.
 */

import type { Row } from '@tanstack/react-table';

/**
 * Parse a numeric value out of a display string that may contain currency
 * symbols, thousands separators, unit suffixes, or missing-value markers.
 *
 * Handles:
 * - Currency / symbols: "$4.50" → 4.5, "¥1,234" → 1234, "€0.75" → 0.75
 * - Thousands separators: "1,234.56" → 1234.56
 * - Unit suffixes (SI): "1.5k" → 1500, "2M" → 2_000_000, "3B" → 3_000_000_000
 * - Context window style: "128k" → 128000, "1M" → 1_000_000
 * - Trailing units: "72.5 tok/s" → 72.5, "0.5 s" → 0.5, "15%" → 15
 * - Negative: "-3.2" → -3.2, "($1.5)" → -1.5 (accounting style)
 * - Missing markers: "—", "-", "", "N/A", null, undefined → NaN
 *
 * Returns NaN for values that cannot be parsed. Callers (e.g. the sortingFn
 * below) decide how to rank NaN entries — by default NaN sinks to the bottom
 * in ascending order.
 */
export function parseNumericCell(raw: unknown): number {
  if (raw == null) return NaN;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;

  const s = String(raw).trim();
  if (!s) return NaN;

  // Common missing-value markers
  if (s === '—' || s === '-' || s === '–' || s === 'N/A' || s === 'n/a') {
    return NaN;
  }

  // Accounting-style negative: "($1.50)" → "-1.50"
  const accountingNegative = /^\(.*\)$/.test(s);
  const stripped = (accountingNegative ? s.slice(1, -1) : s).trim();

  // Strip currency symbols, thousands separators, percent.
  // KEEP whitespace so we can distinguish "128k" (SI suffix)
  // from "72.5 tok/s" (plain unit name after a space).
  const cleaned = stripped.replace(/[,$¥€£₩₹%]/g, '').trim();

  // Extract the leading signed number.
  const numMatch = cleaned.match(/^([+-]?\d*\.?\d+)/);
  if (!numMatch) return NaN;

  const base = parseFloat(numMatch[1]);
  if (!Number.isFinite(base)) return NaN;

  // Check the character immediately after the number for an SI suffix.
  // Valid ONLY if the suffix letter is not immediately followed by another
  // letter or digit (to avoid misreading "tok/s", "Mtokens", "kg" etc.).
  const rest = cleaned.slice(numMatch[1].length);
  const suffixMatch = rest.match(/^([kKmMbBtT])(?![a-zA-Z0-9])/);
  const suffix = suffixMatch ? suffixMatch[1].toLowerCase() : '';
  const multiplier =
    suffix === 'k'
      ? 1_000
      : suffix === 'm'
        ? 1_000_000
        : suffix === 'b'
          ? 1_000_000_000
          : suffix === 't'
            ? 1_000_000_000_000
            : 1;

  const value = base * multiplier;
  return accountingNegative ? -value : value;
}

/**
 * TanStack `SortingFn` for columns whose underlying value is a DISPLAY string
 * that should sort numerically. Pass as `sortingFn` on the column definition:
 *
 * ```tsx
 * {
 *   accessorKey: 'blendedUsdPer1m',
 *   header: 'Price',
 *   meta: { headerEn: 'Price', headerZh: '價格' },
 *   sortingFn: numericStringSortingFn,
 * }
 * ```
 *
 * NaN (unparseable or missing) always sinks BELOW finite numbers in ascending
 * order. TanStack automatically inverts the comparator for descending, so in
 * desc order NaN rises to the top — this matches how spreadsheets behave when
 * you sort a column with blank cells.
 */
// Declared as a generic function (not a typed const) so TypeScript can
// instantiate it as `SortingFn<ConcreteRowType>` at every call site without
// complaining that `SortingFn<unknown>` is not assignable to `SortingFn<T>`.
export function numericStringSortingFn<TData>(
  rowA: Row<TData>,
  rowB: Row<TData>,
  columnId: string,
): number {
  const a = parseNumericCell(rowA.getValue(columnId));
  const b = parseNumericCell(rowB.getValue(columnId));

  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1; // push missing to the end in ascending order
  if (bNaN) return -1;

  if (a === b) return 0;
  return a < b ? -1 : 1;
}
