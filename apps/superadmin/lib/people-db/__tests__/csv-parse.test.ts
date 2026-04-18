import { parseCsv } from '../csv-parse';

describe('parseCsv', () => {
  it('parses a simple header + rows', () => {
    const csv = 'name,age\n王小明,30\n李大華,25\n';
    const result = parseCsv(csv);
    expect(result.columns).toEqual(['name', 'age']);
    expect(result.rows).toEqual([
      { name: '王小明', age: '30' },
      { name: '李大華', age: '25' },
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = 'name,note\n"王, 小明","a, b, c"\n';
    const result = parseCsv(csv);
    expect(result.rows).toEqual([{ name: '王, 小明', note: 'a, b, c' }]);
  });

  it('handles escaped quotes inside fields', () => {
    const csv = 'name,note\n"He said ""hi""","ok"\n';
    const result = parseCsv(csv);
    expect(result.rows).toEqual([{ name: 'He said "hi"', note: 'ok' }]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4\r\n';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: '1', b: '2' });
  });

  it('strips BOM', () => {
    const csv = '\uFEFFname,age\n王,30\n';
    const result = parseCsv(csv);
    expect(result.columns).toEqual(['name', 'age']);
    expect(result.rows[0]).toEqual({ name: '王', age: '30' });
  });

  it('skips blank lines', () => {
    const csv = 'a,b\n1,2\n\n3,4\n';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it('fills missing trailing fields with empty string', () => {
    const csv = 'a,b,c\n1,2\n';
    const result = parseCsv(csv);
    expect(result.rows[0]).toEqual({ a: '1', b: '2', c: '' });
  });

  it('handles empty input', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
  });

  it('generates column names for blank headers', () => {
    const csv = ',name,\n1,2,3\n';
    const result = parseCsv(csv);
    expect(result.columns).toEqual(['col_1', 'name', 'col_3']);
  });

  it('preserves newlines inside quoted fields', () => {
    const csv = 'a,b\n"line1\nline2",ok\n';
    const result = parseCsv(csv);
    expect(result.rows[0].a).toBe('line1\nline2');
  });
});
