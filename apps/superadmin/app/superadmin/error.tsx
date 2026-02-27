'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
      <div className="bg-red-500/10 p-4 rounded-full">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-white">Something went wrong!</h2>
      <p className="text-[#999999]">
        {error?.message ?? 'Failed to load dashboard data.'}
      </p>
      <Button
        onClick={() => reset()}
        variant="outline"
      >
        Try again
      </Button>
    </div>
  );
}
