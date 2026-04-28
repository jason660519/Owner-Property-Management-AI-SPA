import type {
  TranscriptInputFormat,
  TranscriptPageClassification,
  TranscriptPageOrientation,
  TranscriptPageRole,
  TranscriptPageSourceTrust,
} from '@/lib/transcript-parse/intake-types';
import {
  countCjkCharacters,
  countRegistryMarkers,
} from '@/lib/transcript-parse/intake-router';

interface BuildPageClassificationsInput {
  inputFormat: TranscriptInputFormat;
  documentType?: string | null;
  extractedText?: string | null;
  pdfPageCount?: number | null;
}

const AUTHORITATIVE_ROLES = new Set<TranscriptPageRole>([
  'building_transcript',
  'land_transcript',
  'building_title',
  'land_title',
  'parking_building_transcript',
  'parking_land_transcript',
  'mixed_transcript',
]);

const REFERENCE_ONLY_ROLES = new Set<TranscriptPageRole>([
  'property_description',
  'investigation_report',
]);

const DOCUMENT_TYPE_TO_PAGE_ROLE: Record<string, TranscriptPageRole> = {
  building_registry_transcript: 'building_transcript',
  land_registry_transcript: 'land_transcript',
  parking_building_registry_transcript: 'parking_building_transcript',
  parking_land_registry_transcript: 'parking_land_transcript',
  building_title: 'building_title',
  land_title: 'land_title',
};

function includesAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function sourceTrustForRole(role: TranscriptPageRole): TranscriptPageSourceTrust {
  if (AUTHORITATIVE_ROLES.has(role)) return 'authoritative';
  if (REFERENCE_ONLY_ROLES.has(role)) return 'reference_only';
  if (role === 'map_or_photo') return 'ignore';
  return 'unknown';
}

function inferOrientation(text: string): TranscriptPageOrientation {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (includesAny(text, ['橫式', '橫向', '橫躺', 'landscape'])) return 'landscape';
  if (lines.some((line) => line.length >= 80)) return 'landscape';
  return lines.length > 0 ? 'portrait' : 'unknown';
}

function rotationHintForOrientation(orientation: TranscriptPageOrientation): 0 | 90 | 180 | 270 | null {
  if (orientation === 'portrait') return 0;
  if (orientation === 'landscape' || orientation === 'rotated_clockwise') return 90;
  if (orientation === 'rotated_counterclockwise') return 270;
  return null;
}

function normalizeEvidence(text: string): string {
  return text.replace(/\s+/gu, ' ').trim().slice(0, 180);
}

function classifyRole(text: string, documentType?: string | null): { role: TranscriptPageRole; reasons: string[] } {
  const normalized = text.replace(/\s+/gu, '');
  const fallbackRole = documentType ? DOCUMENT_TYPE_TO_PAGE_ROLE[documentType] : undefined;
  const reasons: string[] = [];

  if (includesAny(normalized, ['物件調查報告書', '物件調查報告', '調查報告書', '現況調查'])) {
    return { role: 'investigation_report', reasons: ['page contains investigation report markers'] };
  }
  if (includesAny(normalized, ['不動產說明書', '標的物說明書', '標的物現況說明書', '委託銷售標的'])) {
    return { role: 'property_description', reasons: ['page contains property description markers'] };
  }
  if (includesAny(normalized, ['位置圖', '地籍圖', '照片', '現況照片', '平面圖'])) {
    return { role: 'map_or_photo', reasons: ['page looks like map/photo/supporting material'] };
  }
  if (includesAny(normalized, ['建物所有權狀', '建物權狀', '建物所有權狀字號'])) {
    return { role: 'building_title', reasons: ['page contains building title deed markers'] };
  }
  if (includesAny(normalized, ['土地所有權狀', '土地權狀', '土地所有權狀字號'])) {
    return { role: 'land_title', reasons: ['page contains land title deed markers'] };
  }

  const hasBuildingMarkers = includesAny(normalized, ['建物標示部', '建號', '坐落門牌']);
  const hasLandMarkers = includesAny(normalized, ['土地標示部', '地號', '地目']);
  const registryMarkerCount = countRegistryMarkers(text);
  if (hasBuildingMarkers && hasLandMarkers && registryMarkerCount >= 2) {
    return { role: 'mixed_transcript', reasons: ['page contains both building and land registry markers'] };
  }
  if (hasBuildingMarkers && registryMarkerCount >= 2) {
    return { role: 'building_transcript', reasons: ['page contains building registry markers'] };
  }
  if (hasLandMarkers && registryMarkerCount >= 2) {
    return { role: 'land_transcript', reasons: ['page contains land registry markers'] };
  }

  if (fallbackRole) {
    reasons.push('page text is inconclusive; using uploaded document type as fallback');
    return { role: fallbackRole, reasons };
  }

  return { role: 'unknown', reasons: ['page text is empty or lacks stable classification markers'] };
}

