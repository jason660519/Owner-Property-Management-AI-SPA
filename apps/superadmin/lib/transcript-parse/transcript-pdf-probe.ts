import { extractPdfText } from '@/lib/people-db/pdf-parse';
import { execFile } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export interface TranscriptPdfTextProbe {
  text: string;
  pageCount: number;
  totalChars: number;
  likelyScanned: boolean;
}

export async function extractTranscriptPdfTextForRouting(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): Promise<TranscriptPdfTextProbe> {
  const cliProbe = await extractWithPdftotext(buffer);
  if (cliProbe) return cliProbe;

  const extracted = await extractPdfText(buffer);
  return {
    text: extracted.pages.join('\n'),
    pageCount: extracted.pages.length,
    totalChars: extracted.totalChars,
    likelyScanned: extracted.likelyScanned,
  };
}

function toBuffer(buffer: ArrayBuffer | Uint8Array | Buffer): Buffer {
  if (buffer instanceof Uint8Array) {
    return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return Buffer.from(buffer);
}

function runPdftotext(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'pdftotext',
      ['-layout', filePath, '-'],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function extractWithPdftotext(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): Promise<TranscriptPdfTextProbe | null> {
  const dir = await mkdtemp(path.join(tmpdir(), 'transcript-pdf-probe-'));
  const pdfPath = path.join(dir, 'source.pdf');

  try {
    await writeFile(pdfPath, toBuffer(buffer));
    const text = await runPdftotext(pdfPath);
    const pages = text.split('\f').filter((page) => page.trim().length > 0);
    return {
      text,
      pageCount: Math.max(pages.length, text.length > 0 ? 1 : 0),
      totalChars: text.length,
      likelyScanned: text.trim().length === 0,
    };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
