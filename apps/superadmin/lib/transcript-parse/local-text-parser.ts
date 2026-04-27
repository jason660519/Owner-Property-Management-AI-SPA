import type {
  BuildingTranscriptData,
  LandOwnershipRecord,
  LandTranscriptData,
  OwnershipRecord,
  TranscriptHeader,
} from '@/lib/types/properties';
import type { TranscriptParseOutput } from '@/lib/types/transcript';

function normalizeText(text: string): string {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/㆒/g, '一')
    .replace(/㆓/g, '二')
    .replace(/㆔/g, '三')
    .replace(/㈠/g, '一')
    .replace(/㈡/g, '二')
    .replace(/㈢/g, '三')
    .replace(/㈣/g, '四')
    .replace(/㈤/g, '五')
    .replace(/㈥/g, '六')
    .replace(/㈦/g, '七')
    .replace(/㈧/g, '八')
    .replace(/㈨/g, '九')
    .replace(/㈩/g, '十')
    .replace(/㈲/g, '有')
    .replace(/㈰/g, '日')
    .replace(/㈪/g, '月')
    .replace(/㈯/g, '土')
    .replace(/㆞/g, '地')
    .replace(/㆟/g, '人')
    .replace(/㊞/g, '印')
    .replace(/㊠/g, '項');
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanExtractedText(match[1]);
  }
  return '';
}

function cleanExtractedText(value: string): string {
  return value.replace(/\*+/g, '').trim();
}

function emptyHeader(): TranscriptHeader {
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

function emptyBuildingTranscript(): BuildingTranscriptData {
  return {
    header: emptyHeader(),
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
      mainBuildings: [],
      completionDate: '',
      annexedBuildings: [],
      commonAreas: [],
      notes: '',
    },
    ownership: [],
    encumbrances: [],
  };
}

function emptyLandTranscript(): LandTranscriptData {
  return {
    header: emptyHeader(),
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
    ownership: [],
    encumbrances: [],
  };
}

function ownerRecord(params: {
  ownerName: string;
  ownerAddress: string;
  ownershipRatio: string;
  regDate?: string;
  regReason?: string;
  causeDate?: string;
  titleNumber?: string;
}): OwnershipRecord {
  return {
    id: 'local-1',
    seq: '0001',
    regDate: params.regDate ?? '',
    regReason: params.regReason ?? '',
    causeDate: params.causeDate ?? '',
    ownerName: params.ownerName,
    ownerAddress: params.ownerAddress,
    ownershipRatio: params.ownershipRatio,
    titleNumber: params.titleNumber ?? '',
    relatedEncumbranceSeq: '',
    notes: '',
  };
}

function landOwnerRecord(params: {
  ownerName: string;
  ownerAddress: string;
  ownershipRatio: string;
}): LandOwnershipRecord {
  return {
    ...ownerRecord(params),
    currentDeclaredLandValueYear: '',
    currentDeclaredLandValuePerSqm: '',
    prevTransferValueYear: '',
    prevTransferValuePerSqm: '',
    historicalRatios: '',
  };
}

function extractHeader(text: string): TranscriptHeader {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    ...emptyHeader(),
    transcriptType: lines.find((line) => line.includes('登記') && line.includes('謄本')) ?? '',
    documentTitle: firstMatch(text, [
      /([\u4e00-\u9fff一二三四五六七八九十○\s-]+(?:建號|地號))/,
    ]),
    printTime: firstMatch(text, [/列印時間[:：]\s*([^\n]+)/]),
    pageInfo: firstMatch(text, [/頁次[:：]\s*([^\n]+)/]),
    checkNumber: firstMatch(text, [/謄本檢查號[:：]\s*([^\n]+)/]),
    documentNumber: firstMatch(text, [/([^\s\n]*電謄字第[^\s\n]+)/]),
    dataJurisdiction: firstMatch(text, [/資料管轄機關[:：]\s*([^\s\n]+)/]),
    issuingAuthority: firstMatch(text, [/謄本核發機關[:：]\s*([^\s\n]+)/]),
  };
}

function extractOwnership(text: string): {
  ownerName: string;
  ownerAddress: string;
  ownershipRatio: string;
  regDate: string;
  regReason: string;
  causeDate: string;
  titleNumber: string;
} {
  const ownershipSection = extractOwnershipSection(text);
  return {
    ownerName: firstMatch(ownershipSection, [/所有權人[:：]\s*([^\n]+)/]),
    ownerAddress: firstMatch(ownershipSection, [/住\s*址[:：]\s*([^\n]+)/]),
    ownershipRatio: firstMatch(ownershipSection, [/權利範圍[:：]\s*([^\n]+)/]),
    regDate: firstMatch(ownershipSection, [/登記日期[:：]\s*([^\s]+)\s+登記原因/]),
    regReason: firstMatch(ownershipSection, [/登記原因[:：]\s*([^\n]+)/]),
    causeDate: firstMatch(ownershipSection, [/原因發生日期[:：]\s*([^\n]+)/]),
    titleNumber: firstMatch(ownershipSection, [/權狀字號[:：]\s*([^\n]+)/]),
  };
}

function extractOwnershipSection(text: string): string {
  for (const marker of ['建物所有權部', '土地所有權部']) {
    const index = text.indexOf(marker);
    if (index >= 0) return text.slice(index);
  }
  const genericIndex = text.lastIndexOf('所有權部');
  return genericIndex >= 0 ? text.slice(genericIndex) : text;
}

