import {
  classifyHttpStatus,
  formatPaperclipErrorLine,
  formatPaperclipErrorWithHint,
  recoveryHintForKind,
} from '../api-error-meta';

describe('classifyHttpStatus', () => {
  it('classifies status codes', () => {
    expect(classifyHttpStatus(0)).toBe('network');
    expect(classifyHttpStatus(401)).toBe('auth');
    expect(classifyHttpStatus(422)).toBe('validation');
    expect(classifyHttpStatus(502)).toBe('server');
    expect(classifyHttpStatus(304)).toBe('unknown');
  });
});

describe('formatPaperclipErrorLine', () => {
  it('prefixes message with kind label', () => {
    expect(formatPaperclipErrorLine({ httpStatus: 0, message: 'ECONNREFUSED' })).toContain('網路');
    expect(formatPaperclipErrorLine({ httpStatus: 422, message: 'bad' })).toContain('請求內容');
  });
});

describe('formatPaperclipErrorWithHint', () => {
  it('appends recovery hint', () => {
    const s = formatPaperclipErrorWithHint({ httpStatus: 0, message: 'down' });
    expect(s).toContain('建議：');
    expect(s).toContain('down');
  });
});

describe('recoveryHintForKind', () => {
  it('returns non-empty hints', () => {
    expect(recoveryHintForKind('server').length).toBeGreaterThan(10);
  });
});
