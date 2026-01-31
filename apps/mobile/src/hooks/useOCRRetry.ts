// filepath: apps/mobile/src/hooks/useOCRRetry.ts
// description: Hook for OCR retry functionality
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { useState } from 'react';
import { retryOCRProcessing } from '../services/ocrService';

export function useOCRRetry() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = async (documentId: string) => {
    setIsRetrying(true);
    setError(null);

    const result = await retryOCRProcessing(documentId);

    setIsRetrying(false);

    if (!result.success) {
      setError(result.error || 'Retry failed');
    }

    return result;
  };

  return {
    retry,
    isRetrying,
    error,
  };
}
