import { describe, it, expect } from 'vitest';
import { getQuotaUsagePercent, findQuotaAlerts, type StorageQuotaLike } from '@/app/superadmin/dashboard/storage/storage-quota-utils';

type StorageQuota = StorageQuotaLike & {
  id: string;
  user_id: string;
  notes: string | null;
  updated_at: string;
};

function makeQuota(overrides: Partial<StorageQuota> = {}): StorageQuota {
  return {
    id: 'q-1',
    user_id: 'user-1',
    quota_bytes: 1024,
    used_bytes: 0,
    notes: null,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getQuotaUsagePercent', () => {
  it('returns 0 when quota_bytes is 0 or negative', () => {
    expect(getQuotaUsagePercent(makeQuota({ quota_bytes: 0 }))).toBe(0);
    expect(getQuotaUsagePercent(makeQuota({ quota_bytes: -1 }))).toBe(0);
  });

  it('returns correct ratio between 0 and 1', () => {
    expect(getQuotaUsagePercent(makeQuota({ quota_bytes: 100, used_bytes: 25 }))).toBeCloseTo(0.25);
    expect(getQuotaUsagePercent(makeQuota({ quota_bytes: 100, used_bytes: 100 }))).toBeCloseTo(1);
  });
});

describe('findQuotaAlerts', () => {
  it('returns quotas strictly above default 75% threshold', () => {
    const quotas: StorageQuota[] = [
      makeQuota({ id: 'low', used_bytes: 50, quota_bytes: 100 }), // 50%
      makeQuota({ id: 'edge', used_bytes: 75, quota_bytes: 100 }), // 75%
      makeQuota({ id: 'high', used_bytes: 80, quota_bytes: 100 }), // 80%
    ];

    const alerts = findQuotaAlerts(quotas);
    const alertIds = alerts.map((q) => q.id);

    expect(alertIds).toEqual(['high']);
  });

  it('uses custom threshold when provided', () => {
    const quotas: StorageQuota[] = [
      makeQuota({ id: 'a', used_bytes: 40, quota_bytes: 100 }), // 40%
      makeQuota({ id: 'b', used_bytes: 60, quota_bytes: 100 }), // 60%
      makeQuota({ id: 'c', used_bytes: 90, quota_bytes: 100 }), // 90%
    ];

    const alerts = findQuotaAlerts(quotas, 0.5);
    const alertIds = alerts.map((q) => q.id);

    expect(alertIds).toEqual(['b', 'c']);
  });
});

