import {
  buildTranscriptPageClassifications,
  classifyTranscriptPage,
  splitPdfTextPages,
} from '../intake-page-classifier';

describe('transcript intake page classifier', () => {
  it('splits mixed PDFs into reference-only and authoritative pages', () => {
    const text = [
      '不動產說明書 委託銷售標的 建物坪數 32.5 土地坪數 8.2',
      '建物登記第二類謄本 建物標示部 建號 01234 坐落門牌 台北市 所有權部 權利範圍 全部 謄本檢查號 地政事務所',
      '物件調查報告書 現況調查 水電瓦斯 管理費',
    ].join('\f');

    const pages = buildTranscriptPageClassifications({
      inputFormat: 'pdf',
      documentType: 'registry_transcript_unclassified',
      extractedText: text,
      pdfPageCount: 3,
    });

    expect(pages).toEqual([
      expect.objectContaining({
        pageNumber: 1,
        pageRole: 'property_description',
        sourceTrust: 'reference_only',
      }),
      expect.objectContaining({
        pageNumber: 2,
        pageRole: 'building_transcript',
        sourceTrust: 'authoritative',
      }),
      expect.objectContaining({
        pageNumber: 3,
        pageRole: 'investigation_report',
        sourceTrust: 'reference_only',
      }),
    ]);
  });

  it('creates visual placeholders when a scanned PDF has no text layer', () => {
    const pages = buildTranscriptPageClassifications({
      inputFormat: 'pdf',
      documentType: 'building_registry_transcript',
      extractedText: '',
      pdfPageCount: 2,
    });

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({
      pageNumber: 1,
      pageRole: 'building_transcript',
      sourceTrust: 'authoritative',
      orientation: 'unknown',
      rotationHint: null,
    });
  });

  it('keeps title-deed image placeholders authoritative when the upload type is known', () => {
    const pages = buildTranscriptPageClassifications({
      inputFormat: 'image',
      documentType: 'land_title',
    });

    expect(pages).toEqual([
      expect.objectContaining({
        pageNumber: 1,
        pageRole: 'land_title',
        sourceTrust: 'authoritative',
      }),
    ]);
  });

  it('marks long horizontal text as landscape with a rotation hint', () => {
    const page = classifyTranscriptPage({
      pageNumber: 1,
      text: `建物登記第二類謄本 建物標示部 建號 01234 所有權部 ${'橫向文字'.repeat(20)}`,
    });

    expect(page.orientation).toBe('landscape');
    expect(page.rotationHint).toBe(90);
  });

  it('splits PDF text by form-feed page separators', () => {
    expect(splitPdfTextPages('page 1\fpage 2\f')).toEqual(['page 1', 'page 2']);
  });
});
