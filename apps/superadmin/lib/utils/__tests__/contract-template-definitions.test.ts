import {
  getContractTemplateDefinition,
  listContractTemplateDefinitions,
} from '../contract-template-definitions';

describe('contract-template-definitions', () => {
  it('provides lease template metadata and official section order', () => {
    const definition = getContractTemplateDefinition('lease');
    const sectionMap = new Map(definition.sectionDefinitions.map((section) => [section.title, section.mappedFieldKeys]));

    expect(definition.sourceDocumentName).toBe('房屋租賃契約書範本.doc');
    expect(definition.reviewPeriodDays).toBe(3);
    expect(definition.sectionDefinitions.map((section) => section.title)).toEqual(expect.arrayContaining([
      '契約審閱權',
      '第一條 房屋標示及租賃範圍',
      '第四條 租金約定及支付',
      '第二十四條 契約分存',
    ]));
    expect(definition.fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'propertyAddress', placeholder: '{{propertyAddress}}', sourcePath: 'propertyAddress' }),
      expect.objectContaining({ key: 'tenantName', placeholder: '{{tenantName}}', sourcePath: 'tenantName' }),
      expect.objectContaining({ key: 'depositAmount', placeholder: '{{depositAmount}}', sourcePath: 'depositAmount' }),
    ]));
    expect(sectionMap.get('第九條 使用房屋之限制')).toEqual(['usePurpose']);
    expect(sectionMap.get('第十六條 其他約定')).toEqual(['specialTerms', 'encumbranceSummary', 'transcriptAttachmentNote']);
    expect(sectionMap.has('第七條 租賃期間相關費用之支付')).toBe(false);
    expect(sectionMap.has('第八條 稅費負擔')).toBe(false);
  });

  it('provides sale template metadata and official field mappings', () => {
    const definition = getContractTemplateDefinition('sale');

    expect(definition.sourceDocumentName).toBe('成屋買賣契約書範本.doc');
    expect(definition.reviewPeriodDays).toBe(5);
    expect(definition.sectionDefinitions.map((section) => section.title)).toEqual(expect.arrayContaining([
      '契約審閱權',
      '第一條 買賣標的',
      '第三條 付款約定',
      '第八條 點交',
    ]));
    expect(definition.fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'sellerName', placeholder: '{{sellerName}}', sourcePath: 'sellerName' }),
      expect.objectContaining({ key: 'buyerName', placeholder: '{{buyerName}}', sourcePath: 'buyerName' }),
      expect.objectContaining({ key: 'salePriceTotal', placeholder: '{{salePriceTotal}}', sourcePath: 'salePriceTotal' }),
      expect.objectContaining({ key: 'paymentSchedule', placeholder: '{{paymentSchedule}}', sourcePath: 'paymentSchedule' }),
    ]));
  });

  it('lists both supported contract templates', () => {
    const definitions = listContractTemplateDefinitions();

    expect(definitions).toHaveLength(2);
    expect(definitions.map((item) => item.contractType).sort()).toEqual(['lease', 'sale']);
  });
});