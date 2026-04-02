import type { TranscriptParseOutput } from '@/lib/types/transcript';
import { transcriptDataForTranscribeFromParseOutput } from '../transcript-parsed-to-form';

function emptyBuildingTranscript() {
  return {
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
      buildingNumber: '',
      regDate: '',
      regReason: '',
      doorAddress: '',
      landParcelNumber: '',
      mainUse: '',
      mainMaterial: '',
      totalFloors: '',
      totalArea: '',
      floorLevel: '',
      floorArea: '',
      mainBuildings: [] as { totalFloors: string; totalArea: string; floorLevel: string; floorArea: string }[],
      completionDate: '',
      annexedBuildings: [] as { use: string; area: string }[],
      commonAreas: [] as { buildingNumber: string; area: string; ratio: string }[],
      notes: '',
    },
    ownership: [] as unknown[],
    encumbrances: [] as unknown[],
  };
}

function emptyLandTranscript() {
  return {
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
      landNumber: '',
      regDate: '',
      regReason: '',
      landCategory: '',
      grade: '',
      area: '',
      useZone: '',
      useCategory: '',
      announcedValueYear: '',
      announcedValuePerSqm: '',
      buildingsOnLand: '',
      notes: '',
    },
    ownership: [] as unknown[],
    encumbrances: [] as unknown[],
  };
}

describe('transcriptDataForTranscribeFromParseOutput', () => {
  it('uses landTranscript when kind is land and land slice has content', () => {
    const output: TranscriptParseOutput = {
      kind: 'land',
      buildingTranscript: emptyBuildingTranscript() as TranscriptParseOutput['buildingTranscript'],
      landTranscript: {
        ...emptyLandTranscript(),
        description: { ...emptyLandTranscript().description, landNumber: '003836-0000' },
      } as TranscriptParseOutput['landTranscript'],
    };
    const data = transcriptDataForTranscribeFromParseOutput(output, 'land') as {
      description: { landNumber: string };
    };
    expect(data.description.landNumber).toBe('003836-0000');
  });

  it('falls back to whole output when nested land slice is empty but root has 謄本資訊 key-value (legacy shape)', () => {
    const output = {
      kind: 'land',
      buildingTranscript: emptyBuildingTranscript(),
      landTranscript: emptyLandTranscript(),
      謄本資訊: {
        謄本種類: '土地登記第二類謄本',
        土地地號: '大安區 測試段 0001-0000地號',
      },
      土地標示部: {
        地號: '0001-0000',
      },
      土地所有權部: [],
      他項權利部: [],
    } as unknown as TranscriptParseOutput;

    const data = transcriptDataForTranscribeFromParseOutput(output, 'land') as {
      description: { landNumber: string };
      header: { documentTitle: string };
    };
    expect(data.header.documentTitle).toContain('0001-0000');
    expect(data.description.landNumber).toBe('0001-0000');
  });
});
