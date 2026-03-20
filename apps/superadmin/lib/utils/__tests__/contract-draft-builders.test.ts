import type {
  BuildingTranscriptData,
  LandTranscriptData,
  PropertyItem,
} from '@/lib/types/properties';
import {
  buildLeaseContractDraftFromProperty,
  buildSaleContractDraftFromProperty,
} from '@/lib/utils/contract-draft-builders';

function createBuildingTranscript(): BuildingTranscriptData {
  return {
    header: {
      transcriptType: '建物登記第二類謄本',
      documentTitle: '大安區仁愛段 123 建號',
      printTime: '民國115年03月20日',
      pageInfo: '1/1',
      printer: '系統',
      checkNumber: 'ABC123',
      documentNumber: '建字第001號',
      dataJurisdiction: '臺北市大安地政事務所',
      issuingAuthority: '臺北市大安地政事務所',
      transcriptNotes: '',
    },
    description: {
      buildingNumber: '123建號',
      regDate: '民國100年01月01日',
      regReason: '第一次登記',
      doorAddress: '臺北市大安區仁愛路四段295號3樓',
      landParcelNumber: '仁愛段100地號',
      mainUse: '住宅用',
      mainMaterial: '鋼筋混凝土造',
      totalFloors: '12層',
      totalArea: '99.17',
      floorLevel: '三層',
      floorArea: '33.05',
      completionDate: '民國99年12月31日',
      annexedBuildings: [],
      commonAreas: [],
      notes: '',
    },
    ownership: [
      {
        id: 'bo-1',
        seq: '0001',
        regDate: '民國100年01月01日',
        regReason: '買賣',
        causeDate: '民國100年01月01日',
        ownerName: '王大明',
        ownerAddress: '臺北市',
        ownershipRatio: '全部',
        titleNumber: '100北字001',
        relatedEncumbranceSeq: '',
        notes: '',
      },
    ],
    encumbrances: [
      {
        id: 'be-1',
        seq: '0001',
        encumbranceType: '最高限額抵押權',
        receiptDate: '民國100年01月01日',
        receiptNumber: '收件001',
        regDate: '民國100年01月01日',
        regReason: '設定',
        creditorName: '第一銀行',
        creditorAddress: '臺北市',
        debtRatio: '全部',
        totalDebt: '新臺幣1000萬元',
        duration: '',
        repaymentDate: '',
        interest: '',
        lateInterest: '',
        penalty: '',
        debtorAndRatio: '',
        rightsSubject: '',
        targetSeq: '',
        settleRightsRatio: '',
        certNumber: '',
        settlor: '王大明',
        jointGuaranteeLandNumbers: '',
        jointGuaranteeBuildingNumbers: '',
        notes: '',
      },
    ],
  };
}

function createLandTranscript(): LandTranscriptData {
  return {
    header: {
      transcriptType: '土地登記第二類謄本',
      documentTitle: '大安區仁愛段 100 地號',
      printTime: '民國115年03月20日',
      pageInfo: '1/1',
      printer: '系統',
      checkNumber: 'XYZ789',
      documentNumber: '土地字第001號',
      dataJurisdiction: '臺北市大安地政事務所',
      issuingAuthority: '臺北市大安地政事務所',
      transcriptNotes: '',
    },
    description: {
      landNumber: '仁愛段100地號',
      regDate: '民國99年01月01日',
      regReason: '第一次登記',
      landCategory: '建築用地',
      grade: '',
      area: '120.5',
      useZone: '住三',
      useCategory: '住宅區',
      announcedValueYear: '115',
      announcedValuePerSqm: '100000',
      buildingsOnLand: '123建號',
      notes: '',
    },
    ownership: [
      {
        id: 'lo-1',
        seq: '0001',
        regDate: '民國99年01月01日',
        regReason: '買賣',
        causeDate: '民國99年01月01日',
        ownerName: '王大明',
        ownerAddress: '臺北市',
        ownershipRatio: '全部',
        titleNumber: '99北字001',
        relatedEncumbranceSeq: '',
        notes: '',
        currentDeclaredLandValueYear: '115',
        currentDeclaredLandValuePerSqm: '100000',
        prevTransferValueYear: '114',
        prevTransferValuePerSqm: '90000',
        historicalRatios: '',
      },
    ],
    encumbrances: [],
  };
}

