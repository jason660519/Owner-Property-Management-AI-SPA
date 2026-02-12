import { Suspense } from 'react';
import { getStorageSummary, getFileTypeDistribution, getOrphanedFiles } from '@/app/actions/storage';
import StorageDashboardClient from '@/components/dashboard/storage/StorageDashboardClient';

export const dynamic = 'force-dynamic';

export default async function StoragePage() {
  const [summary, fileTypes, orphanedFiles] = await Promise.all([
    getStorageSummary(),
    getFileTypeDistribution(),
    getOrphanedFiles(100),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading storage stats...</div>}>
      <StorageDashboardClient 
        summary={summary} 
        fileTypes={fileTypes} 
        initialOrphanedFiles={orphanedFiles} 
      />
    </Suspense>
  );
}
