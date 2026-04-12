import type { ProgressRow, RowStatus } from './types';
import { summarizeRowStatuses } from './types';

function makeRow(id: string, percentage: number): ProgressRow {
  return {
    __rowId: id,
    __source: 'roadmap',
    name: `Feature ${id}`,
    category: '測試',
    percentage,
  };
}

describe('summarizeRowStatuses', () => {
  it('uses derived status when no selection override', () => {
    const rows = [makeRow('001', 100), makeRow('002', 50), makeRow('003', 0)];
    const summary = summarizeRowStatuses(rows, {});
    expect(summary.completed).toBe(1);
    expect(summary.in_progress).toBe(1);
    expect(summary.not_started).toBe(1);
    expect(summary.on_hold).toBe(0);
  });

  it('applies selection override over derived status', () => {
    const rows = [makeRow('001', 0)];
    const overrides: Record<string, RowStatus> = {
      'roadmap:001': 'on_hold',
    };
    const summary = summarizeRowStatuses(rows, overrides);
    expect(summary.on_hold).toBe(1);
    expect(summary.not_started).toBe(0);
  });
});
