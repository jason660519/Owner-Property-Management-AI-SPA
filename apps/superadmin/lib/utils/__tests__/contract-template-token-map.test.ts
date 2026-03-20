import { buildContractTemplateTokenMap } from '../contract-template-token-map';
import type { ContractDraft } from '@/lib/types/contracts';

function createLeaseDraft(): ContractDraft {
  return {
    contractType: 'lease',
    draftStatus: 'draft',
    templateCode: 'tw-lease-template',
    templateVersion: '1.0.0',
    contractDate: '2026-03-20',
    propertyId: 'property-lease-1',
    propertyAddress: '臺北市大安區仁愛路四段295號3樓',
    ownerName: '王大明',
    buildingTranscriptAttached: true,
    landTranscriptAttached: false,
    attachments: [
      {
        attachmentId: 'attach-1',
        attachmentType: 'building_transcript',
        fileName: 'building-transcript.pdf',
        storagePath: 'contracts/property-lease-1/building-transcript.pdf',
        isRequired: true,
        isAttached: true,
      },
    ],
    tenantName: '林小美',
    leaseStartDate: '2026-04-01',
    leaseEndDate: '2027-03-31',
    monthlyRent: 32000,
    depositAmount: 64000,
    contractCopiesCount: 3,
    holdoverPenaltyMultiple: 1.5,
    paymentDueDay: 5,
    usePurpose: 'office',
    specialTerms: '承租人不得飼養寵物。',
    includedItems: ['冷氣', '冰箱'],
    transcriptAttachmentNote: '本契約附建物或土地謄本副本至少一份，供雙方核對標的資訊。',
  };
}

function createSaleDraft(): ContractDraft {
  return {
    contractType: 'sale',
    draftStatus: 'draft',
    templateCode: 'tw-sale-template',
    templateVersion: '1.0.0',
    contractDate: '2026-03-20',
    propertyId: 'property-sale-1',
    propertyAddress: '臺北市信義區松仁路100號15樓',
    ownerName: '陳賣方',
    buildingTranscriptAttached: true,
    landTranscriptAttached: true,
    attachments: [
      {
        attachmentId: 'attach-building',
        attachmentType: 'building_transcript',
        fileName: 'building-copy.pdf',
        storagePath: 'contracts/property-sale-1/building-copy.pdf',
        isRequired: true,
        isAttached: true,
      },
      {
        attachmentId: 'attach-land',
        attachmentType: 'land_transcript',
        fileName: 'land-copy.pdf',
        storagePath: 'contracts/property-sale-1/land-copy.pdf',
        isRequired: true,
        isAttached: true,
      },
    ],
    sellerName: '陳賣方',
    buyerName: '黃買方',
    agentName: '王經紀',
    brokerName: '安心房屋仲介股份有限公司',
    scrivenerName: '林代書',
    buildingNumber: '123建號',
    landNumbers: ['仁愛段100地號', '仁愛段101地號'],
    transcriptSections: {
      buildingDescription: { title: '建物標示部', content: '建號 123，建物面積 30 坪。', transcriptType: 'building' },
      buildingOwnership: { title: '建物所有權部', content: '所有權人陳賣方，持分全部。', transcriptType: 'building' },
      landDescription: { title: '土地標示部', content: '地號 100，使用分區住三。', transcriptType: 'land' },
      landOwnership: { title: '土地所有權部', content: '所有權人陳賣方，持分全部。', transcriptType: 'land' },
    },
    salePriceTotal: 25800000,
    landPrice: 16000000,
    buildingPrice: 8200000,
    parkingLandPrice: 600000,
    parkingBuildingPrice: 1000000,
    paymentSchedule: [
      { label: '簽約款', amount: 1000000, dueDate: '2026-04-01' },
      { label: '尾款', amount: 24800000, dueDate: '2026-06-30' },
    ],
    handoverDate: '2026-06-30',
    ownershipTransferDate: '2026-06-20',
    taxAllocation: '土地增值稅由賣方負擔。',
    escrowMethod: '價金履約保證專戶辦理。',
    occupiedByOthersCondition: '目前由前屋主持續占用，點交前完成遷離。',
    encroachmentCondition: '無占用他人土地情形。',
    leaseBorrowCondition: '現有租客已同意於交屋日前終止租約。',
    copyRetentionHolder: '永慶代書事務所',
    defaultClauseSummary: '若有未盡事宜，雙方同意另以書面特約補充。',
    riskNotes: '有抵押設定，請人工確認清償流程。',
    transcriptAttachmentNote: '本契約附建物謄本及土地謄本副本各一份。',
  };
}

