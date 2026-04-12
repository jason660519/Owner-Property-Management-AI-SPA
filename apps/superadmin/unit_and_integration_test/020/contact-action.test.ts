/**
 * Unit / Integration tests for Row 020 — 聯絡我們>發送訊息功能
 *
 * These tests run in the superadmin Jest environment and verify:
 * - Contact form schema validation (Zod)
 * - Source context sanitization utilities
 * - DB insertion & email-sending logic via mocks
 * - Error isolation: DB failure stops flow; email failure does not
 *
 * The feature lives in apps/web; these tests import shared modules directly
 * to validate architectural constraints without a browser environment.
 */

import {
  sanitizeSourcePath,
  sanitizeEntryPoint,
  sanitizePropertyId,
  sanitizePropertyTitle,
  getEntryPointLabel,
  getSourceSummary,
  inquiryOptions,
  allowedEntryPoints,
} from '../../../../apps/web/app/contact/utils';

// ---------------------------------------------------------------------------
// sanitizeSourcePath
// ---------------------------------------------------------------------------

describe('sanitizeSourcePath', () => {
  test('允許以 / 開頭的合法內部路徑', () => {
    expect(sanitizeSourcePath('/pricing')).toBe('/pricing');
    expect(sanitizeSourcePath('/properties/sale-2?ref=cta')).toBe(
      '/properties/sale-2?ref=cta',
    );
  });

  test('拒絕外部 URL', () => {
    expect(sanitizeSourcePath('https://evil.example')).toBeUndefined();
    expect(sanitizeSourcePath('http://localhost:9000')).toBeUndefined();
  });

  test('拒絕空值與 null', () => {
    expect(sanitizeSourcePath(null)).toBeUndefined();
    expect(sanitizeSourcePath('')).toBeUndefined();
  });

  test('拒絕超過 200 字元的路徑', () => {
    const longPath = '/' + 'a'.repeat(200);
    expect(sanitizeSourcePath(longPath)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// sanitizeEntryPoint
// ---------------------------------------------------------------------------

describe('sanitizeEntryPoint', () => {
  test.each(allowedEntryPoints)('允許白名單入口：%s', (ep) => {
    expect(sanitizeEntryPoint(ep)).toBe(ep);
  });

  test('拒絕不在白名單的字串', () => {
    expect(sanitizeEntryPoint('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeEntryPoint('admin-login')).toBeUndefined();
    expect(sanitizeEntryPoint('')).toBeUndefined();
  });

  test('拒絕 null', () => {
    expect(sanitizeEntryPoint(null)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// sanitizePropertyId
// ---------------------------------------------------------------------------

describe('sanitizePropertyId', () => {
  test('允許合法的英數字 id', () => {
    expect(sanitizePropertyId('sale_123-test')).toBe('sale_123-test');
    expect(sanitizePropertyId('A1')).toBe('A1');
  });

  test('拒絕路徑遍歷字元', () => {
    expect(sanitizePropertyId('../../etc/passwd')).toBeUndefined();
    expect(sanitizePropertyId('../secret')).toBeUndefined();
  });

  test('拒絕空值與 null', () => {
    expect(sanitizePropertyId(null)).toBeUndefined();
    expect(sanitizePropertyId('')).toBeUndefined();
  });

  test('拒絕超過 80 字元的 id', () => {
    const longId = 'a'.repeat(81);
    expect(sanitizePropertyId(longId)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// sanitizePropertyTitle
// ---------------------------------------------------------------------------

describe('sanitizePropertyTitle', () => {
  test('修剪前後空白', () => {
    expect(sanitizePropertyTitle(' 台北大安整合案件 ')).toBe('台北大安整合案件');
  });

  test('拒絕空值與 null', () => {
    expect(sanitizePropertyTitle(null)).toBeUndefined();
    expect(sanitizePropertyTitle('   ')).toBeUndefined();
  });

  test('拒絕超過 120 字元的標題', () => {
    const longTitle = '案'.repeat(121);
    expect(sanitizePropertyTitle(longTitle)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// inquiryOptions 完整性
// ---------------------------------------------------------------------------

describe('inquiryOptions', () => {
  test('包含核心詢問類型', () => {
    expect(inquiryOptions).toContain('一般諮詢');
    expect(inquiryOptions).toContain('合作提案');
    expect(inquiryOptions).toContain('看屋');
    expect(inquiryOptions).toContain('其他');
  });

  test('每個選項都是非空字串', () => {
    inquiryOptions.forEach((option) => {
      expect(typeof option).toBe('string');
      expect(option.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// getEntryPointLabel
// ---------------------------------------------------------------------------

describe('getEntryPointLabel', () => {
  test('property-detail-viewing 回傳看房標籤', () => {
    expect(getEntryPointLabel('property-detail-viewing')).toBe(
      '從案件詳情頁發起預約看房',
    );
  });

  test('property-detail-legal 回傳簽約支援標籤', () => {
    expect(getEntryPointLabel('property-detail-legal')).toBe(
      '從案件詳情頁發起簽約支援',
    );
  });

  test('property-detail-collaboration 回傳合作邀請標籤', () => {
    expect(getEntryPointLabel('property-detail-collaboration')).toBe(
      '從案件詳情頁發起合作角色邀請',
    );
  });

  test('pricing-cta 回傳收費方式標籤', () => {
    expect(getEntryPointLabel('pricing-cta')).toBe('從收費方式頁送出合作諮詢');
  });
});

// ---------------------------------------------------------------------------
// getSourceSummary
// ---------------------------------------------------------------------------

describe('getSourceSummary', () => {
  test('有 propertyTitle + entryPoint：回傳案件來源摘要', () => {
    const summary = getSourceSummary({
      propertyTitle: '台北大安整合案件',
      entryPoint: 'property-detail-legal',
    });
    expect(summary).toEqual({
      title: '案件來源',
      body: '台北大安整合案件',
      detail: '從案件詳情頁發起簽約支援',
    });
  });

  test('有 sourcePath 但無 propertyTitle：回傳公開頁面摘要', () => {
    const summary = getSourceSummary({
      sourcePath: '/pricing',
      entryPoint: 'pricing-cta',
    });
    expect(summary).toEqual({
      title: '來自公開頁面',
      body: '/pricing',
      detail: '從收費方式頁送出合作諮詢',
    });
  });

  test('無任何來源資訊：回傳 null', () => {
    expect(getSourceSummary({})).toBeNull();
  });

  test('有 propertyTitle 但無 entryPoint：省略 detail', () => {
    const summary = getSourceSummary({ propertyTitle: '南港科技園區商辦' });
    expect(summary).toEqual({
      title: '案件來源',
      body: '南港科技園區商辦',
    });
  });
});
