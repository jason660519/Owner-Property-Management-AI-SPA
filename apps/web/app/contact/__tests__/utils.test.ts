import {
  getEntryPointLabel,
  getSourceSummary,
  sanitizeEntryPoint,
  sanitizePropertyId,
  sanitizePropertyTitle,
  sanitizeSourcePath,
} from '@/app/contact/utils';

describe('contact utils', () => {
  test('should keep only internal source paths', () => {
    expect(sanitizeSourcePath('/pricing')).toBe('/pricing');
    expect(sanitizeSourcePath('https://evil.example')).toBeUndefined();
  });

  test('should allow only whitelisted entry points', () => {
    expect(sanitizeEntryPoint('property-detail-viewing')).toBe(
      'property-detail-viewing',
    );
    expect(sanitizeEntryPoint('javascript:alert(1)')).toBeUndefined();
  });

  test('should sanitize property metadata safely', () => {
    expect(sanitizePropertyId('sale_123-test')).toBe('sale_123-test');
    expect(sanitizePropertyId('../../etc/passwd')).toBeUndefined();
    expect(sanitizePropertyTitle(' 台北大安整合案件 ')).toBe('台北大安整合案件');
  });

  test('should map property detail entry points to readable labels', () => {
    expect(getEntryPointLabel('property-detail-viewing')).toBe(
      '從案件詳情頁發起預約看房',
    );
    expect(getEntryPointLabel('property-detail-legal')).toBe(
      '從案件詳情頁發起簽約支援',
    );
    expect(getEntryPointLabel('property-detail-collaboration')).toBe(
      '從案件詳情頁發起合作角色邀請',
    );
  });

  test('should build a readable property source summary', () => {
    expect(
      getSourceSummary({
        propertyTitle: '台北大安整合案件',
        entryPoint: 'property-detail-legal',
      }),
    ).toEqual({
      title: '案件來源',
      body: '台北大安整合案件',
      detail: '從案件詳情頁發起簽約支援',
    });
  });
});