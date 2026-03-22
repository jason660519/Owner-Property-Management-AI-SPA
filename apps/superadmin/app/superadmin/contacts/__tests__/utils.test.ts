import {
  filterContactLeads,
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

  test('should filter leads by query, status, source type and inquiry type', () => {
    expect(
      filterContactLeads(
        [
          {
            id: 'lead-1',
            name: '王小明',
            email: 'first@example.com',
            phone: null,
            inquiryType: '法律諮詢',
            message: '我想詢問簽約支援流程。',
            status: 'new',
            createdAt: '2026-03-22T08:30:00.000Z',
            sourcePath: '/properties/sale-2',
            sourceContext: {
              propertyId: 'sale-2',
              propertyTitle: '台北大安整合案件',
            },
            leadReference: 'LEAD-11111111',
          },
          {
            id: 'lead-2',
            name: 'Amy Broker',
            email: 'amy@example.com',
            phone: null,
            inquiryType: '合作方案',
            message: '我想了解企業合作。',
            status: 'replied',
            createdAt: '2026-03-22T09:00:00.000Z',
            sourcePath: '/pricing',
            sourceContext: {
              entryPoint: 'pricing-cta',
            },
            leadReference: 'LEAD-22222222',
          },
        ],
        {
          query: 'amy',
          status: 'replied',
          sourceType: 'marketing',
          inquiryType: '合作方案',
        },
      ).map((lead) => lead.id),
    ).toEqual(['lead-2']);
  });
});