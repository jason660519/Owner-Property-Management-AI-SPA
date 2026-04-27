import {
  decideTranscriptTechnicalRoute,
  hasUsableTaiwanRegistryText,
  inferTranscriptInputFormat,
} from '../intake-router';

describe('transcript intake router', () => {
  it('detects common transcript file formats', () => {
    expect(inferTranscriptInputFormat('a.PDF', 'application/pdf')).toBe('pdf');
    expect(inferTranscriptInputFormat('scan.gif', 'image/gif')).toBe('image');
    expect(inferTranscriptInputFormat('payload.json', 'application/json')).toBe('json');
    expect(inferTranscriptInputFormat('notes.txt', 'text/plain')).toBe('text');
  });

  it('routes PDFs with usable Taiwanese registry text to local python parsing', () => {
    const text = [
      '建物標示部 建號 01234 登記日期 113年01月01日',
      '所有權部 登記次序 0001 權利範圍 1/1 所有權人 王大明',
      '他項權利部 無設定 地政事務所 謄本檢查號 ABC123',
    ].join('\n');

    const decision = decideTranscriptTechnicalRoute({
      fileName: 'building.pdf',
      mimeType: 'application/pdf',
      extractedText: text.repeat(3),
    });

    expect(decision.route).toBe('local_python_text');
    expect(decision.metrics.hasUsableTraditionalChineseText).toBe(true);
  });

  it('routes scanned or sparse PDFs to VLM visual parsing', () => {
    const decision = decideTranscriptTechnicalRoute({
      fileName: 'scan.pdf',
      mimeType: 'application/pdf',
      extractedText: 'page 1',
    });

    expect(decision.route).toBe('vlm_visual');
    expect(decision.metrics.hasUsableTraditionalChineseText).toBe(false);
  });

  it('routes images to VLM and JSON to structured normalization', () => {
    expect(decideTranscriptTechnicalRoute({ fileName: 'scan.jpg', mimeType: 'image/jpeg' }).route)
      .toBe('vlm_visual');
    expect(decideTranscriptTechnicalRoute({ fileName: 'parsed.json', mimeType: 'application/json' }).route)
      .toBe('structured_json');
  });

  it('routes owner title deed copies to VLM visual parsing', () => {
    const imageDecision = decideTranscriptTechnicalRoute({
      fileName: '屋主建物權狀影本.jpg',
      mimeType: 'image/jpeg',
      documentType: 'building_title',
    });
    expect(imageDecision.route).toBe('vlm_visual');
    expect(imageDecision.reasons.join(' ')).toContain('Title deed image');

    const pdfDecision = decideTranscriptTechnicalRoute({
      fileName: '土地權狀.pdf',
      mimeType: 'application/pdf',
      documentType: 'land_title',
      extractedText: '土地所有權狀 權狀字號 所有權人 地號 權利範圍 '.repeat(20),
    });
    expect(pdfDecision.route).toBe('vlm_visual');
  });

  it('requires both CJK volume and registry markers for usable local text', () => {
    expect(hasUsableTaiwanRegistryText('這是一段很長但沒有關鍵謄本標記的文字'.repeat(20))).toBe(false);
    expect(hasUsableTaiwanRegistryText('建物標示部 所有權部 地號 建號 權利範圍'.repeat(20))).toBe(true);
  });
});
