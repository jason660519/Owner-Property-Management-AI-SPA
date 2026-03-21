import {
  formatLeadEntryPoint,
  formatLeadPropertyContext,
  formatLeadSourceSummary,
} from '@/app/superadmin/contacts/utils';

describe('contacts utils', () => {
  test('should map entry points to readable labels', () => {
    expect(formatLeadEntryPoint('pricing-cta')).toBe('從收費方式頁送出合作諮詢');
    expect(formatLeadEntryPoint('property-detail-legal')).toBe(
      '從案件詳情頁發起簽約支援',
    );
  });

  test('should build readable property context', () => {
    expect(
      formatLeadPropertyContext({
        propertyTitle: '台北大安整合案件',
        propertyId: 'sale-2',
      }),
    ).toBe('台北大安整合案件（sale-2）');
  });

  test('should summarize source path, entry point and property info', () => {
    expect(
      formatLeadSourceSummary({
        sourcePath: '/properties/sale-2',
        sourceContext: {
          entryPoint: 'property-detail-viewing',
          propertyId: 'sale-2',
          propertyTitle: '台北大安整合案件',
        },
      }),
    ).toEqual({
      sourceLabel: '案件詳情頁',
      actionLabel: '從案件詳情頁發起預約看房',
      propertyLabel: '台北大安整合案件（sale-2）',
    });
  });
});