import {
  mapParsedResultToBuildingForm,
  normalizeLocalParsedToCloudSchema,
} from '../transcript-parsed-to-form';

describe('mapParsedResultToBuildingForm (Cloud AI Result → form)', () => {
  it('strips 「平方公尺」 unit for annexed building and common area when using cloud parsed result', () => {
    const parsed: any = {
      謄本資訊: {
        謄本種類: '建物登記第二類謄本(建號全部)',
        建物建號: '大安區復興段二小段 01696-000建號',
      },
      建物標示部: {
        附屬建物用途: '陽台',
        陽台面積: '20.07 平方公尺',
        共有部分: '2,029.25 平方公尺',
        權利範圍: '89484分之1339',
      },
      建物所有權部: {},
      他項權利部: {},
    };

    const { description } = mapParsedResultToBuildingForm(parsed);

    expect(description.annexedBuildings[0]?.area).toBe('20.07 平方公尺');
    expect(description.commonAreas[0]?.area).toBe('2,029.25 平方公尺');
  });

  it('maps array inputs for ownership, encumbrances, and annexed buildings correctly', () => {
    const parsed: any = {
      謄本資訊: {
        謄本種類: '建物登記第二類謄本(建號全部)',
        建物建號: '大安區復興段二小段 01696-000建號',
      },
      建物標示部: {
        附屬建物用途: ['陽台', '雨遮'],
        陽台面積: ['20.07', '3.50'],
        共有部分: ['2,029.25', '100.00'],
        權利範圍: ['10000分之100', '10000分之50'],
      },
      建物所有權部: [
        {
          登記次序: '0001',
          所有權人: 'Owner A',
          權利範圍: '1/2',
        },
        {
          登記次序: '0002',
          所有權人: 'Owner B',
          權利範圍: '1/2',
        }
      ],
      他項權利部: [
        {
          登記次序: '0001',
          權利人: 'Bank A',
          擔保債權總金額: '10,000,000',
        },
        {
          登記次序: '0002',
          權利人: 'Bank B',
          擔保債權總金額: '5,000,000',
        }
      ],
    };

    const { description, ownership, encumbrances } = mapParsedResultToBuildingForm(parsed);

    expect(description.annexedBuildings).toHaveLength(2);
    expect(description.annexedBuildings[0]).toEqual({ use: '陽台', area: '20.07' });
    expect(description.annexedBuildings[1]).toEqual({ use: '雨遮', area: '3.50' });

    expect(description.commonAreas).toHaveLength(2);
    expect(description.commonAreas[0].area).toBe('2,029.25');
    expect(description.commonAreas[1].area).toBe('100.00');

    expect(ownership).toHaveLength(2);
    expect(ownership[0].ownerName).toBe('Owner A');
    expect(ownership[1].ownerName).toBe('Owner B');

    expect(encumbrances).toHaveLength(2);
    expect(encumbrances[0].creditorName).toBe('Bank A');
    expect(encumbrances[1].creditorName).toBe('Bank B');
  });

  it('normalizes local python parsed result before transcribing', () => {
    const localParsed: Record<string, unknown> = {
      meta: {
        transcript_name: '建物登記第二類謄本(建號全部)',
        building_number: '大安區復興段二小段 01696-000建號',
        print_time: '民國102年07月08日14時21分',
        print_operator: '願景不動產仲介股份有限公司',
        document_check_number: '102AF007115REG03135F0D8C4F040059A60088EE8028AB',
        transcript_check_number: '大安電謄字第007115號',
        data_authority: '臺北市大安地政事務所',
        issuing_authority: '臺北市大安地政事務所',
      },
      building_description: {
        registration_date: '民國067年12月19日',
        registration_reason: '第一次登記',
        door_number: '仁愛路四段345巷4弄25號',
        land_number: '仁愛段二小段 0367-0000',
        primary_use: '住家用',
        primary_material: '鋼筋混凝土造',
        floors: '007',
        total_area: '108.31 平方公尺',
        floor_levels: [{ 層次: '一層', 面積: '108.31 平方公尺' }],
        completion_date: '民國067年12月19日',
        attached_structures: [{ 用途: '陽台', 面積: '17.84 平方公尺' }],
        common_areas: [{ 建號: '01719-000', 面積: '894.84 平方公尺', 權利範圍: '89484分之1339' }],
        other_notes: '測試備註',
      },
      ownership_records: [
        {
          sequence: '0002',
          registration_date: '民國098年10月28日',
          registration_reason: '買賣',
          reason_date: '民國098年10月02日',
          owner_name: '王小明',
          owner_address: '臺北市大安區',
          share: '10分之1',
          certificate_number: '099北大字第012501號',
          related_other_rights: '0009-000',
          other_notes: 'owner note',
        },
      ],
      other_right_records: [
        {
          sequence: '0009-000',
          right_type: '抵押權',
          receipt_date: '民國091年07月04日',
          receipt_number: '大安字第193180號',
          registration_date: '民國091年07月04日',
          registration_reason: '設定',
          right_holder: '銀行甲',
          right_holder_address: '臺北市信義區',
          debt_ratio: '全部 1分之1',
          total_secured_debt: '新台幣 9,000,000 元正',
          duration: '自091年06月26日至141年06月25日',
          repayment_date: '依照各個契約約定',
          interest_rate: '依照各個契約約定',
          default_interest_rate: '依照各個契約約定',
          penalty: '依照各個契約約定',
          debtor_ratio: '王小明 1/1',
          right_subject: '所有權',
          subject_sequence: '0002',
          right_scope: '全部 1分之1',
          certificate_number: '091北大字第004524號',
          obligor: '王小明',
          common_collateral_land: '仁愛段二小段 0367-0000',
          common_collateral_building: '01659-000',
          other_notes: 'enc note',
        },
      ],
    };

    const normalized = normalizeLocalParsedToCloudSchema(localParsed);
    const { header, description, ownership, encumbrances } = mapParsedResultToBuildingForm(normalized);

    expect(header.printer).toBe('願景不動產仲介股份有限公司');
    expect(header.checkNumber).toBe('102AF007115REG03135F0D8C4F040059A60088EE8028AB');
    expect(header.documentNumber).toBe('大安電謄字第007115號');
    expect(description.mainUse).toBe('住家用');
    expect(description.annexedBuildings[0]).toEqual({ use: '陽台', area: '17.84 平方公尺' });
    expect(ownership).toHaveLength(1);
    expect(ownership[0].ownerName).toBe('王小明');
    expect(encumbrances).toHaveLength(1);
    expect(encumbrances[0].creditorName).toBe('銀行甲');
  });
});
