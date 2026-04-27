import { buildPropertySyncFromConfirmedTranscriptIntake } from '../confirmed-result-to-property-details';
import type { BuildingTranscriptData, LandTranscriptData } from '@/lib/types/properties';

function makeHeader() {
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

function makeBuildingTranscript(): BuildingTranscriptData {
  return {
    header: makeHeader(),
    description: {
      buildingNumber: '001建號',
      regDate: '',
      regReason: '',
      doorAddress: '台北市大安區信義路四段100號5樓',
      landParcelNumber: '',
      mainUse: '住家用',
      mainMaterial: '鋼筋混凝土造',
      totalFloors: '',
      totalArea: '80',
      floorLevel: '',
      floorArea: '',
      mainBuildings: [],
      completionDate: '',
      annexedBuildings: [],
      commonAreas: [],
      notes: '',
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

function makeLandTranscript(): LandTranscriptData {
  return {
    header: makeHeader(),
    description: {
      landNumber: '100地號',
      regDate: '',
      regReason: '',
      landCategory: '',
      grade: '',
      area: '200',
      useZone: '住宅區',
      useCategory: '',
      announcedValueYear: '',
      announcedValuePerSqm: '',
      buildingsOnLand: '',
      notes: '',
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

describe('buildPropertySyncFromConfirmedTranscriptIntake', () => {
  it('maps main building, land, parking rights and owner into property sync payload', () => {
    const buildingTranscript = makeBuildingTranscript();
    const landTranscript = makeLandTranscript();

    const sync = buildPropertySyncFromConfirmedTranscriptIntake({
      runId: 'run-1',
      confirmedAt: '2026-04-27T00:00:00Z',
      detection: {
        dispositionKind: 'unit_building_with_land_share_sale',
        documentKinds: ['building_transcript', 'land_transcript'],
        parkingTitleRights: ['shared_facility'],
        hasBuildingTranscript: true,
        hasLandTranscript: true,
        hasParkingEvidence: true,
        buildingOwnershipLikelyFull: true,
        landOwnershipLikelyFull: false,
        buildingNumberCount: 1,
        landParcelCount: 1,
        riskFlags: [],
        evidence: [],
      },
      review: {
        approved: true,
        confidence: 0.9,
        issues: [],
        parkingTitleRights: ['independent', 'shared_facility'],
        dispositionKind: 'unit_building_with_land_share_sale',
        userConfirmationRequired: [],
      },
      parsedResult: {
        documents: [
          {
            documentType: 'building_registry_transcript',
            parsedResult: {
              kind: 'building',
              buildingTranscript,
              landTranscript: makeLandTranscript(),
            },
          },
          {
            documentType: 'land_registry_transcript',
            parsedResult: {
              kind: 'land',
              buildingTranscript: makeBuildingTranscript(),
              landTranscript,
            },
          },
        ],
      },
    });

    expect(sync).toMatchObject({
      detailsPatch: {
        buildingTranscript,
        landTranscript,
        parkingTitleRights: ['independent', 'shared_facility'],
        transcriptIntakeDispositionKind: 'unit_building_with_land_share_sale',
        transcriptIntakeRunId: 'run-1',
      },
      hasIndependentParking: true,
      isPureLand: false,
      landNumber: '100地號',
      primaryOwnerName: '王小明',
    });
  });

  it('marks pure land when only land transcript is present', () => {
    const landTranscript = makeLandTranscript();

    const sync = buildPropertySyncFromConfirmedTranscriptIntake({
      runId: 'run-2',
      confirmedAt: '2026-04-27T00:00:00Z',
      detection: null,
      review: null,
      parsedResult: {
        documents: [
          {
            documentType: 'land_registry_transcript',
            parsedResult: {
              kind: 'land',
              buildingTranscript: makeBuildingTranscript(),
              landTranscript,
            },
          },
        ],
      },
    });

    expect(sync.isPureLand).toBe(true);
    expect(sync.hasIndependentParking).toBe(false);
    expect(sync.detailsPatch.landTranscript).toBe(landTranscript);
  });

  it('applies user-confirmed area detail corrections before syncing property details', () => {
    const buildingTranscript = makeBuildingTranscript();
    const landTranscript = makeLandTranscript();

    const sync = buildPropertySyncFromConfirmedTranscriptIntake({
      runId: 'run-3',
      confirmedAt: '2026-04-27T00:00:00Z',
      detection: null,
      review: {
        approved: true,
        confidence: 0.9,
        issues: [],
        parkingTitleRights: ['independent'],
        dispositionKind: 'unit_building_with_land_share_sale',
        userConfirmationRequired: [],
      },
      parsedResult: {
        documents: [
          {
            documentType: 'building_registry_transcript',
            parsedResult: {
              kind: 'building',
              buildingTranscript,
              landTranscript: makeLandTranscript(),
            },
          },
          {
            documentType: 'land_registry_transcript',
            parsedResult: {
              kind: 'land',
              buildingTranscript: makeBuildingTranscript(),
              landTranscript,
            },
          },
        ],
      },
      areaDetailDraft: {
        version: 1,
        dispositionKind: 'unit_building_with_land_share_sale',
        parkingTitleRights: ['shared_facility'],
        buildingAreas: [{
          id: 'building-1',
          label: '五層',
          identifier: '001建號',
          areaSqm: '88.5',
          shareRatio: '全部',
          use: '住家用',
        }],
        landShareAreas: [{
          id: 'land-1',
          label: '住宅區',
          identifier: '100地號',
          areaSqm: '220',
          shareRatio: '10000分之360',
          use: '住宅區',
        }],
        parkingBuildingAreas: [],
        parkingLandShareAreas: [],
      },
    });

    expect(sync.detailsPatch.buildingTranscript?.description.totalArea).toBe('88.5');
    expect(sync.detailsPatch.landTranscript?.description.area).toBe('220');
    expect(sync.detailsPatch.landTranscript?.ownership[0].ownershipRatio).toBe('10000分之360');
    expect(sync.detailsPatch.parkingTitleRights).toEqual(['shared_facility']);
    expect(sync.detailsPatch.transcriptIntakeAreaDetails?.updatedAt).toBe('2026-04-27T00:00:00Z');
  });

  it('maps unclassified transcript documents by parsed kind', () => {
    const landTranscript = makeLandTranscript();
    const emptyBuildingTranscript = makeBuildingTranscript();
    emptyBuildingTranscript.description.buildingNumber = '';
    emptyBuildingTranscript.description.totalArea = '';
    emptyBuildingTranscript.ownership = [];

    const sync = buildPropertySyncFromConfirmedTranscriptIntake({
      runId: 'run-4',
      confirmedAt: '2026-04-27T00:00:00Z',
      detection: null,
      review: null,
      parsedResult: {
        documents: [
          {
            documentType: 'registry_transcript_unclassified',
            parsedResult: {
              kind: 'land',
              buildingTranscript: emptyBuildingTranscript,
              landTranscript,
            },
          },
        ],
      },
    });

    expect(sync.detailsPatch.landTranscript).toBe(landTranscript);
    expect(sync.isPureLand).toBe(true);
  });

  it('keeps both building and land data from one mixed unclassified title copy', () => {
    const buildingTranscript = makeBuildingTranscript();
    const landTranscript = makeLandTranscript();

    const sync = buildPropertySyncFromConfirmedTranscriptIntake({
      runId: 'run-5',
      confirmedAt: '2026-04-27T00:00:00Z',
      detection: null,
      review: null,
      parsedResult: {
        documents: [
          {
            documentType: 'registry_transcript_unclassified',
            parsedResult: {
              kind: 'land',
              buildingTranscript,
              landTranscript,
            },
          },
        ],
      },
    });

    expect(sync.detailsPatch.buildingTranscript).toBe(buildingTranscript);
    expect(sync.detailsPatch.landTranscript).toBe(landTranscript);
  });
});
