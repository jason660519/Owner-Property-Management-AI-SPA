import { Suspense } from 'react';
import {
  getStorageSummary,
  getFileTypeDistribution,
  getOrphanedFiles,
  getStorageQuotas,
} from '@/app/actions/storage';
import StorageDashboardClient from '@/components/dashboard/storage/StorageDashboardClient';

export const dynamic = 'force-dynamic';

export default async function StoragePage() {
  const defaultSummary: Awaited<ReturnType<typeof getStorageSummary>> = {
    totalSize: 0,
    totalFiles: 0,
    byBucket: {},
    byType: [],
  };

  const [summary, fileTypes, orphanedFiles, quotas] = await Promise.all([
    getStorageSummary().catch(() => defaultSummary),
    getFileTypeDistribution().catch(() => []),
    getOrphanedFiles(100).catch(() => []),
    getStorageQuotas().catch(() => []),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading storage stats...</div>}>
      <StorageDashboardClient
        summary={summary}
        fileTypes={fileTypes}
        initialOrphanedFiles={orphanedFiles}
        quotas={quotas}
      />
    </Suspense>
  );
}
