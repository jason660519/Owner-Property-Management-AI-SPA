import type { PropertyItem } from '@/lib/types/properties';
import { parseLandNumber } from '@/lib/utils/taipei-land-number-parser';

export interface ZoningLandParcelOption {
  label: string;
  value: string;
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function addParcel(
  parcels: ZoningLandParcelOption[],
  seen: Set<string>,
  params: {
    label?: string | null;
    value?: string | null;
  },
): void {
  const value = cleanText(params.value);
  const key = value.replace(/\s+/g, '').toLowerCase();
  if (!value || seen.has(key) || !parseLandNumber(value)) return;

  seen.add(key);
  parcels.push({
    label: cleanText(params.label) || value,
    value,
  });
}

export function collectZoningLandParcels(property: PropertyItem): ZoningLandParcelOption[] {
  const parcels: ZoningLandParcelOption[] = [];
  const seen = new Set<string>();

  for (const row of property.transcriptIntakeAreaDetails?.landShareAreas ?? []) {
    addParcel(parcels, seen, {
      label: row.sourceDocumentName ? `${row.sourceDocumentName}: ${row.identifier}` : row.identifier,
      value: row.identifier,
    });
  }

  for (const row of property.transcriptIntakeAreaDetails?.parkingLandShareAreas ?? []) {
    addParcel(parcels, seen, {
      label: row.sourceDocumentName ? `${row.sourceDocumentName}: ${row.identifier}` : row.identifier,
      value: row.identifier,
    });
  }

  addParcel(parcels, seen, {
    label: property.landTranscript?.header.documentTitle,
    value: property.landTranscript?.header.documentTitle || property.landTranscript?.description.landNumber,
  });
  addParcel(parcels, seen, {
    label: property.landTranscript?.description.landNumber,
    value: property.landTranscript?.description.landNumber,
  });
  addParcel(parcels, seen, {
    label: property.parkingLandTranscript?.header.documentTitle,
    value: property.parkingLandTranscript?.header.documentTitle || property.parkingLandTranscript?.description.landNumber,
  });
  addParcel(parcels, seen, {
    label: property.parkingLandTranscript?.description.landNumber,
    value: property.parkingLandTranscript?.description.landNumber,
  });
  addParcel(parcels, seen, {
    label: property.landNumber,
    value: property.landNumber,
  });

  return parcels;
}

export function formatZoningQuerySummary(
  rows: Array<{ landNumber: string; zone: string }>
): string {
  return rows
    .map((row) => `${row.landNumber}：${row.zone}`)
    .join('\n');
}
