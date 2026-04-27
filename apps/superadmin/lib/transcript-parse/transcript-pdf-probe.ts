import { extractPdfText } from '@/lib/people-db/pdf-parse';

export interface TranscriptPdfTextProbe {
  text: string;
  pageCount: number;
  totalChars: number;
  likelyScanned: boolean;
}

export async function extractTranscriptPdfTextForRouting(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): Promise<TranscriptPdfTextProbe> {
  const extracted = await extractPdfText(buffer);
  return {
    text: extracted.pages.join('\n'),
    pageCount: extracted.pages.length,
    totalChars: extracted.totalChars,
    likelyScanned: extracted.likelyScanned,
  };
}