describe('contract-template-token-map', () => {
  it('builds lease placeholder values from mapped source paths', () => {
    const tokenMap = buildContractTemplateTokenMap(createLeaseDraft());

    expect(tokenMap['{{propertyAddress}}']).toBe('臺北市大安區仁愛路四段295號3樓');
    expect(tokenMap['{{tenantName}}']).toBe('林小美');
    expect(tokenMap['{{monthlyRent}}']).toBe('$32,000');
    expect(tokenMap['{{contractCopiesCount}}']).toBe('3');
    expect(tokenMap['{{holdoverPenaltyMultiple}}']).toBe('1.5');
    expect(tokenMap['{{usePurpose}}']).toBe('辦公');
    expect(tokenMap['{{usePurposeLine}}']).toBe('本房屋係供 辦公 之使用。');
    expect(tokenMap['{{specialTerms}}']).toBe('承租人不得飼養寵物。');
    expect(tokenMap['{{specialTermsLine}}']).toBe('其他特約：承租人不得飼養寵物。');
    expect(tokenMap['{{includedItems}}']).toBe('冷氣、冰箱');
    expect(tokenMap['{{templateDisplayTitle}}']).toBe('房屋租賃契約書草稿');
    expect(tokenMap['{{templateReviewPeriodDays}}']).toBe('3');
  });

  it('builds sale placeholder values for arrays and complex sections', () => {
    const tokenMap = buildContractTemplateTokenMap(createSaleDraft());

    expect(tokenMap['{{sellerName}}']).toBe('陳賣方');
    expect(tokenMap['{{brokerName}}']).toBe('安心房屋仲介股份有限公司');
    expect(tokenMap['{{agentName}}']).toBe('王經紀');
    expect(tokenMap['{{scrivenerName}}']).toBe('林代書');
    expect(tokenMap['{{escrowMethod}}']).toBe('價金履約保證專戶辦理。');
    expect(tokenMap['{{occupiedByOthersCondition}}']).toBe('目前由前屋主持續占用，點交前完成遷離。');
    expect(tokenMap['{{encroachmentCondition}}']).toBe('無占用他人土地情形。');
    expect(tokenMap['{{leaseBorrowCondition}}']).toBe('現有租客已同意於交屋日前終止租約。');
    expect(tokenMap['{{copyRetentionHolder}}']).toBe('永慶代書事務所');
    expect(tokenMap['{{defaultClauseSummary}}']).toBe('若有未盡事宜，雙方同意另以書面特約補充。');
    expect(tokenMap['{{salePriceTotal}}']).toBe('$25,800,000');
    expect(tokenMap['{{landPrice}}']).toBe('$16,000,000');
    expect(tokenMap['{{buildingPrice}}']).toBe('$8,200,000');
    expect(tokenMap['{{parkingLandPrice}}']).toBe('$600,000');
    expect(tokenMap['{{parkingBuildingPrice}}']).toBe('$1,000,000');
    expect(tokenMap['{{salePriceBreakdownLines}}']).toContain('土地價款：$16,000,000');
    expect(tokenMap['{{landNumbers}}']).toBe('仁愛段100地號、仁愛段101地號');
    expect(tokenMap['{{paymentSchedule}}']).toContain('簽約款');
    expect(tokenMap['{{paymentSchedule}}']).toContain('$1,000,000');
    expect(tokenMap['{{transcriptSections}}']).toContain('建物標示部');
    expect(tokenMap['{{templateSourceDocumentName}}']).toBe('成屋買賣契約書範本.doc');
  });
});