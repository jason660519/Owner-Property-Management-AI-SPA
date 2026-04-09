import type { PropertyItem } from '@/lib/types/properties';

import {
  buildPropertyAdvertisementReadiness,
  getDefaultSelectedAdvertisementSectionIds,
} from '../property-advertisement-readiness';

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? '2026-03-30T00:00:00.000Z';
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'property-1',
    type: 'sale',
    title: '台北大安區三房',
    address: '台北市大安區仁愛路四段100號',
    description: '近捷運，採光佳。',
    status: 'for_sale',
    price: 32800000,
    monthlyRent: null,
    ownerName: '王小明',
    ownerId: 'owner-1',
    area: 32,
    propertyType: '大樓',
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 2,
    parkingSpaces: 1,
    photoCount: 6,
    mainPhotoUrl: 'https://example.com/photo.jpg',
    hasTranscript: true,
    hasTitleDoc: true,
    hasFloorPlan: false,
    buildingTranscript: {
      header: {
        transcriptType: '',
        documentTitle: '',
        printTime: '',
        pageInfo: '',
        printer: '',
        checkNumber: '',
        documentNumber: '',
        dataJurisdiction: '',
        issuingAuthority: '',
        transcriptNotes: '',
      },
      description: {
        buildingNumber: '123建號',
        regDate: '',
        regReason: '',
        doorAddress: '',
        landParcelNumber: '',
        mainUse: '',
        mainMaterial: '',
        totalFloors: '',
        totalArea: '',
        floorLevel: '5樓',
        floorArea: '25',
        mainBuildings: [],
        annexedBuildings: [],
        commonAreas: [],
        completionDate: '',
        notes: '',
      },
      ownership: [],
      encumbrances: [],
    },
    latitude: null,
    longitude: null,
    ...overrides,
    createdAt,
    updatedAt,
  };
}

describe('property-advertisement-readiness', () => {
  it('builds eight readiness sections from real property data and document flags', () => {
    const sections = buildPropertyAdvertisementReadiness(makeProperty());

    expect(sections).toHaveLength(8);
    expect(sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'basic-info', status: 'recommended' }),
        expect.objectContaining({ id: 'photos', status: 'recommended' }),
        expect.objectContaining({ id: 'description', status: 'available' }),
        expect.objectContaining({ id: 'transcript-link', status: 'available' }),
        expect.objectContaining({ id: 'area-detail-table', status: 'available' }),
        expect.objectContaining({ id: 'title-link', status: 'available' }),
        expect.objectContaining({ id: 'location', status: 'unavailable' }),
        expect.objectContaining({ id: 'floor-plan', status: 'unavailable' }),
      ]),
    );
  });

  it('marks missing description, media, and documents as unavailable with reasons', () => {
    const sections = buildPropertyAdvertisementReadiness(
      makeProperty({
        description: '',
        photoCount: 0,
        mainPhotoUrl: null,
        hasTranscript: false,
        hasTitleDoc: false,
        hasFloorPlan: false,
        buildingTranscript: null,
        landTranscript: null,
      }),
    );

    expect(sections.find((section) => section.id === 'photos')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未上傳任何物件照片。',
      }),
    );

    expect(sections.find((section) => section.id === 'description')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未填寫物件介紹內容。',
      }),
    );

    expect(sections.find((section) => section.id === 'transcript-link')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未上傳謄本文件。',
      }),
    );

    expect(sections.find((section) => section.id === 'area-detail-table')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未建立建物或土地謄本解析資料。',
      }),
    );

    expect(sections.find((section) => section.id === 'title-link')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未上傳權狀文件。',
      }),
    );

    expect(sections.find((section) => section.id === 'floor-plan')).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        unavailableReason: '尚未上傳格局圖。',
      }),
    );
  });

  it('returns default selected section ids for available default sections only', () => {
    const sectionIds = getDefaultSelectedAdvertisementSectionIds(
      buildPropertyAdvertisementReadiness(
        makeProperty({
          description: '',
          photoCount: 0,
          mainPhotoUrl: null,
          hasTranscript: false,
          hasTitleDoc: false,
          hasFloorPlan: false,
          buildingTranscript: null,
          landTranscript: null,
        }),
      ),
    );

    expect(sectionIds).toEqual(['basic-info']);
  });
});
