import { mapRowsToDocuments, computeQuality } from '../import-mapper';

const baseInput = {
  datasetPath: '企業名錄/2012',
  datasetRoot: '企業名錄',
  datasetSubpath: '2012',
  dataSource: '舊版標籤',
  batchId: 'batch-test',
  batchLabel: '2026Q2',
  now: '2026-04-18T00:00:00.000Z',
};

describe('mapRowsToDocuments', () => {
  it('maps columns to fields using column_mapping indexes', () => {
    const docs = mapRowsToDocuments({
      ...baseInput,
      columns: ['姓名', '電話', '地址'],
      rows: [{ 姓名: '王小明', 電話: '0912-345-678', 地址: '臺北市大安區和平東路二段106號' }],
      columnMapping: { full_name: 0, phone: 1, address: 2 },
    });
    expect(docs).toHaveLength(1);
    const d = docs[0];
    expect(d.name).toBe('王小明');
    expect(d.phone).toBe('0912345678');
    expect(d.address).toBe('臺北市大安區和平東路二段106號');
    expect(d.address_county).toBe('臺北市');
    expect(d.address_district).toBe('大安區');
    expect(d.record_id).toBe('batch-test:0');
    expect(d.batch_id).toBe('batch-test');
    expect(d.dataset_path).toBe('企業名錄/2012');
    expect(d.dataset_root).toBe('企業名錄');
    expect(d.created_at).toBe('2026-04-18T00:00:00.000Z');
  });

  it('skips rows without full_name', () => {
    const docs = mapRowsToDocuments({
      ...baseInput,
      columns: ['姓名', '電話'],
      rows: [
        { 姓名: '', 電話: '0912345678' },
        { 姓名: '李大華', 電話: '0987654321' },
      ],
      columnMapping: { full_name: 0, phone: 1 },
    });
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe('李大華');
    expect(docs[0].record_id).toBe('batch-test:1');
  });

  it('uppercases id_number and lowercases email', () => {
    const docs = mapRowsToDocuments({
      ...baseInput,
      columns: ['姓名', '身分證', 'Email'],
      rows: [{ 姓名: '王小明', 身分證: 'a123456789', Email: 'Foo@Bar.COM' }],
      columnMapping: { full_name: 0, id_number: 1, email: 2 },
    });
    expect(docs[0].id_number).toBe('A123456789');
    expect(docs[0].email).toBe('foo@bar.com');
  });

  it('ignores column indexes that do not exist in columns array', () => {
    const docs = mapRowsToDocuments({
      ...baseInput,
      columns: ['姓名'],
      rows: [{ 姓名: '王' }],
      columnMapping: { full_name: 0, phone: 99 },
    });
    expect(docs[0].phone).toBeNull();
  });

  it('computes quality score bounded by [0,1]', () => {
    const all = computeQuality({
      full_name: '王',
      id_number: 'A123456789',
      phone: '0912',
      mobile: '0912',
      email: 'a@b.c',
      birth_date: '1990/01/01',
      address: '臺北市',
      company: 'X',
      note: 'n',
    });
    expect(all).toBeGreaterThan(0.99);
    expect(all).toBeLessThanOrEqual(1);

    const minimal = computeQuality({ full_name: '王' });
    expect(minimal).toBeCloseTo(0.25, 5);

    expect(computeQuality({})).toBe(0);
  });

  it('returns empty array for empty rows', () => {
    const docs = mapRowsToDocuments({
      ...baseInput,
      columns: ['姓名'],
      rows: [],
      columnMapping: { full_name: 0 },
    });
    expect(docs).toEqual([]);
  });
});
