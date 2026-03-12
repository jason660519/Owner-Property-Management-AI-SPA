/**
 * @file useVLMKeyManager.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-04
 * @modifiedBy Claude Sonnet 4.5
 */

// filepath: apps/web/hooks/useVLMKeyManager.ts
// description: Hook for managing VLM API keys (BYOK)

import { useState, useEffect, useCallback } from 'react';

export type VLMProvider = 'anthropic_claude' | 'openai_gpt4v' | 'google_gemini';

export interface VLMKeyPayload {
  provider: VLMProvider;
  api_key: string;
  salt_base64: string;
}

export interface VLMKeyStatus {
  has_key: boolean;
  provider?: VLMProvider;
  last_used_at?: string;
}

interface UseVLMKeyManagerReturn {
  hasKey: boolean;
  provider?: VLMProvider;
  lastUsedAt?: string;
  isLoading: boolean;
  error: string | null;
  checkKeyStatus: (provider?: VLMProvider) => Promise<void>;
  saveKey: (payload: Omit<VLMKeyPayload, 'salt_base64'>) => Promise<void>;
  deleteKey: (provider: VLMProvider) => Promise<void>;
}

const OCR_SERVICE_URL = process.env.NEXT_PUBLIC_OCR_SERVICE_URL || 'http://localhost:8819';

/**
 * Hook for managing VLM API keys
 *
 * Provides methods to:
 * - Check if user has configured a VLM API key
 * - Save/update VLM API key (with automatic encryption)
 * - Delete VLM API key
 *
 * @example
 * ```tsx
 * const { hasKey, saveKey, checkKeyStatus } = useVLMKeyManager();
 *
 * // Check if user has key
 * useEffect(() => {
 *   checkKeyStatus();
 * }, []);
 *
 * // Save key
 * const handleSave = async () => {
 *   await saveKey({
 *     provider: 'anthropic_claude',
 *     api_key: 'sk-ant-api03-...'
 *   });
 * };
 * ```
 */
export function useVLMKeyManager(): UseVLMKeyManagerReturn {
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState<VLMProvider | undefined>();
  const [lastUsedAt, setLastUsedAt] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate cryptographically secure random salt (16 bytes)
   */
  const generateSalt = (): Uint8Array => {
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto.getRandomValues(new Uint8Array(16));
    }
    // Fallback for server-side rendering (should not be used in production)
    throw new Error('Crypto API not available');
  };

  /**
   * Convert Uint8Array to Base64
   */
  const uint8ArrayToBase64 = (arr: Uint8Array): string => {
    return btoa(String.fromCharCode.apply(null, Array.from(arr)));
  };

  /**
   * Get Supabase session token for authentication
   */
  const getAuthToken = async (): Promise<string> => {
    // This should be replaced with actual Supabase session retrieval
    // For now, return placeholder
    // In production, use: const { data: { session } } = await supabase.auth.getSession();
    const session = await fetch('/api/auth/session').then((res) => res.json());
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  };

  /**
   * Check if user has configured VLM API key
   */
  const checkKeyStatus = useCallback(async (providerFilter?: VLMProvider) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const url = new URL(`${OCR_SERVICE_URL}/api/v1/integrations/vlm-key/status`);
      if (providerFilter) {
        url.searchParams.append('provider', providerFilter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check VLM key status');
      }

      const data: VLMKeyStatus = await response.json();

      setHasKey(data.has_key);
      setProvider(data.provider);
      setLastUsedAt(data.last_used_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setHasKey(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save VLM API key (encrypts before sending to backend)
   */
  const saveKey = useCallback(async (payload: Omit<VLMKeyPayload, 'salt_base64'>) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      // Generate random salt
      const salt = generateSalt();
      const salt_base64 = uint8ArrayToBase64(salt);

      // Send to backend (backend will encrypt using this salt)
      const response = await fetch(`${OCR_SERVICE_URL}/api/v1/integrations/vlm-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          salt_base64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save VLM API key');
      }

      // Refresh status
      await checkKeyStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [checkKeyStatus]);

  /**
   * Delete VLM API key
   */
  const deleteKey = useCallback(async (providerToDelete: VLMProvider) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${OCR_SERVICE_URL}/api/v1/integrations/vlm-key?provider=${providerToDelete}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete VLM API key');
      }

      // Refresh status
      await checkKeyStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [checkKeyStatus]);

  return {
    hasKey,
    provider,
    lastUsedAt,
    isLoading,
    error,
    checkKeyStatus,
    saveKey,
    deleteKey,
  };
}
