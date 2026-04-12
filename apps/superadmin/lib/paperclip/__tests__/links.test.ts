import {
  buildPaperclipIssueSearchUrl,
  buildPaperclipIssueUrl,
  normalizePaperclipBaseUrl,
} from '../links';

describe('paperclip links', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizePaperclipBaseUrl('http://localhost:3187///')).toBe('http://localhost:3187');
  });

  it('builds issue URL with default company slug', () => {
    expect(buildPaperclipIssueUrl('http://localhost:3187', 'VIS-42')).toBe(
      'http://localhost:3187/VIS/issues/VIS-42',
    );
  });

  it('encodes issue references', () => {
    expect(buildPaperclipIssueUrl('http://localhost:3187', 'abc/uuid')).toBe(
      'http://localhost:3187/VIS/issues/abc%2Fuuid',
    );
  });

  it('builds search URL and encodes query', () => {
    expect(
      buildPaperclipIssueSearchUrl(
        'http://localhost:3187/',
        'feature/paperclip-row-001',
      ),
    ).toBe(
      'http://localhost:3187/VIS/issues?search=feature%2Fpaperclip-row-001',
    );
  });
});
