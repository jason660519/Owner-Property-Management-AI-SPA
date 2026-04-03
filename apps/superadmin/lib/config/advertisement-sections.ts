import type { AdvertisementSectionConfig } from '@/lib/types/advertisement';

export const ADVERTISEMENT_SECTION_CONFIGS: AdvertisementSectionConfig[] = [
  {
    id: 'basic-info',
    title: '基本資料',
    description: '標題、價格、地址、格局與物件主資訊。',
  },
  {
    id: 'description',
    title: '物件介紹',
    description: '沿用既有介紹文案或 OCR / 調查資料摘要。',
  },
  {
    id: 'transcript-link',
    title: '謄本連結',
    description: '帶入建物或土地謄本文件連結，方便廣告頁附上原始佐證。',
    fixTargetLabel: '前往謄本頁籤',
  },
  {
    id: 'area-detail-table',
    title: '建物與土地面積明細表',
    description: '根據已解析的建物與土地謄本，整理面積與持分明細。',
    fixTargetLabel: '前往建物土地面積頁籤',
  },
  {
    id: 'title-link',
    title: '權狀連結',
    description: '附上建物權狀或土地權狀文件連結。',
    fixTargetLabel: '前往權狀頁籤',
  },
  {
    id: 'location',
    title: '地段與生活機能',
    description: '依地址與座標整合定位、地段與生活機能資訊。',
    fixTargetLabel: '前往定位頁籤',
  },
  {
    id: 'photos',
    title: '照片亮點',
    description: '使用現有照片作為視覺主軸與段落導引。',
  },
  {
    id: 'floor-plan',
    title: '格局圖',
    description: '在廣告頁中附上格局圖，讓買方或租客更快理解空間配置。',
    fixTargetLabel: '前往格局圖頁籤',
  },
];