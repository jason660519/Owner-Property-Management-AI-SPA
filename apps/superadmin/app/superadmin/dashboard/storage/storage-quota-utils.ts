export interface StorageQuotaLike {
  quota_bytes: number;
  used_bytes: number;
}

/** Calculate usage ratio (0–1) for a given quota-like record */
export function getQuotaUsagePercent(quota: StorageQuotaLike): number {
  if (quota.quota_bytes <= 0) return 0;
  return quota.used_bytes / quota.quota_bytes;
}

/** Filter quotas that exceed a given usage threshold (default: 75%) */
export function findQuotaAlerts<T extends StorageQuotaLike>(
  quotas: T[],
  thresholdPercent = 0.75
): T[] {
  return quotas.filter((quota) => getQuotaUsagePercent(quota) > thresholdPercent);
}

