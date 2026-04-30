/**
 * Persist in-flight transaction comparable PDF generation in sessionStorage so
 * loading feedback survives property edit tab changes in the same browser tab.
 */

export type TransactionComparableKind = 'nearby' | 'street_section';

const KINDS: TransactionComparableKind[] = ['nearby', 'street_section'];

export function transactionComparablesPendingStorageKey(propertyId: string): string {
  return `transaction-comparables-pending:${propertyId}`;
}

export function transactionComparablesFeedbackStorageKey(propertyId: string): string {
  return `transaction-comparables-feedback:${propertyId}`;
}

export type TransactionComparablesPendingMap = Partial<Record<TransactionComparableKind, number>>;

export type TransactionComparablesFeedback = {
  type: 'success' | 'error';
  message: string;
  at: number;
};

export function readPendingComparablesMap(propertyId: string): TransactionComparablesPendingMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(transactionComparablesPendingStorageKey(propertyId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: TransactionComparablesPendingMap = {};
    for (const kind of KINDS) {
      const value = (parsed as Record<string, unknown>)[kind];
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[kind] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writePendingComparable(
  propertyId: string,
  kind: TransactionComparableKind,
  startedAt: number,
): void {
  if (typeof window === 'undefined') return;
  const cur = readPendingComparablesMap(propertyId);
  cur[kind] = startedAt;
  sessionStorage.setItem(transactionComparablesPendingStorageKey(propertyId), JSON.stringify(cur));
}

export function clearPendingComparable(propertyId: string, kind: TransactionComparableKind): void {
  if (typeof window === 'undefined') return;
  const cur = readPendingComparablesMap(propertyId);
  delete cur[kind];
  const keys = Object.keys(cur);
  if (keys.length === 0) {
    sessionStorage.removeItem(transactionComparablesPendingStorageKey(propertyId));
  } else {
    sessionStorage.setItem(transactionComparablesPendingStorageKey(propertyId), JSON.stringify(cur));
  }
}

export function pendingComparableKindsList(propertyId: string): TransactionComparableKind[] {
  const m = readPendingComparablesMap(propertyId);
  return KINDS.filter((kind) => m[kind] != null);
}

export function elapsedSecondsForComparable(
  propertyId: string,
  kind: TransactionComparableKind,
): number {
  const m = readPendingComparablesMap(propertyId);
  const startedAt = m[kind];
  if (typeof startedAt !== 'number') return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function readTransactionComparablesFeedback(
  propertyId: string,
): TransactionComparablesFeedback | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(transactionComparablesFeedbackStorageKey(propertyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      (candidate.type !== 'success' && candidate.type !== 'error') ||
      typeof candidate.message !== 'string' ||
      typeof candidate.at !== 'number' ||
      !Number.isFinite(candidate.at)
    ) {
      return null;
    }
    return {
      type: candidate.type,
      message: candidate.message,
      at: candidate.at,
    };
  } catch {
    return null;
  }
}

export function writeTransactionComparablesFeedback(
  propertyId: string,
  feedback: Omit<TransactionComparablesFeedback, 'at'> & { at?: number },
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(
    transactionComparablesFeedbackStorageKey(propertyId),
    JSON.stringify({ ...feedback, at: feedback.at ?? Date.now() }),
  );
}

export function clearTransactionComparablesFeedback(propertyId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(transactionComparablesFeedbackStorageKey(propertyId));
}
