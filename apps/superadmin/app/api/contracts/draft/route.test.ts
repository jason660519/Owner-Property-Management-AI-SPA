type MockResponseInit = {
  status?: number;
  headers?: Record<string, string>;
};

class MockResponse {
  status: number;
  headers: Headers;
  private readonly bodyText: string;

  constructor(body?: BodyInit | null, init?: MockResponseInit) {
    this.status = init?.status ?? 200;
    this.headers = new Headers(init?.headers);
    this.bodyText = typeof body === 'string' ? body : '';
  }

  async json() {
    return JSON.parse(this.bodyText);
  }

  async text() {
    return this.bodyText;
  }
}

import { POST } from './route';

jest.mock('@/lib/actions/properties', () => ({
  getPropertyById: jest.fn(),
  getPropertyDocuments: jest.fn(),
}));

const { getPropertyById, getPropertyDocuments } = jest.requireMock('@/lib/actions/properties') as {
  getPropertyById: jest.Mock;
  getPropertyDocuments: jest.Mock;
};

function createProperty(type: 'sale' | 'rental' = 'rental') {
  return {
    id: 'property-1',
    type,
    title: '測試物件',
    address: '臺北市大安區仁愛路四段295號3樓',
    addressCity: '臺北市',
    addressDistrict: '大安區',
    addressStreet: '仁愛路四段',
    addressNumber: '295號',
    addressFloor: '3樓',
    addressUnit: '',
    status: type === 'sale' ? 'for_sale' : 'vacant',
    price: type === 'sale' ? 25800000 : null,
    monthlyRent: type === 'rental' ? 32000 : null,
    creatorName: 'tester',
    ownerName: '王大明',
    ownerId: 'owner-1',
    area: 30,
    propertyType: '大樓',
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 1,
    parkingSpaces: 1,
    createdAt: '2026-03-20T00:00:00.000Z',
    buildingTranscript: {
      header: {
        transcriptType: '建物登記第二類謄本',
        documentTitle: '建號全部',
        printTime: '民國115年03月20日',
        pageInfo: '1/1',
        printer: '系統',
        checkNumber: 'A1',
        documentNumber: '建字第1號',
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
      ownership: [{
        id: 'bo-1', seq: '0001', regDate: '民國100年01月01日', regReason: '買賣', causeDate: '民國100年01月01日', ownerName: '王大明', ownerAddress: '臺北市', ownershipRatio: '全部', titleNumber: '100北字001', relatedEncumbranceSeq: '', notes: '',
      }],
      encumbrances: [],
    },
    landTranscript: {
      header: {
        transcriptType: '土地登記第二類謄本',
        documentTitle: '地號全部',
        printTime: '民國115年03月20日',
        pageInfo: '1/1',
        printer: '系統',
        checkNumber: 'L1',
        documentNumber: '土字第1號',
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
      ownership: [{
        id: 'lo-1', seq: '0001', regDate: '民國99年01月01日', regReason: '買賣', causeDate: '民國99年01月01日', ownerName: '王大明', ownerAddress: '臺北市', ownershipRatio: '全部', titleNumber: '99北字001', relatedEncumbranceSeq: '', notes: '', currentDeclaredLandValueYear: '115', currentDeclaredLandValuePerSqm: '100000', prevTransferValueYear: '114', prevTransferValuePerSqm: '90000', historicalRatios: '',
      }],
      encumbrances: [],
    },
  };
}

function buildRequest(body: unknown) {
  return {
    json: async () => body,
  } as Request;
}

describe('POST /api/contracts/draft', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.Response = MockResponse as unknown as typeof Response;
  });

  it('returns a lease draft for a rental property', async () => {
    getPropertyById.mockResolvedValue(createProperty('rental'));
    getPropertyDocuments.mockResolvedValue([]);

    const request = buildRequest({
        contractType: 'lease',
        propertyId: 'property-1',
        tenantName: '林小美',
        leaseStartDate: '2026-04-01',
        leaseEndDate: '2027-03-31',
        depositAmount: 64000,
      contractCopiesCount: 3,
      holdoverPenaltyMultiple: 2,
      usePurpose: 'office',
      includedItems: ['冷氣', '冰箱'],
        specialTerms: '承租人不得飼養寵物。',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.draft.contractType).toBe('lease');
    expect(body.draft.ownerName).toBe('王大明');
    expect(body.draft.contractCopiesCount).toBe(3);
    expect(body.draft.holdoverPenaltyMultiple).toBe(2);
    expect(body.draft.usePurpose).toBe('office');
    expect(body.draft.includedItems).toEqual(['冷氣', '冰箱']);
    expect(body.draft.specialTerms).toBe('承租人不得飼養寵物。');
  });

  it('returns a sale draft for a sale property', async () => {
    getPropertyById.mockResolvedValue(createProperty('sale'));
    getPropertyDocuments.mockResolvedValue([]);

    const request = buildRequest({
        contractType: 'sale',
        propertyId: 'property-1',
        buyerName: '黃買方',
        scrivenerName: '林代書',
        deliveryCondition: '依現況點交，附建物現況確認書。',
        taxAllocation: '土地增值稅由賣方負擔。',
        registrationFeeAllocation: '所有權移轉登記規費由買方負擔。',
        brokerFeeAllocation: '仲介費由買賣雙方各半負擔。',
        escrowMethod: '價金履約保證專戶辦理。',
        occupiedByOthersCondition: '目前由前屋主持續占用，點交前完成遷離。',
        encroachmentCondition: '無占用他人土地情形。',
        leaseBorrowCondition: '現有租客已同意於交屋日前終止租約。',
        copyRetentionHolder: '永慶代書事務所',
        defaultClauseSummary: '若有未盡事宜，雙方同意另以書面特約補充。',
        salePriceTotal: 25800000,
        paymentSchedule: [
          { label: '簽約款', amount: 1000000, dueDate: '2026-04-01' },
        ],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.draft.contractType).toBe('sale');
    expect(body.draft.transcriptSections.buildingDescription.title).toBe('建物標示部');
    expect(body.draft.scrivenerName).toBe('林代書');
    expect(body.draft.deliveryCondition).toBe('依現況點交，附建物現況確認書。');
    expect(body.draft.taxAllocation).toBe('土地增值稅由賣方負擔。');
    expect(body.draft.registrationFeeAllocation).toBe('所有權移轉登記規費由買方負擔。');
    expect(body.draft.brokerFeeAllocation).toBe('仲介費由買賣雙方各半負擔。');
    expect(body.draft.escrowMethod).toBe('價金履約保證專戶辦理。');
    expect(body.draft.occupiedByOthersCondition).toBe('目前由前屋主持續占用，點交前完成遷離。');
    expect(body.draft.encroachmentCondition).toBe('無占用他人土地情形。');
    expect(body.draft.leaseBorrowCondition).toBe('現有租客已同意於交屋日前終止租約。');
    expect(body.draft.copyRetentionHolder).toBe('永慶代書事務所');
    expect(body.draft.defaultClauseSummary).toBe('若有未盡事宜，雙方同意另以書面特約補充。');
  });

  it('returns 404 when property is not found', async () => {
    getPropertyById.mockResolvedValue(null);

    const request = buildRequest({
        contractType: 'lease',
        propertyId: 'missing',
        tenantName: '林小美',
        leaseStartDate: '2026-04-01',
        leaseEndDate: '2027-03-31',
        depositAmount: 64000,
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});