// filepath: apps/mobile/src/hooks/useRealtimeDocuments.ts
// description: Realtime subscription hook for property_documents table
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PropertyDocument, RealtimeStatus, DocumentUpdateEvent } from '../types/documents';

interface UseRealtimeDocumentsReturn {
  status: RealtimeStatus;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

export function useRealtimeDocuments(
  onDocumentUpdate: (event: DocumentUpdateEvent) => void,
  userId?: string
): UseRealtimeDocumentsReturn {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
    if (!userId) {
      setError('User ID is required for subscription');
      return;
    }

    setStatus('connecting');
    setError(null);

    // Create channel
    const newChannel = supabase
      .channel('document-ocr-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'property_documents',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Document updated:', payload);

          const newDoc = payload.new as PropertyDocument;
          const oldDoc = payload.old as PropertyDocument;

          // Trigger callback with event data
          onDocumentUpdate({
            documentId: newDoc.id,
            oldStatus: oldDoc.ocr_status,
            newStatus: newDoc.ocr_status,
            parsedData: newDoc.ocr_parsed_data,
            metadata: {
              engine: newDoc.ocr_engine,
              confidence_score: newDoc.ocr_confidence_score,
              processed_at: newDoc.ocr_processed_at,
            },
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (status === 'CLOSED') {
          setStatus('disconnected');
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('error');
          setError('Failed to connect to Realtime');
        }
      });

    setChannel(newChannel);
  }, [userId, onDocumentUpdate]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      console.log('[Realtime] Unsubscribing...');
      supabase.removeChannel(channel);
      setChannel(null);
      setStatus('disconnected');
    }
  }, [channel]);

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    status,
    error,
    subscribe,
    unsubscribe,
  };
}
