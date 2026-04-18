// Row 145 Sprint 2 — FinePrint .fp parser unit tests.
// TDD: locks the people-row extraction semantics against the JSON document
// shape produced by tools/fp-converter/convert_fp.py --format json.

import { extractPeopleFromFpDoc, type FpDocument } from '../parsers/fp-parse';

// ---------------------------------------------------------------------------
// Fixture — shape mirrors what convert_fp.py --format json actually emits.
// Anonymized: names replaced with common placeholder values.
// ---------------------------------------------------------------------------

const buildingTranscript: FpDocument = {
  source_file: 'sample-building.fp',
  header: ['臺北市', '光特版地政電傳資訊系統', '松山區', '06494-000', '建號'],
  sections: [
    {
      name: '建物標示部',
      fields: [
        { label: '登記日期', value: '民國100年02月11日' },
        { label: '建物門牌', value: '南京東路五段１６７號十樓之１' },
        { label: '主要用途', value: '住家用' },
      ],
    },
    {
      name: '建物所有權部',
      fields: [
        { label: '登記次序', value: '0002' },
        { label: '登記日期', value: '民國100年03月03日' },
        { label: '登記原因', value: '買賣' },
        { label: '所有權人', value: '王小明' },
        { label: '住址', value: '台北市松山區敦化北路１７０號四樓' },
        { label: '權利範圍', value: '全部1分之1' },
        { label: '權狀字號', value: '100北松字第004888號' },
      ],
    },
    {
      name: '建物他項權利部',
      fields: [
        { label: '登記次序', value: '0001-000' },
        { label: '權利種類', value: '最高限額抵押權' },
        { label: '設定權利人', value: '合作金庫商業銀行股份有限公司' },
        { label: '住址', value: '台北市中正區館前路77號' },
        { label: '設定義務人', value: '王小明' },
        { label: '擔保債權總金額', value: '新臺幣7,200,000元整' },
      ],
    },
  ],
};

describe('extractPeopleFromFpDoc', () => {
  it('returns one row per 所有權人', () => {
    const rows = extractPeopleFromFpDoc(buildingTranscript);
    const owners = rows.filter((r) => r.title_position === '所有權人');
    expect(owners).toHaveLength(1);
    expect(owners[0].full_name).toBe('王小明');
    expect(owners[0].address).toBe('台北市松山區敦化北路１７０號四樓');
  });

  it('extracts 設定權利人 and 設定義務人 as additional people rows', () => {
    const rows = extractPeopleFromFpDoc(buildingTranscript);
    const creditor = rows.find((r) => r.title_position === '設定權利人');
    const debtor = rows.find((r) => r.title_position === '設定義務人');
    expect(creditor?.full_name).toBe('合作金庫商業銀行股份有限公司');
    expect(creditor?.address).toBe('台北市中正區館前路77號');
    expect(debtor?.full_name).toBe('王小明');
  });

  it('attaches provenance note with 權狀字號 and 登記日期 when present', () => {
    const rows = extractPeopleFromFpDoc(buildingTranscript);
    const owner = rows.find((r) => r.title_position === '所有權人');
    expect(owner?.note).toContain('100北松字第004888號');
    expect(owner?.note).toContain('民國100年03月03日');
  });

  it('tags each row with source_section so downstream can audit origin', () => {
    const rows = extractPeopleFromFpDoc(buildingTranscript);
    expect(rows.find((r) => r.full_name === '王小明' && r.title_position === '所有權人')?.source_section).toBe('建物所有權部');
    expect(rows.find((r) => r.title_position === '設定權利人')?.source_section).toBe('建物他項權利部');
  });

  it('returns empty array when there are no owner/party fields', () => {
    const barren: FpDocument = {
      source_file: 'empty.fp',
      header: [],
      sections: [
        { name: '建物標示部', fields: [{ label: '建物門牌', value: '某地址' }] },
      ],
    };
    expect(extractPeopleFromFpDoc(barren)).toEqual([]);
  });

  it('handles multiple owners in one section (co-ownership)', () => {
    const coOwned: FpDocument = {
      source_file: 'coown.fp',
      header: [],
      sections: [
        {
          name: '建物所有權部',
          fields: [
            { label: '登記次序', value: '0001' },
            { label: '所有權人', value: '王大明' },
            { label: '住址', value: '地址A' },
            { label: '權利範圍', value: '2分之1' },
            { label: '登記次序', value: '0002' },
            { label: '所有權人', value: '李小華' },
            { label: '住址', value: '地址B' },
            { label: '權利範圍', value: '2分之1' },
          ],
        },
      ],
    };
    const rows = extractPeopleFromFpDoc(coOwned);
    const owners = rows.filter((r) => r.title_position === '所有權人');
    expect(owners).toHaveLength(2);
    expect(owners[0].full_name).toBe('王大明');
    expect(owners[0].address).toBe('地址A');
    expect(owners[1].full_name).toBe('李小華');
    expect(owners[1].address).toBe('地址B');
  });

  it('preserves company suffix in the name (does not split 股份有限公司)', () => {
    const rows = extractPeopleFromFpDoc(buildingTranscript);
    const creditor = rows.find((r) => r.title_position === '設定權利人');
    expect(creditor?.full_name).toBe('合作金庫商業銀行股份有限公司');
  });

  it('skips rows whose name is empty or whitespace-only', () => {
    const partial: FpDocument = {
      source_file: 'partial.fp',
      header: [],
      sections: [
        {
          name: '建物所有權部',
          fields: [
            { label: '所有權人', value: '' },
            { label: '住址', value: '地址X' },
            { label: '所有權人', value: '   ' },
            { label: '所有權人', value: '林小明' },
          ],
        },
      ],
    };
    const rows = extractPeopleFromFpDoc(partial);
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe('林小明');
  });
});