function extractCommonArea(text: string): BuildingTranscriptData['description']['commonAreas'] {
  const entries: BuildingTranscriptData['description']['commonAreas'] = [];
  const regex = /共有部分[:：]\s*([^\s*]+建號)[^\n]*?[\s*]*([\d,.]+)\s*平方公尺\s*\n\s*權利範圍[:：]\s*([^\n]+)/g;
  for (const match of text.matchAll(regex)) {
    entries.push({
      buildingNumber: cleanExtractedText(match[1] ?? ''),
      area: cleanExtractedText(match[2] ?? ''),
      ratio: cleanExtractedText(match[3] ?? ''),
    });
  }
  return entries;
}

function extractAnnexedBuildings(text: string): BuildingTranscriptData['description']['annexedBuildings'] {
  const entries: BuildingTranscriptData['description']['annexedBuildings'] = [];
  const regex = /附屬建物用途[:：]\s*([^\s\n]+)[^\n]*?面積[:：]\s*[\s*]*([\d,.]+)\s*平方公尺/g;
  for (const match of text.matchAll(regex)) {
    entries.push({
      use: cleanExtractedText(match[1] ?? ''),
      area: cleanExtractedText(match[2] ?? ''),
    });
  }
  return entries;
}

function parseBuildingTranscript(text: string): TranscriptParseOutput {
  const header = extractHeader(text);
  const ownership = extractOwnership(text);
  const building = emptyBuildingTranscript();
  const totalArea = firstMatch(text, [/總面積[:：]\s*[\s*]*([\d,.]+)\s*平方公尺/]);
  const buildingNumber = firstMatch(text, [
    /([\u4e00-\u9fff一二三四五六七八九十○\s-]+?\d{4,5}-\d{3}建號)/,
    /([\u4e00-\u9fff一二三四五六七八九十○\s-]+\d+建號)/,
  ]);
  const floorLevel = firstMatch(text, [/層\s*次[:：]\s*([^\s]+)\s+層次面積/]);
  const floorArea = firstMatch(text, [/層次面積[:：]\s*[\s*]*([\d,.]+)\s*平方公尺/]);

  building.header = header;
  building.description = {
    ...building.description,
    buildingNumber,
    regDate: firstMatch(text, [/登記日期[:：]\s*([^\s]+)\s+登記原因/]),
    regReason: firstMatch(text, [/登記原因[:：]\s*([^\n]+)/]),
    doorAddress: firstMatch(text, [/建物門牌[:：]\s*([^\n]+)/]),
    landParcelNumber: firstMatch(text, [/建物坐落地號[:：]\s*([^\n]+)/]),
    mainUse: firstMatch(text, [/主要用途[:：]\s*([^\n]+)/]),
    mainMaterial: firstMatch(text, [/主要建材[:：]\s*([^\n]+)/]),
    totalFloors: firstMatch(text, [/層\s*數[:：]\s*([^\s]+)\s+總面積/]),
    totalArea,
    floorLevel,
    floorArea,
    mainBuildings: floorArea ? [{
      totalFloors: '',
      totalArea,
      floorLevel,
      floorArea,
    }] : [],
    completionDate: firstMatch(text, [/建築完成日期[:：]\s*([^\n]+)/]),
    annexedBuildings: extractAnnexedBuildings(text),
    commonAreas: extractCommonArea(text),
    notes: firstMatch(text, [/其他登記事項[:：]\s*([^\n]+)/]),
  };
  if (ownership.ownerName || ownership.ownershipRatio) {
    building.ownership = [ownerRecord(ownership)];
  }

  return {
    kind: 'building',
    buildingTranscript: building,
    landTranscript: emptyLandTranscript(),
  };
}

function parseLandTranscript(text: string): TranscriptParseOutput {
  const header = extractHeader(text);
  const ownership = extractOwnership(text);
  const land = emptyLandTranscript();
  const landNumber = firstMatch(text, [
    /([\u4e00-\u9fff一二三四五六七八九十○\s-]+?\d{4,5}-\d{4}地號)/,
    /地\s*號[:：]\s*([^\n]+)/,
    /([\u4e00-\u9fff一二三四五六七八九十○\s-]+\d+地號)/,
  ]);

  land.header = header;
  land.description = {
    ...land.description,
    landNumber,
    regDate: firstMatch(text, [/登記日期[:：]\s*([^\s]+)\s+登記原因/]),
    regReason: firstMatch(text, [/登記原因[:：]\s*([^\n]+)/]),
    area: firstMatch(text, [/面\s*積[:：]\s*[\s*]*([\d,.]+)\s*平方公尺/]),
    useZone: firstMatch(text, [/使用分區[:：]\s*([^\n]+)/]),
    useCategory: firstMatch(text, [/使用地類別[:：]\s*([^\n]+)/]),
    announcedValueYear: firstMatch(text, [/公告土地現值.*?民國([^\s]+)/]),
    announcedValuePerSqm: firstMatch(text, [/公告土地現值[^\n]*?([\d,.]+)\s*元/]),
    notes: firstMatch(text, [/其他登記事項[:：]\s*([^\n]+)/]),
  };
  if (ownership.ownerName || ownership.ownershipRatio) {
    land.ownership = [landOwnerRecord(ownership)];
  }

  return {
    kind: 'land',
    buildingTranscript: emptyBuildingTranscript(),
    landTranscript: land,
  };
}

export function parseTranscriptTextLayer(text: string): TranscriptParseOutput | null {
  const normalized = normalizeText(text);
  if (!normalized.trim()) return null;
  if (normalized.includes('土地標示部') || normalized.includes('土地登記')) {
    return parseLandTranscript(normalized);
  }
  if (normalized.includes('建物標示部') || normalized.includes('建物登記')) {
    return parseBuildingTranscript(normalized);
  }
  return null;
}
