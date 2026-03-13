// filepath: apps/superadmin/lib/actions/parse-transcript.ts
// Server action: parse 謄本 document — delegates to consensus engine.
// This file is kept for backward compatibility; new code should import
// parseTranscriptWithConsensus from './consensus-parse' directly.

'use server';

import { parseTranscriptWithConsensus } from './consensus-parse';
import type { TranscriptParseOutput } from '@/lib/types/transcript';

export type ParseTranscriptResult =
  | { success: true; data: TranscriptParseOutput }
  | { success: false; message: string };

/**
 * Parse an uploaded 謄本 document with AI.
 * Now delegates to the multi-model consensus engine.
 * Single-model configs are handled internally as a fallback.
 *
 * @param documentId - property_documents.id
 * @param userId - from useAISettings().userId
 */
export async function parseTranscriptWithAI(
  documentId: string,
  userId: string
): Promise<ParseTranscriptResult> {
  const result = await parseTranscriptWithConsensus(documentId, userId);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, message: result.message };
}
