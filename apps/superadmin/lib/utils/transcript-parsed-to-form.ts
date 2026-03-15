// filepath: apps/superadmin/lib/utils/transcript-parsed-to-form.ts
// Maps transcript parsed JSON to building transcript data (for form transcribe).
import type {
  TranscriptHeader,
  BuildingTranscriptData,
  BuildingDescription,
  OwnershipRecord,
  EncumbranceRecord,
  AnnexedBuilding,
  CommonAreaEntry,
  LandTranscriptData,
  LandDescription,
  LandOwnershipRecord,
} from '@/lib/types/properties';


function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') {
    // Collapse multiple spaces and remove asterisks often used for padding in PDFs
    return v.replace(/[\s*]+/g, ' ').trim();
  }
  return String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is Record<string, unknown> =>
    !!item && typeof item === 'object' && !Array.isArray(item)
  );
}

function newId(): string {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function toRecordArrayLoose(v: unknown): Record<string, unknown>[] {
  const r = asRecord(v);
  if (r) return [r];
  return asRecordArray(v);
}

function toStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((item) => str(item)).filter(Boolean);
  return [str(v)].filter(Boolean);
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

function emptyDescription(): BuildingDescription {
  return {
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
    completionDate: '',
    annexedBuildings: [],
    commonAreas: [],
    notes: '',
  };
}

function buildFromKeyValue(parsed: Record<string, unknown>): BuildingTranscriptData {
  const meta = asRecord(parsed['謄本資訊']) ?? {};
  const mark = asRecord(parsed['建物標示部']) ?? {};

  const header: TranscriptHeader = {
    transcriptType: str(meta['謄本種類']),
    documentTitle: str(meta['建物建號']),
    printTime: str(meta['列印時間']),
    pageInfo: str(meta['頁次']),
    printer: str(meta['列印機構']),
    checkNumber: str(meta['謄本檢查號']),
    documentNumber: str(meta['大安電謄字號'] ?? meta['謄本字號']),
    dataJurisdiction: str(meta['資料管轄機關']),
    issuingAuthority: str(meta['謄本核發機關']),
    transcriptNotes: str(parsed['備註']),
  };

  const annexUses = toStringArray(mark['附屬建物用途']);
  const annexAreas = toStringArray(mark['陽台面積'] ?? mark['附屬建物面積'] ?? mark['面積']);
  const annexedBuildings: AnnexedBuilding[] = [];
  const maxAnnexLen = Math.max(annexUses.length, annexAreas.length);
  for (let i = 0; i < maxAnnexLen; i++) {
    annexedBuildings.push({
      use: str(annexUses[i] ?? '附屬建物'),
      area: str(annexAreas[i] ?? ''),
    });
  }

  const commonAreas: CommonAreaEntry[] = [];
  const commonParts = toStringArray(mark['共有部分']);
  const commonRatios = toStringArray(mark['權利範圍']);
  const maxCommonLen = Math.max(commonParts.length, commonRatios.length);
  for (let i = 0; i < maxCommonLen; i++) {
    commonAreas.push({
      buildingNumber: '',
      area: str(commonParts[i] ?? ''),
      ratio: str(commonRatios[i] ?? ''),
    });
  }

  const description: BuildingDescription = {
    buildingNumber: str(mark['建號'] ?? meta['建物建號']),
    regDate: str(mark['登記日期']),
    regReason: str(mark['登記原因']),
    doorAddress: str(mark['建物門牌']),
    landParcelNumber: str(mark['建物坐落地號']),
    mainUse: str(mark['主要用途']),
    mainMaterial: str(mark['主要建材']),
    totalFloors: str(mark['層數']),
    totalArea: str(mark['總面積']),
    floorLevel: str(mark['層次']),
    floorArea: str(mark['層次面積']),
    completionDate: str(mark['建築完成日期']),
    annexedBuildings,
    commonAreas,
    notes: Array.isArray(mark['其他登記事項'])
      ? (mark['其他登記事項'] as unknown[]).map((v) => str(v)).filter(Boolean).join('\n')
      : str(mark['其他登記事項']),
  };

  const ownership: OwnershipRecord[] = [];
  const ownerList = toRecordArrayLoose(parsed['建物所有權部']);
  for (const item of ownerList) {
    const rel = item['相關他項權利登記次序'];
    const relatedSeq = Array.isArray(rel)
      ? rel.map((v) => str(v)).filter(Boolean).join('、')
      : str(rel);
    ownership.push({
      id: newId(),
      seq: str(item['登記次序']),
      regDate: str(item['登記日期']),
      regReason: str(item['登記原因']),
      causeDate: str(item['原因發生日期']),
      ownerName: str(item['所有權人']),
      ownerAddress: str(item['住址'] ?? item['設籍住址'] ?? item['所有權人住址']),
      ownershipRatio: str(item['權利範圍']),
      titleNumber: str(item['權狀字號']),
      relatedEncumbranceSeq: relatedSeq,
      notes: str(item['其他登記事項']),
    });
  }

  const encumbrances: EncumbranceRecord[] = [];
  const encList = toRecordArrayLoose(parsed['他項權利部']);
  for (const item of encList) {
    encumbrances.push({
      id: newId(),
      seq: str(item['登記次序']),
      encumbranceType: str(item['權利種類'] ?? '抵押權'),
      receiptDate: str(item['收件日期']),
      receiptNumber: str(item['字號']),
      regDate: str(item['登記日期']),
      regReason: str(item['登記原因'] ?? '設定'),
      creditorName: str(item['權利人']),
      creditorAddress: str(item['住址'] ?? item['權利人住址']),
      debtRatio: str(item['債權額比例']),
      totalDebt: str(item['擔保債權總金額']),
      duration: str(item['存續期間']),
      repaymentDate: str(item['清償日期']),
      interest: str(item['利息率'] ?? item['利息']),
      lateInterest: str(item['遲延利息率'] ?? item['遲延利息']),
      penalty: str(item['違約金']),
      debtorAndRatio: str(item['債務人及債務額比例']),
      rightsSubject: str(item['權利標的']),
      targetSeq: str(item['標的登記次序']),
      settleRightsRatio: str(item['設定權利範圍']),
      certNumber: str(item['證明書字號']),
      settlor: str(item['設定義務人']),
      jointGuaranteeLandNumbers: str(item['共同擔保地號']),
      jointGuaranteeBuildingNumbers: str(item['共同擔保建號']),
      notes: str(item['其他登記事項']),
      debtScope: str(item['債權範圍']),
      debtConfirmDate: str(item['債權確定日期']),
      otherGuaranteeScope: str(item['其他擔保範圍']),
    });
  }

  return { header, description, ownership, encumbrances };
}

function emptyLandDescription(): LandDescription {
  return {
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
  };
}

function buildLandFromKeyValue(parsed: Record<string, unknown>): LandTranscriptData {
  const meta = asRecord(parsed['謄本資訊']) ?? {};
  const mark = asRecord(parsed['土地標示部']) ?? {};

  const header: TranscriptHeader = {
    transcriptType: str(meta['謄本種類']),
    documentTitle: str(meta['土地地號']),
    printTime: str(meta['列印時間']),
    pageInfo: str(meta['頁次']),
    printer: str(meta['列印機構']),
    checkNumber: str(meta['謄本檢查號']),
    documentNumber: str(meta['大安電謄字號'] ?? meta['謄本字號']),
    dataJurisdiction: str(meta['資料管轄機關']),
    issuingAuthority: str(meta['謄本核發機關']),
    transcriptNotes: str(parsed['備註']),
  };

  const description: LandDescription = {
    landNumber: str(mark['地號'] ?? meta['土地地號']),
    regDate: str(mark['登記日期']),
    regReason: str(mark['登記原因']),
    landCategory: str(mark['地目']),
    grade: str(mark['等則']),
    area: str(mark['面積']),
    useZone: str(mark['使用分區']),
    useCategory: str(mark['使用地類別']),
    announcedValueYear: str(mark['公告土地現值年度']),
    announcedValuePerSqm: str(mark['公告土地現值']),
    buildingsOnLand: str(mark['地上建物建號']),
    notes: Array.isArray(mark['其他登記事項'])
      ? (mark['其他登記事項'] as unknown[]).map((v) => str(v)).filter(Boolean).join('\n')
      : str(mark['其他登記事項']),
  };

  const ownership: LandOwnershipRecord[] = [];
  const ownerList = toRecordArrayLoose(parsed['土地所有權部']);
  for (const item of ownerList) {
    const rel = item['相關他項權利登記次序'];
    const relatedSeq = Array.isArray(rel)
      ? rel.map((v) => str(v)).filter(Boolean).join('、')
      : str(rel);
    ownership.push({
      id: newId(),
      seq: str(item['登記次序']),
      regDate: str(item['登記日期']),
      regReason: str(item['登記原因']),
      causeDate: str(item['原因發生日期']),
      ownerName: str(item['所有權人']),
      ownerAddress: str(item['住址'] ?? item['設籍住址'] ?? item['所有權人住址']),
      ownershipRatio: str(item['權利範圍']),
      titleNumber: str(item['權狀字號']),
      relatedEncumbranceSeq: relatedSeq,
      notes: str(item['其他登記事項']),
      currentDeclaredLandValueYear: str(item['當期申報地價年度']),
      currentDeclaredLandValuePerSqm: str(item['當期申報地價']),
      prevTransferValueYear: str(item['前次移轉現值年度']),
      prevTransferValuePerSqm: str(item['前次移轉現值']),
      historicalRatios: str(item['歷次資格']),
    });
  }

  const encumbrances: EncumbranceRecord[] = [];
  const encList = toRecordArrayLoose(parsed['他項權利部']);
  for (const item of encList) {
    encumbrances.push({
      id: newId(),
      seq: str(item['登記次序']),
      encumbranceType: str(item['權利種類'] ?? '抵押權'),
      receiptDate: str(item['收件日期']),
      receiptNumber: str(item['字號']),
      regDate: str(item['登記日期']),
      regReason: str(item['登記原因'] ?? '設定'),
      creditorName: str(item['權利人']),
      creditorAddress: str(item['住址'] ?? item['權利人住址']),
      debtRatio: str(item['債權額比例']),
      totalDebt: str(item['擔保債權總金額']),
      duration: str(item['存續期間']),
      repaymentDate: str(item['清償日期']),
      interest: str(item['利息率'] ?? item['利息']),
      lateInterest: str(item['遲延利息率'] ?? item['遲延利息']),
      penalty: str(item['違約金']),
      debtorAndRatio: str(item['債務人及債務額比例']),
      rightsSubject: str(item['權利標的']),
      targetSeq: str(item['標的登記次序']),
      settleRightsRatio: str(item['設定權利範圍']),
      certNumber: str(item['證明書字號']),
      settlor: str(item['設定義務人']),
      jointGuaranteeLandNumbers: str(item['共同擔保地號']),
      jointGuaranteeBuildingNumbers: str(item['共同擔保建號']),
      notes: str(item['其他登記事項']),
      debtScope: str(item['債權範圍']),
      debtConfirmDate: str(item['債權確定日期']),
      otherGuaranteeScope: str(item['其他擔保範圍']),
    });
  }

  return { header, description, ownership, encumbrances };
}

function buildLandFromLocalPython(parsed: Record<string, unknown>): LandTranscriptData {
  const meta = asRecord(parsed['meta']) ?? {};
  const desc = asRecord(parsed['land_description']) ?? {};
  const ownershipRecords = asRecordArray(parsed['ownership_records']);
  const otherRightRecords = asRecordArray(parsed['other_right_records']);

  const header: TranscriptHeader = {
    transcriptType: str(meta['transcript_name']),
    documentTitle: str(meta['land_number']),
    printTime: str(meta['print_time']),
    pageInfo: '',
    printer: str(meta['print_operator']),
    checkNumber: str(meta['document_check_number']),
    documentNumber: str(meta['transcript_check_number']),
    dataJurisdiction: str(meta['data_authority']),
    issuingAuthority: str(meta['issuing_authority']),
    transcriptNotes: '',
  };

  const description: LandDescription = {
    landNumber: str(meta['land_number']),
    regDate: str(desc['registration_date']),
    regReason: str(desc['registration_reason']),
    landCategory: '',
    grade: '',
    area: str(desc['area']),
    useZone: str(desc['land_use_zone'] ?? desc['zoning']),
    useCategory: str(desc['land_use_type']),
    announcedValueYear: '',
    announcedValuePerSqm: '',
    buildingsOnLand: str(desc['buildings_on_land']),
    notes: str(desc['other_notes']),
  };

  const ownership: LandOwnershipRecord[] = ownershipRecords.map((item) => ({
    id: newId(),
    seq: str(item['sequence']),
    regDate: str(item['registration_date']),
    regReason: str(item['registration_reason']),
    causeDate: str(item['reason_date']),
    ownerName: str(item['owner_name']),
    ownerAddress: str(item['owner_address']),
    ownershipRatio: str(item['share']),
    titleNumber: str(item['certificate_number']),
    relatedEncumbranceSeq: str(item['related_other_rights']),
    notes: str(item['other_notes']),
    currentDeclaredLandValueYear: '',
    currentDeclaredLandValuePerSqm: str(item['current_declared_price'] ?? item['current_declared_value']),
    prevTransferValueYear: '',
    prevTransferValuePerSqm: str(item['previous_transfer_value'] ?? item['previous_transfer_value_per_sqm']),
    historicalRatios: str(item['historical_shares'] ?? item['historical_ratios']),
  }));

  const encumbrances: EncumbranceRecord[] = otherRightRecords.map((item) => ({
    id: newId(),
    seq: str(item['sequence']),
    encumbranceType: str(item['right_type'] ?? '抵押權'),
    receiptDate: str(item['receipt_date']),
    receiptNumber: str(item['receipt_number']),
    regDate: str(item['registration_date']),
    regReason: str(item['registration_reason'] ?? '設定'),
    creditorName: str(item['right_holder']),
    creditorAddress: str(item['right_holder_address']),
    debtRatio: str(item['debt_ratio']),
    totalDebt: str(item['total_secured_debt']),
    duration: str(item['duration']),
    repaymentDate: str(item['repayment_date']),
    interest: str(item['interest_rate']),
    lateInterest: str(item['default_interest_rate']),
    penalty: str(item['penalty']),
    debtorAndRatio: str(item['debtor_ratio']),
    rightsSubject: str(item['right_subject']),
    targetSeq: str(item['subject_sequence']),
    settleRightsRatio: str(item['right_scope']),
    certNumber: str(item['證明書字號'] ?? item['certificate_number']),
    settlor: str(item['obligor']),
    jointGuaranteeLandNumbers: str(item['common_collateral_land']),
    jointGuaranteeBuildingNumbers: str(item['common_collateral_building']),
    notes: str(item['other_notes']),
  }));

  return { header, description, ownership, encumbrances };
}

function buildFromLocalPython(parsed: Record<string, unknown>): BuildingTranscriptData {
  const meta = asRecord(parsed['meta']) ?? {};
  const desc = asRecord(parsed['building_description']) ?? {};
  const ownershipRecords = asRecordArray(parsed['ownership_records']);
  const otherRightRecords = asRecordArray(parsed['other_right_records']);
  const floorLevels = asRecordArray(desc['floor_levels']);
  const attachedStructures = asRecordArray(desc['attached_structures']);
  const common = asRecordArray(desc['common_areas']);
  const firstFloor = floorLevels[0] ?? {};

  const header: TranscriptHeader = {
    transcriptType: str(meta['transcript_name']),
    documentTitle: str(meta['building_number']),
    printTime: str(meta['print_time']),
    pageInfo: '',
    printer: str(meta['print_operator']),
    checkNumber: str(meta['document_check_number']),
    documentNumber: str(meta['transcript_check_number']),
    dataJurisdiction: str(meta['data_authority']),
    issuingAuthority: str(meta['issuing_authority']),
    transcriptNotes: '',
  };

  const annexedBuildings: AnnexedBuilding[] = attachedStructures.map((item) => ({
    use: str(item['用途']),
    area: str(item['面積']),
  }));

  const commonAreas: CommonAreaEntry[] = common.map((item) => ({
    buildingNumber: str(item['建號']),
    area: str(item['面積']),
    ratio: str(item['權利範圍']),
  }));

  const description: BuildingDescription = {
    buildingNumber: str(meta['building_number']),
    regDate: str(desc['registration_date']),
    regReason: str(desc['registration_reason']),
    doorAddress: str(desc['door_number']),
    landParcelNumber: str(desc['land_number']),
    mainUse: str(desc['primary_use']),
    mainMaterial: str(desc['primary_material']),
    totalFloors: str(desc['floors']),
    totalArea: str(desc['total_area']),
    floorLevel: str(firstFloor['層次']),
    floorArea: str(firstFloor['面積']),
    completionDate: str(desc['completion_date']),
    annexedBuildings,
    commonAreas,
    notes: str(desc['other_notes']),
  };

  const ownership: OwnershipRecord[] = ownershipRecords.map((item) => ({
    id: newId(),
    seq: str(item['sequence']),
    regDate: str(item['registration_date']),
    regReason: str(item['registration_reason']),
    causeDate: str(item['reason_date']),
    ownerName: str(item['owner_name']),
    ownerAddress: str(item['owner_address']),
    ownershipRatio: str(item['share']),
    titleNumber: str(item['certificate_number']),
    relatedEncumbranceSeq: str(item['related_other_rights']),
    notes: str(item['other_notes']),
  }));

  const encumbrances: EncumbranceRecord[] = otherRightRecords.map((item) => ({
    id: newId(),
    seq: str(item['sequence']),
    encumbranceType: str(item['right_type'] ?? '抵押權'),
    receiptDate: str(item['receipt_date']),
    receiptNumber: str(item['receipt_number']),
    regDate: str(item['registration_date']),
    regReason: str(item['registration_reason'] ?? '設定'),
    creditorName: str(item['right_holder']),
    creditorAddress: str(item['right_holder_address']),
    debtRatio: str(item['debt_ratio']),
    totalDebt: str(item['total_secured_debt']),
    duration: str(item['duration']),
    repaymentDate: str(item['repayment_date']),
    interest: str(item['interest_rate']),
    lateInterest: str(item['default_interest_rate']),
    penalty: str(item['penalty']),
    debtorAndRatio: str(item['debtor_ratio']),
    rightsSubject: str(item['right_subject']),
    targetSeq: str(item['subject_sequence']),
    settleRightsRatio: str(item['right_scope']),
    certNumber: str(item['certificate_number']),
    settlor: str(item['obligor']),
    jointGuaranteeLandNumbers: str(item['common_collateral_land']),
    jointGuaranteeBuildingNumbers: str(item['common_collateral_building']),
    notes: str(item['other_notes']),
  }));

  return { header, description, ownership, encumbrances };
}

function buildFromSections(parsed: Record<string, unknown>, kind: 'building' | 'land'): BuildingTranscriptData | LandTranscriptData {
  const sections = asRecord(parsed['sections']) ?? {};
  const basic = asRecord(sections['basic']) ?? {};
  const ownerships = asRecordArray(sections['ownerships'] ?? sections['ownership_records']);
  const encumbrancesList = asRecordArray(sections['encumbrances'] ?? sections['other_right_records']);

  const header: TranscriptHeader = {
    transcriptType: str(parsed['document_type'] ?? parsed['transcript_type']),
    documentTitle: str(basic['build_register_number'] ?? basic['land_register_number']),
    printTime: '',
    pageInfo: '',
    printer: '',
    checkNumber: '',
    documentNumber: '',
    dataJurisdiction: str(parsed['register_office']),
    issuingAuthority: '',
    transcriptNotes: '',
  };

  if (kind === 'building') {
    const profile = asRecord(sections['building_profile']) ?? {};
    const areaSummary = asRecord(sections['area_summary']) ?? {};
    const description: BuildingDescription = {
      buildingNumber: str(basic['build_register_number']),
      regDate: str(basic['registration_date']),
      regReason: str(basic['registration_reason']),
      doorAddress: str(profile['location']),
      landParcelNumber: Array.isArray(basic['land_register_numbers'])
        ? basic['land_register_numbers'].map(v => str(v)).join(', ')
        : str(basic['land_register_numbers']),
      mainUse: str(profile['main_use']),
      mainMaterial: str(profile['structure']),
      totalFloors: str((profile['floors'] as Record<string, unknown> | undefined)?.[ 'above_ground']),
      totalArea: str(areaSummary['total']),
      floorLevel: '',
      floorArea: str(areaSummary['main_building']),
      completionDate: str(profile['completion_date']),
      annexedBuildings: [],
      commonAreas: [],
      notes: '',
    };
    const ownership: OwnershipRecord[] = ownerships.map((item) => {
      const holder = asRecord(item['holder']) ?? {};
      return {
        id: newId(),
        seq: '',
        regDate: str(item['acquisition_date']),
        regReason: str(item['acquisition_reason']),
        causeDate: '',
        ownerName: str(holder['name']),
        ownerAddress: str(holder['address']),
        ownershipRatio: str(item['share_ratio']),
        titleNumber: '',
        relatedEncumbranceSeq: '',
        notes: '',
      };
    });
    const encumbrances: EncumbranceRecord[] = encumbrancesList.map((item) => ({
      id: newId(),
      seq: '',
      encumbranceType: str(item['right_type'] ?? '抵押權'),
      receiptDate: str(item['receipt_date']),
      receiptNumber: str(item['receipt_number']),
      regDate: str(item['registration_date']),
      regReason: str(item['registration_reason']),
      creditorName: str(item['right_holder']),
      creditorAddress: str(item['right_holder_address']),
      debtRatio: '',
      totalDebt: str(item['total_secured_debt']),
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
      settlor: '',
      jointGuaranteeLandNumbers: '',
      jointGuaranteeBuildingNumbers: '',
      notes: '',
    }));
    return { header, description, ownership, encumbrances };
  } else {
    // Land
    const description: LandDescription = {
      landNumber: str(basic['land_register_number']),
      regDate: str(basic['registration_date']),
      regReason: str(basic['registration_reason']),
      landCategory: '',
      grade: '',
      area: '',
      useZone: '',
      useCategory: '',
      announcedValueYear: '',
      announcedValuePerSqm: '',
      buildingsOnLand: '',
      notes: '',
    };
    const ownership: LandOwnershipRecord[] = ownerships.map((item) => {
      const holder = asRecord(item['holder']) ?? {};
      return {
        id: newId(),
        seq: '',
        regDate: str(item['acquisition_date']),
        regReason: str(item['acquisition_reason']),
        causeDate: '',
        ownerName: str(holder['name']),
        ownerAddress: str(holder['address']),
        ownershipRatio: str(item['share_ratio']),
        titleNumber: '',
        relatedEncumbranceSeq: '',
        notes: '',
        currentDeclaredLandValueYear: '',
        currentDeclaredLandValuePerSqm: '',
        prevTransferValueYear: '',
        prevTransferValuePerSqm: '',
        historicalRatios: '',
      };
    });
    const encumbrances: EncumbranceRecord[] = encumbrancesList.map((item) => ({
      id: newId(),
      seq: '',
      encumbranceType: str(item['right_type'] ?? '抵押權'),
      receiptDate: str(item['receipt_date']),
      receiptNumber: str(item['receipt_number']),
      regDate: str(item['registration_date']),
      regReason: str(item['registration_reason']),
      creditorName: str(item['right_holder']),
      creditorAddress: str(item['right_holder_address']),
      debtRatio: '',
      totalDebt: str(item['total_secured_debt']),
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
      settlor: '',
      jointGuaranteeLandNumbers: '',
      jointGuaranteeBuildingNumbers: '',
      notes: '',
    }));
    return { header, description, ownership, encumbrances };
  }
}

export function normalizeLocalParsedToBuildingTranscriptData(parsed: unknown): BuildingTranscriptData {
  const r = asRecord(parsed);
  if (!r) return { header: emptyHeader(), description: emptyDescription(), ownership: [], encumbrances: [] };
  if (asRecord(r['header']) && asRecord(r['description'])) {
    const maybe = r as unknown as Partial<BuildingTranscriptData>;
    return {
      header: (maybe.header ?? emptyHeader()) as TranscriptHeader,
      description: (maybe.description ?? emptyDescription()) as BuildingDescription,
      ownership: Array.isArray(maybe.ownership) ? maybe.ownership : [],
      encumbrances: Array.isArray(maybe.encumbrances) ? maybe.encumbrances : [],
    };
  }
  if (asRecord(r['sections'])) return buildFromSections(r, 'building') as BuildingTranscriptData;
  if (asRecord(r['meta']) || asRecord(r['building_description'])) return buildFromLocalPython(r);
  return buildFromKeyValue(r);
}

function emptyLandHeader(): TranscriptHeader {
  return emptyHeader();
}

export function normalizeLocalParsedToLandTranscriptData(parsed: unknown): LandTranscriptData {
  const r = asRecord(parsed);
  if (!r) return { header: emptyLandHeader(), description: emptyLandDescription(), ownership: [], encumbrances: [] };
  if (asRecord(r['header']) && asRecord(r['description'])) {
    const maybe = r as unknown as Partial<LandTranscriptData>;
    return {
      header: (maybe.header ?? emptyLandHeader()) as TranscriptHeader,
      description: (maybe.description ?? emptyLandDescription()) as LandDescription,
      ownership: Array.isArray(maybe.ownership) ? maybe.ownership : [],
      encumbrances: Array.isArray(maybe.encumbrances) ? maybe.encumbrances : [],
    };
  }
  if (asRecord(r['sections'])) return buildFromSections(r, 'land') as LandTranscriptData;
  if (asRecord(r['meta']) || asRecord(r['land_description'])) return buildLandFromLocalPython(r);
  return buildLandFromKeyValue(r);
}
