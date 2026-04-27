import { render, screen, within } from '@testing-library/react';
import { BuildingLandAreaDetailTab } from '../BuildingLandAreaDetailTab';
import type {
  PropertyItem,
  BuildingTranscriptData,
  LandTranscriptData,
} from '@/lib/types/properties';
import type { TranscriptIntakeAreaDetailDraft } from '@/lib/transcript-parse/intake-types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/actions/properties', () => ({
  savePropertyTranscriptData: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? '2026-01-01';
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'test-id',
    type: 'sale',
    title: 'Test Property',
    address: 'Test Address',
    status: 'for_sale',
    price: 1000000,
    monthlyRent: null,
    ownerName: 'Owner',
    ownerId: 'owner-id',
    area: null,
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    livingRooms: null,
    parkingSpaces: null,
    ...overrides,
    createdAt,
    updatedAt,
  };
}

function makeEmptyHeader() {
  return {
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
  };
}

function makeBuildingTranscript(
  overrides: Partial<BuildingTranscriptData['description']> = {}
): BuildingTranscriptData {
  return {
    header: makeEmptyHeader(),
    description: {
      buildingNumber: '台北市大安區○○段00123建號',
      regDate: '',
      regReason: '',
      doorAddress: '台北市大安區信義路四段100號5樓',
      landParcelNumber: '',
      mainUse: '住家用',
      mainMaterial: '鋼筋混凝土造',
      totalFloors: '12',
      totalArea: '132.45',
      floorLevel: '5',
      floorArea: '85.32',
      mainBuildings: [
        { totalFloors: '12', totalArea: '132.45', floorLevel: '5層', floorArea: '85.32' },
      ],
      completionDate: '',
      annexedBuildings: [
        { use: '陽台', area: '12.50' },
        { use: '雨遮', area: '3.20' },
      ],
      commonAreas: [
        { buildingNumber: '00456建號', area: '5000', ratio: '10000分之150' },
      ],
      notes: '',
      ...overrides,
    },
    ownership: [{
      id: '1',
      seq: '0001',
      regDate: '',
      regReason: '',
      causeDate: '',
      ownerName: '王小明',
      ownerAddress: '',
      ownershipRatio: '全部',
      titleNumber: '',
      relatedEncumbranceSeq: '',
      notes: '',
    }],
    encumbrances: [],
  };
}

function makeLandTranscript(
  overrides: Partial<LandTranscriptData['description']> = {}
): LandTranscriptData {
  return {
    header: makeEmptyHeader(),
    description: {
      landNumber: '台北市大安區○○段第0345地號',
      regDate: '',
      regReason: '',
      landCategory: '',
      grade: '',
      area: '800',
      useZone: '住宅區',
      useCategory: '',
      announcedValueYear: '',
      announcedValuePerSqm: '',
      buildingsOnLand: '',
      notes: '',
      ...overrides,
    },
    ownership: [{
      id: '1',
      seq: '0001',
      regDate: '',
      regReason: '',
      causeDate: '',
      ownerName: '王小明',
      ownerAddress: '',
      ownershipRatio: '10000分之350',
      titleNumber: '',
      relatedEncumbranceSeq: '',
      notes: '',
      currentDeclaredLandValueYear: '',
      currentDeclaredLandValuePerSqm: '',
      prevTransferValueYear: '',
      prevTransferValuePerSqm: '',
      historicalRatios: '',
    }],
    encumbrances: [],
  };
}

function makeConfirmedAreaDetails(): TranscriptIntakeAreaDetailDraft {
  return {
    version: 1,
    dispositionKind: 'unit_building_with_land_share_sale',
    parkingTitleRights: ['independent', 'shared_facility'],
    buildingAreas: [
      {
        id: 'building-1',
        sourceDocumentName: '建物所有權狀',
        sourcePage: 1,
        label: '主建物',
        identifier: '02073-000建號',
        areaSqm: '188.20',
        shareRatio: '2分之1',
        use: '商業用',
      },
    ],
    landShareAreas: [
      {
        id: 'land-1',
        sourceDocumentName: '土地所有權狀A',
        sourcePage: 2,
        label: '基地持分',
        identifier: '0091-0000地號',
        areaSqm: '1640',
        shareRatio: '20000分之157',
        use: '建',
      },
      {
        id: 'land-2',
        sourceDocumentName: '土地所有權狀B',
        sourcePage: 3,
        label: '基地持分',
        identifier: '0091-0002地號',
        areaSqm: '446',
        shareRatio: '20000分之157',
        use: '建',
      },
    ],
    parkingBuildingAreas: [
      {
        id: 'parking-building-1',
        sourceDocumentName: '停車位權狀',
        sourcePage: 4,
        label: '獨立車位',
        identifier: '08888-000建號',
        areaSqm: '28.40',
        shareRatio: '全部',
        use: '停車空間',
      },
    ],
    parkingLandShareAreas: [
      {
        id: 'parking-land-1',
        sourceDocumentName: '停車位土地持分',
        sourcePage: 5,
        label: '車位土地持分',
        identifier: '0091-0000地號',
        areaSqm: '1640',
        shareRatio: '100000分之35',
        use: '建',
      },
    ],
    updatedAt: '2026-04-28T00:00:00.000Z',
  };
}

