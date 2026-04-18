import JSZip from 'jszip';
import { parseXlsx } from '../xlsx-parse';

// --------------------------------------------------------------------------
// Fixture builders — assemble a valid OOXML SpreadsheetML container in memory
// so we don't need to ship binary .xlsx files in the repo.
// --------------------------------------------------------------------------

interface SheetSpec {
  // Each cell is either a shared-string index (number) or an inline literal
  // (string starting with '"'). Empty string -> skip the cell.
  rows: Array<Array<number | string | null>>;
  sharedStrings: string[];
}

function colLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function buildSheetXml(spec: SheetSpec): string {
  const rowsXml = spec.rows
    .map((cells, rowIdx) => {
      const rowNumber = rowIdx + 1;
      const cellsXml = cells
        .map((cell, colIdx) => {
          if (cell === null || cell === '') return '';
          const ref = `${colLetter(colIdx)}${rowNumber}`;
          if (typeof cell === 'number') {
            return `<c r="${ref}" t="s"><v>${cell}</v></c>`;
          }
          if (cell.startsWith('"')) {
            const value = cell.slice(1);
            return `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
          }
          // bare numeric / formula passthrough
          return `<c r="${ref}"><v>${cell}</v></c>`;
        })
        .join('');
      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function buildSharedStringsXml(strings: string[]): string {
  const items = strings.map((s) => `<si><t>${s}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}

async function buildXlsxBuffer(spec: SheetSpec): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types/>');
  zip.file('xl/workbook.xml', '<?xml version="1.0"?><workbook><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file('xl/sharedStrings.xml', buildSharedStringsXml(spec.sharedStrings));
  zip.file('xl/worksheets/sheet1.xml', buildSheetXml(spec));
  return zip.generateAsync({ type: 'uint8array' });
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('parseXlsx', () => {
  it('reads a simple sheet with shared-string cells', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: ['姓名', '電話', '王小明', '0912345678'],
      rows: [
        [0, 1],
        [2, 3],
      ],
    });
    const result = await parseXlsx(buffer);
    expect(result.columns).toEqual(['姓名', '電話']);
    expect(result.rows).toEqual([{ 姓名: '王小明', 電話: '0912345678' }]);
  });

  it('expands rows that omit trailing empty cells', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: ['name', 'phone', 'address', 'A', '02-1234'],
      rows: [
        [0, 1, 2],
        // Only first two columns set; xlsx writers usually skip the empty trailing.
        [3, 4],
      ],
    });
    const result = await parseXlsx(buffer);
    expect(result.columns).toEqual(['name', 'phone', 'address']);
    expect(result.rows[0]).toEqual({ name: 'A', phone: '02-1234', address: '' });
  });

  it('handles inline strings (t="inlineStr")', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: [],
      rows: [
        ['"name', '"phone'],
        ['"陳大', '"02-9999'],
      ],
    });
    const result = await parseXlsx(buffer);
    expect(result.columns).toEqual(['name', 'phone']);
    expect(result.rows).toEqual([{ name: '陳大', phone: '02-9999' }]);
  });

  it('decodes XML entities in cell values', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: ['note', 'A &amp; B &lt;tag&gt;'],
      rows: [[0], [1]],
    });
    const result = await parseXlsx(buffer);
    expect(result.rows[0]).toEqual({ note: 'A & B <tag>' });
  });

  it('honors cell letter references when columns are sparse', async () => {
    // Only A and C are present in the data row -> column B should be empty.
    const xml = `<?xml version="1.0"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2" t="s"><v>4</v></c></row>
  </sheetData>
</worksheet>`;
    const zip = new JSZip();
    zip.file('xl/sharedStrings.xml', buildSharedStringsXml(['name', 'middle', 'phone', '王', '02']));
    zip.file('xl/worksheets/sheet1.xml', xml);
    const buffer = await zip.generateAsync({ type: 'uint8array' });
    const result = await parseXlsx(buffer);
    expect(result.columns).toEqual(['name', 'middle', 'phone']);
    expect(result.rows[0]).toEqual({ name: '王', middle: '', phone: '02' });
  });

  it('substitutes col_N when a header cell is empty', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: ['name', '', 'phone', 'A', 'B', 'C'],
      rows: [
        [0, 1, 2],
        [3, 4, 5],
      ],
    });
    const result = await parseXlsx(buffer);
    expect(result.columns).toEqual(['name', 'col_2', 'phone']);
  });

  it('skips rows where every cell is empty', async () => {
    const buffer = await buildXlsxBuffer({
      sharedStrings: ['name', 'A', 'B'],
      rows: [
        [0],
        [1],
        [], // entirely empty row from a deleted record
        [2],
      ],
    });
    const result = await parseXlsx(buffer);
    expect(result.rows.length).toBe(2);
    expect(result.rows.map((r) => r.name)).toEqual(['A', 'B']);
  });

  it('returns an empty table for a workbook with no rows', async () => {
    const buffer = await buildXlsxBuffer({ sharedStrings: [], rows: [] });
    const result = await parseXlsx(buffer);
    expect(result).toEqual({ columns: [], rows: [] });
  });
});
