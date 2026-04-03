export interface StorageQuotaLike {
  quota_mb: number;
  used_bytes: number;
}

/** Calculate usage ratio (0–1) for a given quota-like record */
export function getQuotaUsagePercent(quota: StorageQuotaLike): number {
  const quotaBytes = (quota.quota_mb || 0) * 1024 * 1024;
  if (quotaBytes <= 0) return 0;
  return quota.used_bytes / quotaBytes;
}

/** Filter quotas that exceed a given usage threshold (default: 75%) */
export function findQuotaAlerts<T extends StorageQuotaLike>(
  quotas: T[],
  thresholdPercent = 0.75
): T[] {
  return quotas.filter((quota) => getQuotaUsagePercent(quota) > thresholdPercent);
}

