import type { PropertyItem } from '@/lib/types/properties';
import { ADVERTISEMENT_SECTION_CONFIGS } from '@/lib/config/advertisement-sections';
import type { AdvertisementSectionDefinition, AdvertisementSectionId } from '@/lib/types/advertisement';

type PropertyAdvertisementReadinessInput = Pick<
  PropertyItem,
  | 'title'
  | 'address'
  | 'description'
  | 'mainPhotoUrl'
  | 'photoCount'
  | 'latitude'
  | 'longitude'
  | 'hasTranscript'
  | 'hasTitleDoc'
  | 'hasFloorPlan'
  | 'buildingTranscript'
  | 'landTranscript'
>;

function hasText(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCoordinate(value?: number | null): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasTranscriptData(property?: Partial<PropertyAdvertisementReadinessInput>): boolean {
  return Boolean(property?.buildingTranscript || property?.landTranscript);
}

export function buildPropertyAdvertisementReadiness(
  property?: Partial<PropertyAdvertisementReadinessInput>,
): AdvertisementSectionDefinition[] {
  return ADVERTISEMENT_SECTION_CONFIGS.map((section) => {
    switch (section.id) {
      case 'basic-info': {
        return {
          ...section,
          status: hasText(property?.title) || hasText(property?.address) ? 'recommended' : 'available',
          defaultSelected: true,
        };
      }
      case 'photos': {
        const available = (property?.photoCount ?? 0) > 0 || hasText(property?.mainPhotoUrl);
        return {
          ...section,
          status: available ? 'recommended' : 'unavailable',
          unavailableReason: available ? undefined : '尚未上傳任何物件照片。',
          fixTargetLabel: available ? undefined : '前往照片頁籤',
          defaultSelected: available,
        };
      }
      case 'description': {
        const available = hasText(property?.description);
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未填寫物件介紹內容。',
          fixTargetLabel: available ? undefined : '前往介紹頁籤',
          defaultSelected: available,
        };
      }
      case 'transcript-link': {
        const available = property?.hasTranscript === true;
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未上傳謄本文件。',
          fixTargetLabel: available ? undefined : section.fixTargetLabel,
          defaultSelected: false,
        };
      }
      case 'area-detail-table': {
        const available = hasTranscriptData(property);
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未建立建物或土地謄本解析資料。',
          fixTargetLabel: available ? undefined : section.fixTargetLabel,
          defaultSelected: false,
        };
      }
      case 'title-link': {
        const available = property?.hasTitleDoc === true;
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未上傳權狀文件。',
          fixTargetLabel: available ? undefined : section.fixTargetLabel,
          defaultSelected: false,
        };
      }
      case 'location': {
        const available = hasCoordinate(property?.latitude) && hasCoordinate(property?.longitude);
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未設定經緯度定位資料。',
          fixTargetLabel: section.fixTargetLabel,
          defaultSelected: false,
        };
      }
      case 'floor-plan': {
        const available = property?.hasFloorPlan === true;
        return {
          ...section,
          status: available ? 'available' : 'unavailable',
          unavailableReason: available ? undefined : '尚未上傳物件格局圖。',
          fixTargetLabel: available ? undefined : section.fixTargetLabel,
          defaultSelected: false,
        };
      }
      default:
        return {
          ...section,
          status: 'unavailable',
          unavailableReason: '尚未接上可用性判斷。',
          defaultSelected: false,
        };
    }
  });
}

export function getDefaultSelectedAdvertisementSectionIds(
  sections: AdvertisementSectionDefinition[],
): AdvertisementSectionId[] {
  return sections
    .filter((section) => section.defaultSelected && section.status !== 'unavailable')
    .map((section) => section.id);
}