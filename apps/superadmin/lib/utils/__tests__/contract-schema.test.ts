import {
  ContractDraftSchema,
  LeaseContractDraftSchema,
  SaleContractDraftSchema,
} from '@/lib/types/contracts';

describe('LeaseContractDraftSchema', () => {
  it('accepts a minimal lease draft with at least one transcript attachment', () => {
    const result = LeaseContractDraftSchema.safeParse({
      contractType: 'lease',
      draftStatus: 'draft',
      templateCode: 'lease_v1',
      templateVersion: '2026-03-20',
      propertyId: 'property-001',
      propertyAddress: '臺北市大安區仁愛路四段295號',
      ownerName: '王大明',
      tenantName: '林小美',
      buildingTranscriptAttached: true,
      landTranscriptAttached: false,
      attachments: [
        {
          attachmentId: 'att-building-1',
          attachmentType: 'building_transcript',
          fileName: 'building-transcript.pdf',
          storagePath: 'contracts/property-001/building-transcript.pdf',
          isRequired: true,
          isAttached: true,
        },
      ],
      leaseStartDate: '2026-04-01',
      leaseEndDate: '2027-03-31',
      monthlyRent: 32000,
      depositAmount: 64000,
      contractCopiesCount: 2,
      holdoverPenaltyMultiple: 2,
      specialTerms: '承租人不得飼養寵物。',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a lease draft without any attached transcript copy', () => {
    const result = LeaseContractDraftSchema.safeParse({
      contractType: 'lease',
      draftStatus: 'draft',
      templateCode: 'lease_v1',
      templateVersion: '2026-03-20',
      propertyId: 'property-001',
      propertyAddress: '臺北市大安區仁愛路四段295號',
      ownerName: '王大明',
      tenantName: '林小美',
      buildingTranscriptAttached: false,
      landTranscriptAttached: false,
      attachments: [],
      leaseStartDate: '2026-04-01',
      leaseEndDate: '2027-03-31',
      monthlyRent: 32000,
      depositAmount: 64000,
    });

    expect(result.success).toBe(false);
  });
});

describe('SaleContractDraftSchema', () => {
  it('accepts a sale draft with transcript sections, attachments, and transaction terms', () => {
    const result = SaleContractDraftSchema.safeParse({
      contractType: 'sale',
      draftStatus: 'reviewing',
      templateCode: 'sale_v1',
      templateVersion: '2026-03-20',
      propertyId: 'property-002',
      propertyAddress: '臺北市信義區松仁路100號',
      ownerName: '陳屋主',
      buildingTranscriptAttached: true,
      landTranscriptAttached: true,
      attachments: [
        {
          attachmentId: 'att-building-2',
          attachmentType: 'building_transcript',
          fileName: 'building-copy.pdf',
          storagePath: 'contracts/property-002/building-copy.pdf',
          isRequired: true,
          isAttached: true,
        },
        {
          attachmentId: 'att-land-2',
          attachmentType: 'land_transcript',
          fileName: 'land-copy.pdf',
          storagePath: 'contracts/property-002/land-copy.pdf',
          isRequired: true,
          isAttached: true,
        },
      ],
      sellerName: '陳屋主',
      buyerName: '黃買方',
      landNumbers: ['信義段一小段100地號'],
      transcriptSections: {
        buildingDescription: {
          title: '建物標示部',
          content: '建號 123，主要用途住宅用，面積 30 坪。',
          transcriptType: 'building',
        },
        buildingOwnership: {
          title: '建物所有權部',
          content: '所有權人陳屋主，權利範圍全部。',
          transcriptType: 'building',
        },
        landDescription: {
          title: '土地標示部',
          content: '地號 100，使用分區住三。',
          transcriptType: 'land',
        },
        landOwnership: {
          title: '土地所有權部',
          content: '所有權人陳屋主，持分全部。',
          transcriptType: 'land',
        },
      },
      salePriceTotal: 25800000,
      landPrice: 16000000,
      buildingPrice: 8200000,
      parkingLandPrice: 600000,
      parkingBuildingPrice: 1000000,
      paymentSchedule: [
        {
          label: '簽約款',
          amount: 1000000,
          dueDate: '2026-04-01',
        },
        {
          label: '尾款',
          amount: 24800000,
          dueDate: '2026-05-20',
        },
      ],
      handoverDate: '2026-05-31',
      ownershipTransferDate: '2026-05-20',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a sale draft when a required land/building transcript copy is missing', () => {
    const result = SaleContractDraftSchema.safeParse({
      contractType: 'sale',
      draftStatus: 'reviewing',
      templateCode: 'sale_v1',
      templateVersion: '2026-03-20',
      propertyId: 'property-002',
      propertyAddress: '臺北市信義區松仁路100號',
      ownerName: '陳屋主',
      buildingTranscriptAttached: true,
      landTranscriptAttached: false,
      attachments: [
        {
          attachmentId: 'att-building-2',
          attachmentType: 'building_transcript',
          fileName: 'building-copy.pdf',
          storagePath: 'contracts/property-002/building-copy.pdf',
          isRequired: true,
          isAttached: true,
        },
      ],
      sellerName: '陳屋主',
      buyerName: '黃買方',
      transcriptSections: {
        buildingDescription: {
          title: '建物標示部',
          content: '建號 123。',
          transcriptType: 'building',
        },
        buildingOwnership: {
          title: '建物所有權部',
          content: '所有權人陳屋主。',
          transcriptType: 'building',
        },
        landDescription: {
          title: '土地標示部',
          content: '地號 100。',
          transcriptType: 'land',
        },
        landOwnership: {
          title: '土地所有權部',
          content: '所有權人陳屋主。',
          transcriptType: 'land',
        },
      },
      salePriceTotal: 25800000,
      paymentSchedule: [
        {
          label: '簽約款',
          amount: 1000000,
          dueDate: '2026-04-01',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe('ContractDraftSchema', () => {
  it('uses contractType as discriminant', () => {
    const leaseResult = ContractDraftSchema.safeParse({
      contractType: 'lease',
      draftStatus: 'draft',
      templateCode: 'lease_v1',
      templateVersion: '2026-03-20',
      propertyId: 'property-003',
      propertyAddress: '新北市板橋區文化路一段1號',
      ownerName: '李房東',
      tenantName: '周租客',
      buildingTranscriptAttached: true,
      landTranscriptAttached: false,
      attachments: [
        {
          attachmentId: 'att-building-3',
          attachmentType: 'building_transcript',
          fileName: 'building-copy.pdf',
          storagePath: 'contracts/property-003/building-copy.pdf',
          isRequired: true,
          isAttached: true,
        },
      ],
      leaseStartDate: '2026-04-01',
      leaseEndDate: '2027-03-31',
      monthlyRent: 28000,
      depositAmount: 56000,
    });

    expect(leaseResult.success).toBe(true);
  });
});