describe('BuildingLandAreaDetailTab', () => {
  describe('no transcript data', () => {
    it('shows empty state message when no transcripts exist', () => {
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={makeProperty()} />);
      expect(screen.getByText(/尚未有謄本資料/)).toBeInTheDocument();
    });
  });

  describe('confirmed transcript intake area details', () => {
    it('uses the confirmed four area-detail tables as the readonly source of truth', () => {
      const property = makeProperty({
        transcriptIntakeAreaDetails: makeConfirmedAreaDetails(),
        landTranscript: makeLandTranscript({ landNumber: 'legacy-land-should-not-render' }),
      });

      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);

      expect(screen.getByText('建物建築面積明細表')).toBeInTheDocument();
      expect(screen.getByText('建物所屬土地持分面積明細表')).toBeInTheDocument();
      expect(screen.getByText('車位建築面積明細表')).toBeInTheDocument();
      expect(screen.getByText('車位所屬土地持分面積明細表')).toBeInTheDocument();

      expect(screen.getByText('02073-000建號')).toBeInTheDocument();
      expect(screen.getAllByText('0091-0000地號').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('0091-0002地號')).toBeInTheDocument();
      expect(screen.getByText('08888-000建號')).toBeInTheDocument();
      expect(screen.queryByText('legacy-land-should-not-render')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('calculates summary from confirmed detail rows including multiple land rows', () => {
      const property = makeProperty({
        transcriptIntakeAreaDetails: makeConfirmedAreaDetails(),
      });

      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);

      const summarySection = screen.getByTestId('area-summary');
      const buildingRow = within(summarySection).getByText('建物建築面積小計').closest('tr')!;
      const landRow = within(summarySection).getByText('建物所屬土地持分面積小計').closest('tr')!;
      const parkingBuildingRow = within(summarySection).getByText('車位建築面積小計').closest('tr')!;
      const parkingLandRow = within(summarySection).getByText('車位所屬土地持分面積小計').closest('tr')!;

      expect(within(buildingRow).getByText('94.1')).toBeInTheDocument();
      expect(within(landRow).getByText('16.38')).toBeInTheDocument();
      expect(within(parkingBuildingRow).getByText('28.4')).toBeInTheDocument();
      expect(within(parkingLandRow).getByText('0.57')).toBeInTheDocument();
    });
  });

  describe('building transcript data', () => {
    it('displays building number', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/00123建號/)).toBeInTheDocument();
    });

    it('displays main building floor area', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('85.32')).toBeInTheDocument();
    });

    it('displays multiple main building entries', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [
            { totalFloors: '12', totalArea: '132.45', floorLevel: '5層', floorArea: '50.00' },
            { totalFloors: '12', totalArea: '132.45', floorLevel: '6層', floorArea: '35.32' },
          ],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('5層')).toBeInTheDocument();
      expect(screen.getByText('6層')).toBeInTheDocument();
      expect(screen.getByText('50.00')).toBeInTheDocument();
      expect(screen.getByText('35.32')).toBeInTheDocument();
    });

    it('displays annexed buildings', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('陽台')).toBeInTheDocument();
      expect(screen.getByText('12.50')).toBeInTheDocument();
      expect(screen.getByText('雨遮')).toBeInTheDocument();
      expect(screen.getByText('3.20')).toBeInTheDocument();
    });

    it('displays common areas with ratio', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('00456建號')).toBeInTheDocument();
      expect(screen.getByText('10000分之150')).toBeInTheDocument();
    });

    it('calculates weighted common area', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      // 5000 * 150/10000 = 75
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('land transcript data', () => {
    it('displays land number', () => {
      const property = makeProperty({
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/0345地號/)).toBeInTheDocument();
    });

    it('displays land area', () => {
      const property = makeProperty({
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('800')).toBeInTheDocument();
    });

    it('displays ownership ratio', () => {
      const property = makeProperty({
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('10000分之350')).toBeInTheDocument();
    });

    it('calculates weighted land area', () => {
      const property = makeProperty({
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      // 800 * 350/10000 = 28 — appears in both land table and summary
      const matches = screen.getAllByText('28');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parking transcript data', () => {
    it('displays parking section when parking transcript exists', () => {
      const property = makeProperty({
        hasIndependentParking: true,
        parkingBuildingTranscript: makeBuildingTranscript({
          buildingNumber: '車位建號99999',
          mainBuildings: [
            { totalFloors: 'B2', totalArea: '40', floorLevel: 'B2', floorArea: '40' },
          ],
          annexedBuildings: [],
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/車位建號99999/)).toBeInTheDocument();
    });

    it('does not show parking section when no parking transcript', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.queryByText(/獨立車位/)).not.toBeInTheDocument();
    });
  });

  describe('summary totals', () => {
    it('calculates total building area (main + annexed + common)', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [
            { totalFloors: '12', totalArea: '100', floorLevel: '5層', floorArea: '100' },
          ],
          annexedBuildings: [
            { use: '陽台', area: '10' },
          ],
          commonAreas: [
            { buildingNumber: '00456', area: '1000', ratio: '1/10' },
          ],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      // main=100 + annexed=10 + common=100 = 210
      const summarySection = screen.getByTestId('area-summary');
      // The "建物面積" summary row should contain 210
      const buildingRow = within(summarySection).getByText('建物面積').closest('tr')!;
      expect(within(buildingRow).getByText('210')).toBeInTheDocument();
      expect(screen.queryByText('建物總面積合計')).not.toBeInTheDocument();
    });

    it('shows ping conversion in summary', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [
            { totalFloors: '12', totalArea: '100', floorLevel: '5層', floorArea: '33.06' },
          ],
          annexedBuildings: [],
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      // 33.06 / 3.305785 ≈ 10.00
      const summarySection = screen.getByTestId('area-summary');
      const buildingRow = within(summarySection).getByText('建物面積').closest('tr')!;
      expect(within(buildingRow).getByText('10.00')).toBeInTheDocument();
    });
  });

  describe('pure land property', () => {
    it('shows only land section for pure land property', () => {
      const property = makeProperty({
        isPureLand: true,
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/0345地號/)).toBeInTheDocument();
      expect(screen.queryByText(/主建物/)).not.toBeInTheDocument();
    });
  });

  describe('building main use and material', () => {
    it('displays main use and material', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('住家用')).toBeInTheDocument();
      expect(screen.getByText('鋼筋混凝土造')).toBeInTheDocument();
    });
  });

  describe('fallback to flat fields', () => {
    it('uses floorLevel/floorArea when mainBuildings is empty', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [],
          floorLevel: '七層',
          floorArea: '110.36',
          totalArea: '125.10',
          annexedBuildings: [],
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('七層')).toBeInTheDocument();
      // 110.36 appears in main table, subtotal, and summary
      expect(screen.getAllByText('110.36').length).toBeGreaterThanOrEqual(1);
    });

    it('uses floorLevel/floorArea when mainBuildings is undefined', () => {
      const transcript = makeBuildingTranscript({
        floorLevel: '五層',
        floorArea: '85.00',
        annexedBuildings: [],
        commonAreas: [],
      });
      // Simulate legacy data where mainBuildings key is missing
      delete (transcript.description as unknown as Record<string, unknown>).mainBuildings;
      const property = makeProperty({ buildingTranscript: transcript });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText('五層')).toBeInTheDocument();
      expect(screen.getAllByText('85').length).toBeGreaterThanOrEqual(1);
    });

    it('includes fallback main area in summary total', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [],
          floorLevel: '七層',
          floorArea: '100',
          annexedBuildings: [{ use: '陽台', area: '10' }],
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      // main=100 + annexed=10 = 110
      const summarySection = screen.getByTestId('area-summary');
      const buildingRow = within(summarySection).getByText('建物面積').closest('tr')!;
      expect(within(buildingRow).getByText('110')).toBeInTheDocument();
    });
  });

  describe('data quality warnings', () => {
    it('shows warning when land area is not a valid number', () => {
      const property = makeProperty({
        landTranscript: makeLandTranscript({ area: ' 平方公尺' }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/土地面積數值缺漏/)).toBeInTheDocument();
    });

    it('shows warning when building has no common areas', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/未包含共有部分/)).toBeInTheDocument();
    });

    it('shows warning when building has no main area at all', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript({
          mainBuildings: [],
          floorArea: '',
          annexedBuildings: [],
          commonAreas: [],
        }),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.getByText(/主建物面積缺漏/)).toBeInTheDocument();
    });

    it('does not show warnings when data is complete', () => {
      const property = makeProperty({
        buildingTranscript: makeBuildingTranscript(),
        landTranscript: makeLandTranscript(),
      });
      render(<BuildingLandAreaDetailTab propertyId="test-id" propertyType="sale" property={property} />);
      expect(screen.queryByText(/缺漏/)).not.toBeInTheDocument();
    });
  });
});