export function classifyTranscriptPage(params: {
  pageNumber: number;
  text: string;
  documentType?: string | null;
}): TranscriptPageClassification {
  const { role, reasons } = classifyRole(params.text, params.documentType);
  const orientation = inferOrientation(params.text);
  const cjkCount = countCjkCharacters(params.text);
  const markerCount = countRegistryMarkers(params.text);
  const hasEvidence = params.text.trim().length > 0;
  const confidence = role === 'unknown'
    ? hasEvidence ? 0.35 : 0.15
    : Math.min(0.95, 0.55 + (markerCount * 0.1) + (cjkCount >= 20 ? 0.15 : 0));

  return {
    pageNumber: params.pageNumber,
    pageRole: role,
    sourceTrust: sourceTrustForRole(role),
    orientation,
    rotationHint: rotationHintForOrientation(orientation),
    confidence: Number(confidence.toFixed(2)),
    evidenceText: normalizeEvidence(params.text),
    reasons,
  };
}

export function splitPdfTextPages(text: string): string[] {
  if (!text.trim()) return [];
  return text.split('\f').map((page) => page.trim()).filter(Boolean);
}

export function buildTranscriptPageClassifications(
  input: BuildPageClassificationsInput,
): TranscriptPageClassification[] {
  if (input.inputFormat === 'pdf') {
    const pages = splitPdfTextPages(input.extractedText ?? '');
    if (pages.length > 0) {
      return pages.map((text, index) => classifyTranscriptPage({
        pageNumber: index + 1,
        text,
        documentType: input.documentType,
      }));
    }

    const pageCount = typeof input.pdfPageCount === 'number' && Number.isFinite(input.pdfPageCount)
      ? Math.max(1, Math.floor(input.pdfPageCount))
      : 1;
    return Array.from({ length: pageCount }, (_, index) => ({
      pageNumber: index + 1,
      pageRole: DOCUMENT_TYPE_TO_PAGE_ROLE[input.documentType ?? ''] ?? 'unknown',
      sourceTrust: sourceTrustForRole(DOCUMENT_TYPE_TO_PAGE_ROLE[input.documentType ?? ''] ?? 'unknown'),
      orientation: 'unknown',
      rotationHint: null,
      confidence: 0.2,
      evidenceText: '',
      reasons: ['PDF text layer unavailable; visual model must classify this page'],
    }));
  }

  if (input.inputFormat === 'image') {
    const role = DOCUMENT_TYPE_TO_PAGE_ROLE[input.documentType ?? ''] ?? 'unknown';
    return [{
      pageNumber: 1,
      pageRole: role,
      sourceTrust: sourceTrustForRole(role),
      orientation: 'unknown',
      rotationHint: null,
      confidence: role === 'unknown' ? 0.2 : 0.45,
      evidenceText: '',
      reasons: ['image document requires visual classification'],
    }];
  }

  if (input.extractedText?.trim()) {
    return [classifyTranscriptPage({
      pageNumber: 1,
      text: input.extractedText,
      documentType: input.documentType,
    })];
  }

  return [];
}
