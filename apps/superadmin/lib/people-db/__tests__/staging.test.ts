// Row 145 Sprint 4a Phase 1 — staging helpers unit tests.

import { parsedRowsToStaging, ocrPagesToStaging } from '../staging';

describe('parsedRowsToStaging', () => {
  it('assigns 0-based record_index per row', () => {
    const rows = [{ a: '1' }, { a: '2' }, { a: '3' }];
    const staging = parsedRowsToStaging('file-uuid', rows);
    expect(staging).toEqual([
      { file_id: 'file-uuid', record_index: 0, raw: { a: '1' } },
      { file_id: 'file-uuid', record_index: 1, raw: { a: '2' } },
      { file_id: 'file-uuid', record_index: 2, raw: { a: '3' } },
    ]);
  });

  it('returns empty array for empty rows', () => {
    expect(parsedRowsToStaging('file-uuid', [])).toEqual([]);
  });
});

describe('ocrPagesToStaging', () => {
  it('maps pageNumber (1-based) to record_index (0-based) and wraps in raw.page_text', () => {
    const pages = [
      { pageNumber: 1, text: '闕貴卿 南港路' },
      { pageNumber: 2, text: '詹坤隆 中南街' },
    ];
    const staging = ocrPagesToStaging('file-uuid', pages);
    expect(staging).toEqual([
      {
        file_id: 'file-uuid',
        record_index: 0,
        raw: { page_text: '闕貴卿 南港路', page_number: 1 },
      },
      {
        file_id: 'file-uuid',
        record_index: 1,
        raw: { page_text: '詹坤隆 中南街', page_number: 2 },
      },
    ]);
  });

  it('handles missing pages input (empty array)', () => {
    expect(ocrPagesToStaging('file-uuid', [])).toEqual([]);
  });
});
