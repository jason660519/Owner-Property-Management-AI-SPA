// Test the parsePdfTabular delimiter heuristic + scanned-PDF detection.
// We mock pdfjs-dist with an in-memory document so this suite stays fast and
// avoids shipping binary fixtures into the repo.

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => {
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn(),
  };
});

import { parsePdfTabular, extractPdfText } from '../pdf-parse';
import * as pdfLib from 'pdfjs-dist/legacy/build/pdf.mjs';

interface FakeItem {
  str: string;
  transform: number[];
}

function setMockPages(pages: FakeItem[][]) {
  const docMock = {
    numPages: pages.length,
    getPage: async (n: number) => ({
      getTextContent: async () => ({ items: pages[n - 1] }),
    }),
  };
  (pdfLib.getDocument as jest.Mock).mockReturnValue({
    promise: Promise.resolve(docMock),
  });
}

function lineItems(line: string, y: number): FakeItem[] {
  // Each line becomes a single "item" at the given baseline y. pdfjs would
  // normally split a line into multiple items, but our stitcher concatenates
  // items at the same y, so this still exercises the line-break detection.
  return [{ str: line, transform: [1, 0, 0, 1, 0, y] }];
}

beforeEach(() => {
  (pdfLib.getDocument as jest.Mock).mockReset();
});

describe('extractPdfText', () => {
  it('joins page text with the y-coordinate line break heuristic', async () => {
    setMockPages([
      [...lineItems('header row', 100), ...lineItems('王小明 0912345678', 80)],
    ]);
    const result = await extractPdfText(new Uint8Array([0]));
    expect(result.pages[0]).toBe('header row\n王小明 0912345678');
    expect(result.likelyScanned).toBe(false);
  });

  it('stitches same-baseline glyphs into one line even when items arrive per-char', async () => {
    // Simulates 台北市里長 PDFs: pdfjs emits every CJK glyph as its own item,
    // but items on the same visual line share a baseline y (within a few px).
    setMockPages([
      [
        { str: '編', transform: [1, 0, 0, 1, 10, 200] },
        { str: '號', transform: [1, 0, 0, 1, 20, 200] },
        { str: ' ', transform: [1, 0, 0, 1, 30, 200] },
        { str: '305', transform: [1, 0, 0, 1, 40, 200] },
        { str: '姓', transform: [1, 0, 0, 1, 10, 180] },
        { str: '名', transform: [1, 0, 0, 1, 20, 180] },
        { str: ' ', transform: [1, 0, 0, 1, 30, 180] },
        { str: '闕貴卿', transform: [1, 0, 0, 1, 40, 180] },
      ],
    ]);
    const result = await extractPdfText(new Uint8Array([0]));
    expect(result.pages[0]).toBe('編號 305\n姓名 闕貴卿');
  });

  it('tolerates sub-pixel baseline drift within a visual line', async () => {
    // Baseline y values vary between 200.0 and 200.9 — all within tolerance.
    setMockPages([
      [
        { str: '編', transform: [1, 0, 0, 1, 10, 200.0] },
        { str: '號', transform: [1, 0, 0, 1, 20, 200.5] },
        { str: ' ', transform: [1, 0, 0, 1, 30, 200.9] },
        { str: '305', transform: [1, 0, 0, 1, 40, 200.2] },
      ],
    ]);
    const result = await extractPdfText(new Uint8Array([0]));
    expect(result.pages[0]).toBe('編號 305');
  });

  it('restores x-order within a line when pdfjs emits items out of sequence', async () => {
    // pdfjs sometimes returns glyphs in creation order, not reading order.
    setMockPages([
      [
        { str: '305', transform: [1, 0, 0, 1, 40, 200] }, // x=40 but emitted first
        { str: '編', transform: [1, 0, 0, 1, 10, 200] },
        { str: '號', transform: [1, 0, 0, 1, 20, 200] },
      ],
    ]);
    const result = await extractPdfText(new Uint8Array([0]));
    expect(result.pages[0]).toBe('編號305');
  });

  it('flags a likely-scanned PDF when total chars per page is tiny', async () => {
    setMockPages([
      [{ str: '', transform: [1, 0, 0, 1, 0, 0] }],
      [{ str: '', transform: [1, 0, 0, 1, 0, 0] }],
    ]);
    const result = await extractPdfText(new Uint8Array([0]));
    expect(result.likelyScanned).toBe(true);
    expect(result.totalChars).toBe(0);
  });
});

describe('parsePdfTabular', () => {
  it('parses a tab-separated table with header + rows', async () => {
    setMockPages([
      [
        ...lineItems('name\tphone\taddress', 200),
        ...lineItems('王小明\t0912\t臺北市', 180),
        ...lineItems('陳大\t0223\t新北市', 160),
      ],
    ]);
    const result = await parsePdfTabular(new Uint8Array([0]));
    expect(result.columns).toEqual(['name', 'phone', 'address']);
    expect(result.rows).toEqual([
      { name: '王小明', phone: '0912', address: '臺北市' },
      { name: '陳大', phone: '0223', address: '新北市' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('falls back to multi-space split when no tabs are present', async () => {
    setMockPages([
      [
        ...lineItems('name    phone   address', 200),
        ...lineItems('王    0912   臺北', 180),
      ],
    ]);
    const result = await parsePdfTabular(new Uint8Array([0]));
    expect(result.columns).toEqual(['name', 'phone', 'address']);
    expect(result.rows[0]).toEqual({ name: '王', phone: '0912', address: '臺北' });
    expect(result.warnings).toEqual([]);
  });

  it('warns when a row has the wrong number of columns', async () => {
    setMockPages([
      [
        ...lineItems('name\tphone', 200),
        ...lineItems('王\t0912', 180),
        ...lineItems('陳\t0223\t新北市', 160), // extra column
      ],
    ]);
    const result = await parsePdfTabular(new Uint8Array([0]));
    expect(result.rows.length).toBe(1);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('第 3 行');
  });

  it('shortcuts to a scanned-PDF warning when text is empty', async () => {
    setMockPages([[{ str: '', transform: [1, 0, 0, 1, 0, 0] }]]);
    const result = await parsePdfTabular(new Uint8Array([0]));
    expect(result.likelyScanned).toBe(true);
    expect(result.warnings[0]).toContain('OCR');
    expect(result.rows).toEqual([]);
  });
});
