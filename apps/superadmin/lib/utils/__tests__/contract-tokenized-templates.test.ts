import {
  applyContractTemplateTokens,
  getContractTokenizedTemplate,
} from '../contract-tokenized-templates';

describe('contract-tokenized-templates', () => {
  it('provides lease template placeholders', () => {
    const template = getContractTokenizedTemplate('lease');

    expect(template).toContain('{{templateDisplayTitle}}');
    expect(template).toContain('{{propertyAddress}}');
    expect(template).toContain('{{tenantName}}');
    expect(template).toContain('{{holdoverPenaltyMultiple}}');
    expect(template).toContain('{{contractCopiesCount}}');
    expect(template).toContain('{{usePurposeLine}}');
    expect(template).toContain('{{specialTermsLine}}');
    expect(template).toContain('{{attachmentsRows}}');
    expect(template).toContain('第九條 使用房屋之限制');
    expect(template).toContain('第十四條 租賃物之返還');
    expect(template).toContain('第十六條 其他約定');
    expect(template).toContain('第二十四條 契約分存');
    expect(template).toContain('第二十六條 範本之使用');
  });

  it('provides sale template placeholders', () => {
    const template = getContractTokenizedTemplate('sale');

    expect(template).toContain('{{templateDisplayTitle}}');
    expect(template).toContain('{{salePriceTotal}}');
    expect(template).toContain('{{scrivenerName}}');
    expect(template).toContain('{{escrowMethod}}');
    expect(template).toContain('{{defaultClauseSummary}}');
    expect(template).toContain('{{occupiedByOthersCondition}}');
    expect(template).toContain('{{encroachmentCondition}}');
    expect(template).toContain('{{leaseBorrowCondition}}');
    expect(template).toContain('{{copyRetentionHolder}}');
    expect(template).toContain('{{paymentScheduleRows}}');
    expect(template).toContain('{{transcriptSectionCards}}');
    expect(template).toContain('第十條　違約罰則');
    expect(template).toContain('第十二條　契約分存');
  });

  it('replaces placeholders with mapped values', () => {
    const rendered = applyContractTemplateTokens(
      '<h1>{{templateDisplayTitle}}</h1><p>{{tenantName}}</p><table>{{attachmentsRows}}</table>',
      {
        '{{templateDisplayTitle}}': '房屋租賃契約書草稿',
        '{{tenantName}}': '林小美',
        '{{attachmentsRows}}': '<tr><td>建物謄本</td></tr>',
      },
    );

    expect(rendered).toContain('房屋租賃契約書草稿');
    expect(rendered).toContain('林小美');
    expect(rendered).toContain('<tr><td>建物謄本</td></tr>');
    expect(rendered).not.toContain('{{tenantName}}');
  });
});