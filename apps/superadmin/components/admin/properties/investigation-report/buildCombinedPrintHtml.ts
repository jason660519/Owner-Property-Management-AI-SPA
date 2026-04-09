// Combined print: main report + selected attachment pages in one HTML document
import type { InvestigationReport, AttachmentSelection } from './types';
import type { PropertyItem, PropertyDocumentItem, PropertyPhotoItem } from '@/lib/types/properties';
import { SHARED_PRINT_CSS } from './print-templates/print-css';
import { buildReportBodyPages } from './buildReportHtml';
import { buildBasicInfoHtml } from './print-templates/basic-info-html';
import { buildPropertyIntroHtml } from './print-templates/property-intro-html';
import { buildAreaDetailHtml } from './print-templates/area-detail-html';
import { buildTransactionConditionsHtml } from './print-templates/transaction-conditions-html';
import { buildZoningUsageHtml } from './print-templates/zoning-usage-html';
import { buildMapLocationHtml } from './print-templates/map-location-html';
import { buildPhotoSheetHtml } from './print-templates/photo-sheet-html';
import { buildDocumentReferenceHtml } from './print-templates/document-reference-html';

export interface CombinedPrintOptions {
  report: InvestigationReport;
  property?: PropertyItem;
  selectedAttachments: AttachmentSelection[];
  documents: PropertyDocumentItem[];
  photos: PropertyPhotoItem[];
}

/**
 * Build a single printable HTML document containing the main report
 * plus all selected attachment pages.
 */
export function buildCombinedPrintHtml(options: CombinedPrintOptions): string {
  const { report, property, selectedAttachments, documents, photos } = options;
  const enabled = selectedAttachments.filter((a) => a.enabled);

  const parts: string[] = [];

  // Always include the main report if 'report' category is selected (or if nothing specific selected)
  const includeReport = enabled.some((a) => a.category === 'report') || enabled.length === 0;
  if (includeReport) {
    parts.push(buildReportBodyPages(report, property));
  }

  // Data-driven pages
  for (const att of enabled) {
    switch (att.category) {
      case 'basic_info':
        parts.push(buildBasicInfoHtml(report, property));
        break;
      case 'property_intro':
        parts.push(buildPropertyIntroHtml(property));
        break;
      case 'area_detail':
        parts.push(buildAreaDetailHtml(report));
        break;
      case 'transaction_conditions':
        parts.push(buildTransactionConditionsHtml(report));
        break;
      case 'zoning_usage':
        parts.push(buildZoningUsageHtml(report));
        break;
      case 'map_location':
        parts.push(buildMapLocationHtml(report, property));
        break;
      case 'photo_sheet':
        parts.push(buildPhotoSheetHtml(photos));
        break;
      case 'report':
      case 'document':
        // report handled above; documents handled below
        break;
    }
  }

  // Collect selected documents for the reference page
  const selectedDocs = enabled
    .filter((a) => a.category === 'document')
    .map((a) => documents.find((d) => d.id === a.id))
    .filter((d): d is PropertyDocumentItem => d != null);

  if (selectedDocs.length > 0) {
    parts.push(buildDocumentReferenceHtml(selectedDocs));
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>物件調查報告書 + 附件 - ${report.caseName || '未命名'}</title>
<style>${SHARED_PRINT_CSS}</style>
</head><body>
${parts.join('')}
</body></html>`;
}
