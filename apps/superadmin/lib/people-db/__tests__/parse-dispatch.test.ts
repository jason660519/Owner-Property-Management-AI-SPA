// Verify the parse-dispatch router wires each extension to the correct parser
// and returns a uniform `{ columns, rows, warnings, ext }` shape. The upstream
// parsers are covered elsewhere (csv-parse, xlsx-parse, pdf-parse) — this suite
// only checks the dispatch layer.

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(),
}));

import JSZip from 'jszip';
import {
  dispatchParse,
  extOf,
  isSupportedExt,
  UnsupportedFormatError,
} from '../parse-dispatch';
import * as pdfLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// jsdom's File polyfill omits `arrayBuffer()` / `text()` — the minimum shape
// `dispatchParse` uses — so we hand-roll a File-compatible object instead of
// fighting the environment. The dispatcher only reads `name`, `text()`, and
// `arrayBuffer()`, so this is enough.
interface FileLike {
  name: string;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function toFile(payload: Uint8Array | string, name: string): FileLike {
  const bytes = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
  const copy = new Uint8Array(bytes);
  return {
    name,
    text: async () => new TextDecoder().decode(copy),
    arrayBuffer: async () =>
      copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
  };
}

describe('extOf / isSupportedExt', () => {
  it('extracts the lowercased extension', () => {
    expect(extOf('People.CSV')).toBe('.csv');
    expect(extOf('report.final.XLSX')).toBe('.xlsx');
    expect(extOf('no-extension')).toBe('');
  });

  it('accepts only the documented formats', () => {
    expect(isSupportedExt('.csv')).toBe(true);
    expect(isSupportedExt('.txt')).toBe(true);
    expect(isSupportedExt('.xlsx')).toBe(true);
    expect(isSupportedExt('.pdf')).toBe(true);
    expect(isSupportedExt('.xls')).toBe(false);
    expect(isSupportedExt('.doc')).toBe(false);
    expect(isSupportedExt('')).toBe(false);
  });
});

describe('dispatchParse', () => {
  it('routes .csv to the CSV parser', async () => {
    const file = toFile('name,phone\nA,0912\nB,0923\n', 'sample.csv');
    const parsed = await dispatchParse(file as unknown as File);
    expect(parsed.ext).toBe('.csv');
    expect(parsed.columns).toEqual(['name', 'phone']);
    expect(parsed.rows).toEqual([
      { name: 'A', phone: '0912' },
      { name: 'B', phone: '0923' },
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it('routes .txt through the CSV parser as well', async () => {
    const file = toFile('name,phone\nZ,0999\n', 'sample.txt');
    const parsed = await dispatchParse(file as unknown as File);
    expect(parsed.ext).toBe('.txt');
    expect(parsed.rows).toEqual([{ name: 'Z', phone: '0999' }]);
  });

  it('routes .xlsx through the xlsx parser (jszip-backed)', async () => {
    const zip = new JSZip();
    zip.file(
      'xl/sharedStrings.xml',
      '<?xml version="1.0"?><sst><si><t>name</t></si><si><t>phone</t></si><si><t>王</t></si><si><t>0912</t></si></sst>',
    );
    zip.file(
      'xl/worksheets/sheet1.xml',
      '<?xml version="1.0"?><worksheet><sheetData>' +
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>' +
        '</sheetData></worksheet>',
    );
    const buffer = await zip.generateAsync({ type: 'uint8array' });
    const file = toFile(buffer, 'people.xlsx');
    const parsed = await dispatchParse(file as unknown as File);
    expect(parsed.ext).toBe('.xlsx');
    expect(parsed.columns).toEqual(['name', 'phone']);
    expect(parsed.rows).toEqual([{ name: '王', phone: '0912' }]);
  });

  it('routes .pdf through the pdf parser and surfaces likelyScanned', async () => {
    // Mock pdfjs to return a single empty page -> parser marks likelyScanned.
    (pdfLib.getDocument as jest.Mock).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [{ str: '', transform: [1, 0, 0, 1, 0, 0] }] }),
        }),
      }),
    });
    const file = toFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'scan.pdf');
    const parsed = await dispatchParse(file as unknown as File);
    expect(parsed.ext).toBe('.pdf');
    expect(parsed.likelyScanned).toBe(true);
    expect(parsed.warnings[0]).toContain('OCR');
  });

  it('throws UnsupportedFormatError for unknown extensions', async () => {
    const file = toFile('irrelevant', 'weird.doc');
    await expect(dispatchParse(file as unknown as File)).rejects.toBeInstanceOf(UnsupportedFormatError);
  });
});