function createProperty(): PropertyItem {
  return {
    id: 'property-lease-1',
    type: 'rental',
    title: '仁愛路住宅',
    address: '臺北市大安區仁愛路四段295號3樓',
    addressCity: '臺北市',
    addressDistrict: '大安區',
    addressStreet: '仁愛路四段',
    addressNumber: '295號',
    addressFloor: '3樓',
    addressUnit: '',
    status: 'draft',
    price: null,
    monthlyRent: 32000,
    ownerName: '王大明',
    ownerId: 'owner-1',
    area: 30,
    propertyType: '大樓',
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 1,
    parkingSpaces: 1,
    createdAt: '2026-03-20T00:00:00.000Z',
    buildingTranscript: createBuildingTranscript(),
    landTranscript: createLandTranscript(),
  };
}

describe('buildLeaseContractDraftFromProperty', () => {
  it('builds a minimal lease draft using property and transcript data', () => {
    const property = createProperty();

    const draft = buildLeaseContractDraftFromProperty({
      property,
      tenantName: '林小美',
      leaseStartDate: '2026-04-01',
      leaseEndDate: '2027-03-31',
      depositAmount: 64000,
      contractCopiesCount: 3,
      holdoverPenaltyMultiple: 2,
      paymentDueDay: 5,
      includedItems: ['冷氣', '冰箱'],
      specialTerms: '承租人不得飼養寵物。',
      buildingTranscriptAttachment: {
        attachmentId: 'att-building-lease',
        fileName: 'building-copy.pdf',
        storagePath: 'contracts/property-lease-1/building-copy.pdf',
      },
    });

    expect(draft.ownerName).toBe('王大明');
    expect(draft.propertyAddress).toContain('臺北市');
    expect(draft.buildingNumber).toBe('123建號');
    expect(draft.encumbranceSummary).toContain('第一銀行');
    expect(draft.attachments).toHaveLength(1);
    expect(draft.contractCopiesCount).toBe(3);
    expect(draft.holdoverPenaltyMultiple).toBe(2);
    expect(draft.monthlyRent).toBe(32000);
    expect(draft.includedItems).toEqual(['冷氣', '冰箱']);
    expect(draft.specialTerms).toBe('承租人不得飼養寵物。');
  });
});

describe('buildSaleContractDraftFromProperty', () => {
  it('builds a sale draft with transcript sections and risk flags', () => {
    const property = { ...createProperty(), type: 'sale' as const, price: 25800000, monthlyRent: null };

    const draft = buildSaleContractDraftFromProperty({
      property,
      buyerName: '黃買方',
      salePriceTotal: 25800000,
      landPrice: 16000000,
      buildingPrice: 8200000,
      parkingLandPrice: 600000,
      parkingBuildingPrice: 1000000,
      paymentSchedule: [
        { label: '簽約款', amount: 1000000, dueDate: '2026-04-01' },
        { label: '尾款', amount: 24800000, dueDate: '2026-05-20' },
      ],
      buildingTranscriptAttachment: {
        attachmentId: 'att-building-sale',
        fileName: 'building-copy.pdf',
        storagePath: 'contracts/property-sale-1/building-copy.pdf',
      },
      landTranscriptAttachment: {
        attachmentId: 'att-land-sale',
        fileName: 'land-copy.pdf',
        storagePath: 'contracts/property-sale-1/land-copy.pdf',
      },
    });

    expect(draft.sellerName).toBe('王大明');
    expect(draft.transcriptSections.buildingDescription.content).toContain('123建號');
    expect(draft.transcriptSections.landOwnership.content).toContain('王大明');
    expect(draft.encumbranceExistsFlag).toBe(true);
    expect(draft.manualReviewRequired).toBe(true);
    expect(draft.landPrice).toBe(16000000);
    expect(draft.buildingPrice).toBe(8200000);
    expect(draft.parkingLandPrice).toBe(600000);
    expect(draft.parkingBuildingPrice).toBe(1000000);
    expect(draft.attachments).toHaveLength(2);
  });

  it('throws when the property lacks required transcripts for a sale draft', () => {
    const property = {
      ...createProperty(),
      type: 'sale' as const,
      buildingTranscript: null,
    };

    expect(() =>
      buildSaleContractDraftFromProperty({
        property,
        buyerName: '黃買方',
        salePriceTotal: 25800000,
        paymentSchedule: [{ label: '簽約款', amount: 1000000, dueDate: '2026-04-01' }],
        buildingTranscriptAttachment: {
          attachmentId: 'att-building-sale',
          fileName: 'building-copy.pdf',
          storagePath: 'contracts/property-sale-1/building-copy.pdf',
        },
        landTranscriptAttachment: {
          attachmentId: 'att-land-sale',
          fileName: 'land-copy.pdf',
          storagePath: 'contracts/property-sale-1/land-copy.pdf',
        },
      }),
    ).toThrow('Sale contract draft requires both building and land transcripts.');
  });
});