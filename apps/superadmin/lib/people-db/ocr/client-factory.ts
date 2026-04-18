// Row 145 Sprint 3 — OcrClient factory.
//
// Resolves a concrete OcrClient from a provider id. Sprint 3 only ships
// MockOcrClient; the 'openclaw' branch throws with a pointer so the worker
// surfaces a clean "not implemented" error instead of silently skipping.

import type { OcrClient, OcrProviderId } from './types';
import { MockOcrClient } from './mock-client';

export function getOcrClient(provider: OcrProviderId): OcrClient {
  switch (provider) {
    case 'mock':
      return new MockOcrClient();
    case 'openclaw':
      // TODO(Sprint 6+): return new OpenClawOcrClient() once the service is live.
      throw new Error(
        "OCR provider 'openclaw' is not implemented yet. " +
          "Set PEOPLE_DB_OCR_PROVIDER=mock for Sprint 3, or wait for Sprint 6.",
      );
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown OCR provider: ${String(exhaustive)}`);
    }
  }
}

export function parseProviderFromEnv(
  raw: string | undefined,
  fallback: OcrProviderId = 'mock',
): OcrProviderId {
  if (raw === 'mock' || raw === 'openclaw') return raw;
  return fallback;
}
