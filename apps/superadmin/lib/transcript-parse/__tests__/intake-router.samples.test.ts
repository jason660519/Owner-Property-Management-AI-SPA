import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

import { decideTranscriptTechnicalRoute } from '../intake-router';

const repoRoot = path.resolve(__dirname, '../../../../..');
const sampleDir = path.join(repoRoot, 'resources/samples/謄本PDF範例');

const textLayerTranscript = path.join(
  sampleDir,
  '102AF007093REG06A0E317AAE954CB9A45452DF3F5CBB1C.pdf',
);
const scannedTitleCopy = path.join(
  sampleDir,
  '各類謄本權狀案例/建物+土地權狀影本範例1.PDF',
);
const nonTranscriptPdf = path.join(sampleDir, '沈堯坤結案明細20090817.pdf');

function pdftotext(filePath: string): { text: string; likelyScanned: boolean } {
  const text = execFileSync('pdftotext', ['-layout', filePath, '-'], {
    maxBuffer: 20 * 1024 * 1024,
  }).toString('utf8');
  return { text, likelyScanned: text.trim().length === 0 };
}

const canRunPdftotext = (() => {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const describeIfSamplesExist = canRunPdftotext &&
  existsSync(textLayerTranscript) &&
  existsSync(scannedTitleCopy) &&
  existsSync(nonTranscriptPdf)
  ? describe
  : describe.skip;

describeIfSamplesExist('transcript intake router with local PDF samples', () => {
  it('routes a text-layer building transcript PDF to local Python parsing', async () => {
    expect(readFileSync(textLayerTranscript).byteLength).toBeGreaterThan(0);
    const probe = pdftotext(textLayerTranscript);
    const decision = decideTranscriptTechnicalRoute({
      fileName: path.basename(textLayerTranscript),
      mimeType: 'application/pdf',
      extractedText: probe.text,
    });

    expect(probe.text.length).toBeGreaterThan(1000);
    expect(decision.route).toBe('local_python_text');
    expect(decision.metrics.registryMarkerCount).toBeGreaterThanOrEqual(2);
  });

  it('routes an image-only title copy PDF to VLM', async () => {
    expect(readFileSync(scannedTitleCopy).byteLength).toBeGreaterThan(0);
    const probe = pdftotext(scannedTitleCopy);
    const decision = decideTranscriptTechnicalRoute({
      fileName: path.basename(scannedTitleCopy),
      mimeType: 'application/pdf',
      extractedText: probe.text,
    });

    expect(probe.likelyScanned).toBe(true);
    expect(decision.route).toBe('vlm_visual');
  });

  it('does not route a readable non-transcript settlement PDF to local transcript parsing', async () => {
    expect(readFileSync(nonTranscriptPdf).byteLength).toBeGreaterThan(0);
    const probe = pdftotext(nonTranscriptPdf);
    const decision = decideTranscriptTechnicalRoute({
      fileName: path.basename(nonTranscriptPdf),
      mimeType: 'application/pdf',
      extractedText: probe.text,
    });

    expect(probe.text.length).toBeGreaterThan(1000);
    expect(decision.route).toBe('vlm_visual');
    expect(decision.metrics.registryMarkerCount).toBeLessThan(2);
  });
});
