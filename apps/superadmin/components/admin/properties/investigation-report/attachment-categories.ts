// Attachment category definitions for investigation report print system
import type { AttachmentCategory } from './types';
import type { PropertyItem, PropertyDocumentItem, PropertyPhotoItem } from '@/lib/types/properties';
import type { InvestigationReport } from './types';

export type CategoryGroup = 'report' | 'existing_docs' | 'data_driven' | 'media';

export interface CategoryDef {
  category: AttachmentCategory;
  label: string;
  description: string;
  group: CategoryGroup;
  /** Document types to match in property_documents (for 'document' category items) */
  documentTypes?: string[];
  /** Check if this category has data to render */
  isAvailable: (ctx: AvailabilityContext) => boolean;
}

export interface AvailabilityContext {
  report: InvestigationReport;
  property?: PropertyItem;
  documents: PropertyDocumentItem[];
  photos: PropertyPhotoItem[];
}

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  report: '報告本體',
  existing_docs: '已上傳文件',
  data_driven: '資料衍生頁面',
  media: '媒體',
};

const hasDocType = (docs: PropertyDocumentItem[], types: string[]) =>
  docs.some((d) => types.includes(d.documentType ?? ''));

export const ATTACHMENT_CATEGORIES: CategoryDef[] = [
  // ── Report ──
  {
    category: 'report',
    label: '物件調查報告書',
    description: '不動產說明書（主報告）',
    group: 'report',
    isAvailable: () => true,
  },

  // ── Existing docs ──
  {
    category: 'document',
    label: '土地謄本',
    description: '土地登記謄本',
    group: 'existing_docs',
    documentTypes: ['land_registry_transcript'],
    isAvailable: ({ documents }) => hasDocType(documents, ['land_registry_transcript']),
  },
  {
    category: 'document',
    label: '建物謄本',
    description: '建物登記謄本',
    group: 'existing_docs',
    documentTypes: ['building_registry_transcript'],
    isAvailable: ({ documents }) => hasDocType(documents, ['building_registry_transcript']),
  },
  {
    category: 'document',
    label: '土地權狀',
    description: '土地所有權狀',
    group: 'existing_docs',
    documentTypes: ['land_title'],
    isAvailable: ({ documents }) => hasDocType(documents, ['land_title']),
  },
  {
    category: 'document',
    label: '建物權狀',
    description: '建物所有權狀',
    group: 'existing_docs',
    documentTypes: ['building_title'],
    isAvailable: ({ documents }) => hasDocType(documents, ['building_title']),
  },
  {
    category: 'document',
    label: '格局圖',
    description: '室內格局圖面',
    group: 'existing_docs',
    documentTypes: ['floor_plan'],
    isAvailable: ({ documents }) => hasDocType(documents, ['floor_plan']),
  },
  {
    category: 'document',
    label: '建物測量成果圖',
    description: '建物測量成果圖',
    group: 'existing_docs',
    documentTypes: ['building_measurement_survey'],
    isAvailable: ({ documents }) => hasDocType(documents, ['building_measurement_survey']),
  },
  {
    category: 'document',
    label: '地籍圖',
    description: '地籍圖 / 建物套繪圖',
    group: 'existing_docs',
    documentTypes: ['cadastral_map'],
    isAvailable: ({ documents }) => hasDocType(documents, ['cadastral_map']),
  },
  {
    category: 'document',
    label: '成交行情表',
    description: '實價登錄成交比較報表',
    group: 'existing_docs',
    documentTypes: [
      'transaction_comparables',
      'transaction_comparables_nearby',
      'transaction_comparables_street_section',
    ],
    isAvailable: ({ documents }) =>
      hasDocType(documents, [
        'transaction_comparables',
        'transaction_comparables_nearby',
        'transaction_comparables_street_section',
      ]),
  },

  // ── Data-driven pages ──
  {
    category: 'basic_info',
    label: '物件基本資訊',
    description: '名稱、地址、價格、格局等基本欄位',
    group: 'data_driven',
    isAvailable: ({ report }) => !!report.caseName,
  },
  {
    category: 'property_intro',
    label: '物件介紹',
    description: '物件描述文字',
    group: 'data_driven',
    isAvailable: ({ property }) => !!(property?.description?.trim()),
  },
  {
    category: 'area_detail',
    label: '建物土地面積明細表',
    description: '建物面積與土地持分明細',
    group: 'data_driven',
    isAvailable: ({ report }) => report.buildingAreas.mainBuilding > 0,
  },
  {
    category: 'transaction_conditions',
    label: '交易條件',
    description: '付款比例、交屋條件等',
    group: 'data_driven',
    isAvailable: ({ report }) => report.paymentSchedule.firstRatio > 0,
  },
  {
    category: 'zoning_usage',
    label: '使用分區',
    description: '土地使用分區、建蔽率、容積率',
    group: 'data_driven',
    isAvailable: ({ report }) =>
      report.landParcels.some((p) => !!p.zoningType),
  },
  {
    category: 'map_location',
    label: 'Google 地圖定位',
    description: '座標與地址資訊',
    group: 'data_driven',
    isAvailable: ({ property }) =>
      !!(property?.latitude && property?.longitude),
  },

  // ── Media ──
  {
    category: 'photo_sheet',
    label: '物件照片',
    description: '照片聯絡圖',
    group: 'media',
    isAvailable: ({ photos }) => photos.length > 0,
  },
];

/** Get all categories grouped by their group */
export function getCategoriesByGroup(): Record<CategoryGroup, CategoryDef[]> {
  const result: Record<CategoryGroup, CategoryDef[]> = {
    report: [],
    existing_docs: [],
    data_driven: [],
    media: [],
  };
  for (const cat of ATTACHMENT_CATEGORIES) {
    result[cat.group].push(cat);
  }
  return result;
}

/** Generate a unique ID for a document-type category */
export function getDocCategoryId(def: CategoryDef): string {
  if (def.documentTypes?.length) {
    return `doc:${def.documentTypes[0]}`;
  }
  return def.category;
}
