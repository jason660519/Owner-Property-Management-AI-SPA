import type {
  TranscriptInputFormat,
  TranscriptRouteDecision,
  TranscriptRouteMetrics,
} from '@/lib/transcript-parse/intake-types';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp']);
const JSON_EXTENSIONS = new Set(['json']);
const TEXT_EXTENSIONS = new Set(['txt', 'csv']);

const REGISTRY_MARKERS = [
  '建物標示部',
  '土地標示部',
  '所有權部',
  '他項權利部',
  '謄本',
  '地號',
  '建號',
  '權利範圍',
  '應有部分',
  '登記次序',
  '地政事務所',
];

const MIN_EXTRACTED_TEXT_LENGTH = 120;
const MIN_CJK_CHARACTER_COUNT = 40;
const MIN_REGISTRY_MARKER_COUNT = 2;

export interface TranscriptRouteInput {
  fileName: string;
  mimeType?: string | null;
  documentType?: string | null;
  extractedText?: string | null;
}

function isTitleDocumentType(documentType?: string | null): boolean {
  return documentType === 'building_title' || documentType === 'land_title';
}

export function inferTranscriptInputFormat(fileName: string, mimeType?: string | null): TranscriptInputFormat {
  const normalizedMime = (mimeType ?? '').toLowerCase();
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (normalizedMime.includes('pdf') || extension === 'pdf') return 'pdf';
  if (normalizedMime.includes('json') || JSON_EXTENSIONS.has(extension)) return 'json';
  if (normalizedMime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (normalizedMime.startsWith('text/') || TEXT_EXTENSIONS.has(extension)) return 'text';

  return 'unknown';
}

export function countCjkCharacters(text: string): number {
  return Array.from(text).filter((char) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(char)).length;
}

export function countRegistryMarkers(text: string): number {
  return REGISTRY_MARKERS.reduce((count, marker) => count + (text.includes(marker) ? 1 : 0), 0);
}

export function hasUsableTaiwanRegistryText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_EXTRACTED_TEXT_LENGTH) return false;

  const cjkCharacterCount = countCjkCharacters(trimmed);
  const registryMarkerCount = countRegistryMarkers(trimmed);

  return (
    cjkCharacterCount >= MIN_CJK_CHARACTER_COUNT &&
    registryMarkerCount >= MIN_REGISTRY_MARKER_COUNT
  );
}

export function decideTranscriptTechnicalRoute(input: TranscriptRouteInput): TranscriptRouteDecision {
  const inputFormat = inferTranscriptInputFormat(input.fileName, input.mimeType);
  const extractedText = input.extractedText ?? '';
  const isTitleCopy = isTitleDocumentType(input.documentType);
  const metrics: TranscriptRouteMetrics = {
    fileName: input.fileName,
    mimeType: input.mimeType ?? '',
    inputFormat,
    extractedTextLength: extractedText.trim().length,
    cjkCharacterCount: countCjkCharacters(extractedText),
    registryMarkerCount: countRegistryMarkers(extractedText),
    hasUsableTraditionalChineseText: hasUsableTaiwanRegistryText(extractedText),
  };

  if (inputFormat === 'json') {
    return {
      route: 'structured_json',
      inputFormat,
      reasons: ['JSON file can be normalized without OCR or VLM vision.'],
      metrics,
    };
  }

  if (inputFormat === 'image') {
    return {
      route: 'vlm_visual',
      inputFormat,
      reasons: [isTitleCopy
        ? 'Title deed image copies require VLM visual reading for Taiwanese ownership certificate text.'
        : 'Image files require visual reading for Taiwanese registry text.'],
      metrics,
    };
  }

  if (inputFormat === 'pdf') {
    if (isTitleCopy) {
      return {
        route: 'vlm_visual',
        inputFormat,
        reasons: ['Title deed copies should be visually interpreted by VLM even when a PDF text layer exists.'],
        metrics,
      };
    }

    if (metrics.hasUsableTraditionalChineseText) {
      return {
        route: 'local_python_text',
        inputFormat,
        reasons: ['PDF text layer contains enough Taiwanese registry markers for local parsing.'],
        metrics,
      };
    }

    return {
      route: 'vlm_visual',
      inputFormat,
      reasons: ['PDF text layer is missing, sparse, or does not contain enough registry markers.'],
      metrics,
    };
  }

  if (inputFormat === 'text' && metrics.hasUsableTraditionalChineseText) {
    return {
      route: 'local_python_text',
      inputFormat,
      reasons: ['Text file contains enough Taiwanese registry markers for local parsing.'],
      metrics,
    };
  }

  return {
    route: 'unsupported',
    inputFormat,
    reasons: ['Unsupported file type or insufficient readable transcript text.'],
    metrics,
  };
}
