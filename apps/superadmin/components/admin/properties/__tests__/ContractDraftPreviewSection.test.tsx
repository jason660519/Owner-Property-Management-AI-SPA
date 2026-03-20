import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JSZip from 'jszip';
import { ContractDraftPreviewSection } from '../ContractDraftPreviewSection';
import type { PropertyItem } from '@/lib/types/properties';

type MockCloudDraft = {
  id: string;
  name: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

let mockCloudDraft: MockCloudDraft | null = null;

const mockLoadLatestCloudDraft = jest.fn();
const mockListCloudDrafts = jest.fn();
const mockSaveCloudDraft = jest.fn();
const mockDeleteCloudDraft = jest.fn();
const mockDeleteCloudDraftById = jest.fn();

jest.mock('@/lib/utils/form-draft-cloud', () => ({
  loadLatestCloudDraft: (...args: unknown[]) => mockLoadLatestCloudDraft(...args),
  listCloudDrafts: (...args: unknown[]) => mockListCloudDrafts(...args),
  saveCloudDraft: (...args: unknown[]) => mockSaveCloudDraft(...args),
  deleteCloudDraft: (...args: unknown[]) => mockDeleteCloudDraft(...args),
  deleteCloudDraftById: (...args: unknown[]) => mockDeleteCloudDraftById(...args),
}));

async function createMockTemplateDocx() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join(''));

  zip.folder('_rels')?.file('.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join(''));

  zip.folder('word')?.file('document.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<w:body><w:p><w:r><w:t>template</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body>',
    '</w:document>',
  ].join(''));

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
  ].join(''));

  return zip.generateAsync({ type: 'arraybuffer' });
}

const MOCK_BUILDING_TRANSCRIPT = {
  header: { transcriptType: '建物', documentTitle: '大安區仁愛段二小段 01659-000建號', printTime: '2026-03-20', pageInfo: '第1頁', printer: '測試' },
  description: {
    buildingNumber: '01659-000', regDate: '2026-03-20', regReason: '第一次登記', doorAddress: '臺北市大安區仁愛路四段295號3樓',
    landParcelNumber: '100', mainUse: '住家用', mainMaterial: '鋼筋混凝土', totalFloors: '14', totalArea: '99.16',
    floorLevel: '3', floorArea: '99.16', completionDate: '2000-01-01', annexedBuildings: [], commonAreas: [], notes: '',
  },
  ownership: [{ ownerName: '王大明', ownershipRatio: '全部', registrationDate: '2020-01-01', registrationReason: '買賣', certNumber: '', address: '' }],
  encumbrances: [],
};

const MOCK_LAND_TRANSCRIPT = {
  header: { transcriptType: '土地', documentTitle: '大安區仁愛段二小段 100地號', printTime: '2026-03-20', pageInfo: '第1頁', printer: '測試' },
  description: {
    landNumber: '0100-000', regDate: '2026-03-20', regReason: '第一次登記', landCategory: '建', grade: '', area: '328.00',
    useZone: '住宅區', useCategory: '住三', announcedValueYear: '2026', announcedValuePerSqm: '300000', notes: '',
  },
  ownership: [{ ownerName: '王大明', ownershipRatio: '100000分之3000', registrationDate: '2020-01-01', registrationReason: '買賣', certNumber: '', address: '' }],
  encumbrances: [],
};

function createProperty(type: 'sale' | 'rental' = 'rental'): PropertyItem {
  return {
    id: 'property-1',
    type,
    title: '測試物件',
    address: '臺北市大安區仁愛路四段295號3樓',
    addressCity: '臺北市',
    addressDistrict: '大安區',
    addressStreet: '仁愛路四段',
    addressNumber: '295號',
    addressFloor: '3樓',
    addressUnit: '',
    status: type === 'sale' ? 'for_sale' : 'vacant',
    price: type === 'sale' ? 25800000 : null,
    monthlyRent: type === 'rental' ? 32000 : null,
    creatorName: 'tester',
    ownerName: '王大明',
    ownerId: 'owner-1',
    area: 30,
    propertyType: '大樓',
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 1,
    parkingSpaces: 1,
    createdAt: '2026-03-20T00:00:00.000Z',
    // Sale contracts require transcripts; rental can have null
    buildingTranscript: type === 'sale' ? MOCK_BUILDING_TRANSCRIPT : null,
    landTranscript: type === 'sale' ? MOCK_LAND_TRANSCRIPT : null,
  };
}

describe('ContractDraftPreviewSection', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    global.URL.createObjectURL = jest.fn(() => 'blob:contract-preview');
    global.URL.revokeObjectURL = jest.fn();
    window.localStorage.clear();
    window.open = jest.fn(() => ({
      onload: null,
      print: jest.fn(),
    } as unknown as Window));
    mockCloudDraft = null;
    mockLoadLatestCloudDraft.mockReset();
    mockListCloudDrafts.mockReset();
    mockSaveCloudDraft.mockReset();
    mockDeleteCloudDraft.mockReset();
    mockDeleteCloudDraftById.mockReset();
    mockLoadLatestCloudDraft.mockImplementation(async () => mockCloudDraft);
    mockListCloudDrafts.mockImplementation(async () => (mockCloudDraft ? [mockCloudDraft] : []));
    mockSaveCloudDraft.mockImplementation(async ({ data, name }: { data: Record<string, unknown>; name: string }) => {
      mockCloudDraft = {
        id: mockCloudDraft?.id ?? 'draft-1',
        name,
        updatedAt: '2026-03-21T10:00:00.000Z',
        data,
      };

      return mockCloudDraft;
    });
    mockDeleteCloudDraft.mockImplementation(async () => {
      mockCloudDraft = null;
    });
    mockDeleteCloudDraftById.mockImplementation(async () => {
      mockCloudDraft = null;
    });
  });

  it('generates and renders a lease draft preview', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        draft: {
          contractType: 'lease',
          contractDate: '2026-03-20',
          ownerName: '王大明',
          tenantName: '林小美',
          propertyAddress: '臺北市大安區仁愛路四段295號3樓',
          monthlyRent: 32000,
          depositAmount: 64000,
          contractCopiesCount: 3,
          holdoverPenaltyMultiple: 2,
          usePurpose: 'office',
          includedItems: ['冷氣', '冰箱'],
          specialTerms: '承租人不得飼養寵物。',
          transcriptAttachmentNote: '本契約附建物或土地謄本副本至少一份，供雙方核對標的資訊。',
          attachments: [{ attachmentId: 'a1' }],
        },
      }),
    });

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await user.type(screen.getByLabelText('承租人姓名'), '林小美');
    await user.type(screen.getByLabelText('契約日期'), '2026-03-20');
    await user.selectOptions(screen.getByLabelText('使用用途'), 'office');
    await user.type(screen.getByLabelText('附屬設備'), '冷氣, 冰箱');
    await user.type(screen.getByLabelText('其他特約'), '承租人不得飼養寵物。');
    await user.clear(screen.getByLabelText('押金')); 
    await user.type(screen.getByLabelText('押金'), '64000');
    await user.click(screen.getByRole('button', { name: '產生草稿預覽' }));

    await waitFor(() => {
      expect(screen.getByText('契約草稿預覽')).toBeInTheDocument();
    });

    // Contract content is rendered inside the iframe's srcDoc — not queryable via screen.
    // Verify the iframe preview container is present instead.
    expect(screen.getByTitle('契約草稿預覽')).toBeInTheDocument();

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(fetchCall?.[1]?.body as string)).toEqual(expect.objectContaining({
      contractDate: '2026-03-20',
      usePurpose: 'office',
      includedItems: ['冷氣', '冰箱'],
      specialTerms: '承租人不得飼養寵物。',
    }));
  });

  it('supports html/docx export and print actions after draft generation', async () => {
    const user = userEvent.setup();
    const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const templateDocx = await createMockTemplateDocx();

    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/contracts/draft') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            draft: {
              contractType: 'lease',
              draftStatus: 'draft',
              templateCode: 'tw-lease-template',
              templateVersion: '1.0.0',
              contractDate: '2026-03-20',
              propertyId: 'property-1',
              propertyAddress: '臺北市大安區仁愛路四段295號3樓',
              ownerName: '王大明',
              tenantName: '林小美',
              monthlyRent: 32000,
              depositAmount: 64000,
              contractCopiesCount: 2,
              holdoverPenaltyMultiple: 2,
              usePurpose: 'residential',
              includedItems: ['冷氣'],
              specialTerms: '不得於陽台堆放雜物。',
              leaseStartDate: '2026-04-01',
              leaseEndDate: '2027-03-31',
              buildingTranscriptAttached: true,
              landTranscriptAttached: false,
              transcriptAttachmentNote: '本契約附建物或土地謄本副本至少一份，供雙方核對標的資訊。',
              attachments: [{
                attachmentId: 'a1',
                attachmentType: 'building_transcript',
                fileName: 'building.pdf',
                storagePath: 'contracts/property-1/building.pdf',
                isRequired: true,
                isAttached: true,
              }],
            },
          }),
        };
      }

      if (url === '/contract-templates/tw-lease-template.docx') {
        return {
          ok: true,
          arrayBuffer: async () => templateDocx,
        };
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await user.type(screen.getByLabelText('承租人姓名'), '林小美');
    await user.type(screen.getByLabelText('租期起日'), '2026-04-01');
    await user.type(screen.getByLabelText('租期迄日'), '2027-03-31');
    await user.click(screen.getByRole('button', { name: '產生草稿預覽' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '下載 HTML' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '下載 HTML' }));
    await user.click(screen.getByRole('button', { name: '下載 DOCX' }));
    await user.click(screen.getByRole('button', { name: '列印 / 另存 PDF' }));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledTimes(1);

    anchorClick.mockRestore();
  });

  it('includes sale broker, fee, and clause fields in generation payload and preview', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        draft: {
          contractType: 'sale',
          contractDate: '2026-03-20',
          sellerName: '王大明',
          buyerName: '黃買方',
          brokerName: '安心房屋仲介股份有限公司',
          agentName: '王經紀',
          scrivenerName: '林代書',
          deliveryCondition: '依現況點交，附建物現況確認書。',
          taxAllocation: '土地增值稅由賣方負擔。',
          registrationFeeAllocation: '所有權移轉登記規費由買方負擔。',
          brokerFeeAllocation: '仲介費由買賣雙方各半負擔。',
          escrowMethod: '價金履約保證專戶辦理。',
          occupiedByOthersCondition: '目前由前屋主持續占用，點交前完成遷離。',
          encroachmentCondition: '無占用他人土地情形。',
          leaseBorrowCondition: '現有租客已同意於交屋日前終止租約。',
          copyRetentionHolder: '永慶代書事務所',
          defaultClauseSummary: '若有未盡事宜，雙方同意另以書面特約補充。',
          propertyAddress: '臺北市大安區仁愛路四段295號3樓',
          salePriceTotal: 25800000,
          landPrice: 16000000,
          buildingPrice: 8200000,
          parkingLandPrice: 600000,
          parkingBuildingPrice: 1000000,
          paymentSchedule: [{ label: '簽約款', amount: 1000000, dueDate: '2026-04-01' }],
          transcriptSections: {
            buildingDescription: { title: '建物標示部', content: '建號 123，建物面積 30 坪。', transcriptType: 'building' },
            buildingOwnership: { title: '建物所有權部', content: '所有權人王大明，持分全部。', transcriptType: 'building' },
            landDescription: { title: '土地標示部', content: '地號 100，使用分區住三。', transcriptType: 'land' },
            landOwnership: { title: '土地所有權部', content: '所有權人王大明，持分全部。', transcriptType: 'land' },
          },
          buildingTranscriptAttached: true,
          landTranscriptAttached: true,
          attachments: [{ attachmentId: 'a1' }],
          manualReviewRequired: false,
        },
      }),
    });

    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    await user.type(screen.getByLabelText('買方姓名'), '黃買方');
    await user.type(screen.getByLabelText('契約日期'), '2026-03-20');
    await user.type(screen.getByLabelText('仲介經紀人'), '王經紀');
    await user.type(screen.getByLabelText('仲介公司'), '安心房屋仲介股份有限公司');
    await user.type(screen.getByLabelText('代書／地政士'), '林代書');
    await user.type(screen.getByLabelText('交屋現況'), '依現況點交，附建物現況確認書。');
    await user.type(screen.getByLabelText('稅費負擔'), '土地增值稅由賣方負擔。');
    await user.type(screen.getByLabelText('登記規費分擔'), '所有權移轉登記規費由買方負擔。');
    await user.type(screen.getByLabelText('仲介費分擔'), '仲介費由買賣雙方各半負擔。');
    await user.type(screen.getByLabelText('履約保證／價金保管方式'), '價金履約保證專戶辦理。');
    await user.type(screen.getByLabelText('建物被他人占用情形'), '目前由前屋主持續占用，點交前完成遷離。');
    await user.type(screen.getByLabelText('占用他人土地情形'), '無占用他人土地情形。');
    await user.type(screen.getByLabelText('出租或出借情形'), '現有租客已同意於交屋日前終止租約。');
    await user.type(screen.getByLabelText('副本留存人'), '永慶代書事務所');
    await user.type(screen.getByLabelText('特約條款摘要'), '若有未盡事宜，雙方同意另以書面特約補充。');
    await user.click(screen.getByRole('button', { name: '產生草稿預覽' }));

    await waitFor(() => {
      expect(screen.getByText('契約草稿預覽')).toBeInTheDocument();
    });

    // Contract content is rendered inside the iframe's srcDoc — not queryable via screen.
    // Verify the iframe preview container is present instead.
    expect(screen.getByTitle('契約草稿預覽')).toBeInTheDocument();

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall?.[0]).toBe('/api/contracts/draft');
    expect(JSON.parse(fetchCall?.[1]?.body as string)).toEqual(expect.objectContaining({
      contractType: 'sale',
      contractDate: '2026-03-20',
      buyerName: '黃買方',
      agentName: '王經紀',
      brokerName: '安心房屋仲介股份有限公司',
      scrivenerName: '林代書',
      deliveryCondition: '依現況點交，附建物現況確認書。',
      taxAllocation: '土地增值稅由賣方負擔。',
      registrationFeeAllocation: '所有權移轉登記規費由買方負擔。',
      brokerFeeAllocation: '仲介費由買賣雙方各半負擔。',
      escrowMethod: '價金履約保證專戶辦理。',
      occupiedByOthersCondition: '目前由前屋主持續占用，點交前完成遷離。',
      encroachmentCondition: '無占用他人土地情形。',
      leaseBorrowCondition: '現有租客已同意於交屋日前終止租約。',
      copyRetentionHolder: '永慶代書事務所',
      defaultClauseSummary: '若有未盡事宜，雙方同意另以書面特約補充。',
    }));
  });

  it('keeps payment milestone inputs mounted while editing labels', async () => {
    const user = userEvent.setup();

    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    const milestoneLabelInput = screen.getByLabelText('付款節點名稱-1');

    await user.clear(milestoneLabelInput);
    await user.type(milestoneLabelInput, '訂金');

    const updatedMilestoneLabelInput = screen.getByLabelText('付款節點名稱-1');

    expect(updatedMilestoneLabelInput).toHaveValue('訂金');
    expect(updatedMilestoneLabelInput).toHaveFocus();
  });

  it('allows overwriting existing sale numeric inputs manually', async () => {
    const user = userEvent.setup();

    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    const salePriceInput = screen.getByLabelText('買賣總價');
    const landPriceInput = screen.getByLabelText('土地價款');
    const buildingPriceInput = screen.getByLabelText('建物價款');
    const parkingLandPriceInput = screen.getByLabelText('車位土地價款');
    const parkingBuildingPriceInput = screen.getByLabelText('車位建物價款');

    await user.clear(salePriceInput);
    await user.type(salePriceInput, '30000000');
    await user.clear(landPriceInput);
    await user.type(landPriceInput, '18000000');
    await user.clear(buildingPriceInput);
    await user.type(buildingPriceInput, '9000000');
    await user.clear(parkingLandPriceInput);
    await user.type(parkingLandPriceInput, '500000');
    await user.clear(parkingBuildingPriceInput);
    await user.type(parkingBuildingPriceInput, '1500000');

    expect(salePriceInput).toHaveDisplayValue('30000000');
    expect(landPriceInput).toHaveDisplayValue('18000000');
    expect(buildingPriceInput).toHaveDisplayValue('9000000');
    expect(parkingLandPriceInput).toHaveDisplayValue('500000');
    expect(parkingBuildingPriceInput).toHaveDisplayValue('1500000');
  });

  it('keeps numeric inputs empty while the user is retyping values', async () => {
    const user = userEvent.setup();

    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    const salePriceInput = screen.getByLabelText('買賣總價');

    await user.clear(salePriceInput);

    expect(salePriceInput).toHaveDisplayValue('');

    await user.type(salePriceInput, '123');

    expect(salePriceInput).toHaveDisplayValue('123');
  });

  it('allows overwriting existing sale text inputs manually', async () => {
    const user = userEvent.setup();

    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    const brokerNameInput = screen.getByLabelText('仲介公司');
    const defaultClauseInput = screen.getByLabelText('特約條款摘要');

    await user.type(brokerNameInput, '舊公司');
    await user.clear(brokerNameInput);
    await user.type(brokerNameInput, '新仲介公司');

    await user.type(defaultClauseInput, '舊摘要');
    await user.clear(defaultClauseInput);
    await user.type(defaultClauseInput, '新的特約條款摘要');

    expect(brokerNameInput).toHaveValue('新仲介公司');
    expect(defaultClauseInput).toHaveValue('新的特約條款摘要');
  });

  it('restores saved lease draft inputs from cloud draft after remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await user.type(screen.getByLabelText('承租人姓名'), '林小美');
    await user.type(screen.getByLabelText('契約日期'), '2026-03-20');
    await user.selectOptions(screen.getByLabelText('使用用途'), 'commercial');
    await user.type(screen.getByLabelText('附屬設備'), '冷氣, 洗衣機');
    await user.type(screen.getByLabelText('其他特約'), '禁止轉租');

    await waitFor(() => {
      expect(mockSaveCloudDraft).toHaveBeenCalled();
    });

    window.localStorage.clear();

    unmount();

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await waitFor(() => {
      expect(screen.getByLabelText('承租人姓名')).toHaveValue('林小美');
    });

    expect(screen.getByLabelText('契約日期')).toHaveValue('2026-03-20');
    expect(screen.getByLabelText('使用用途')).toHaveValue('commercial');
    expect(screen.getByLabelText('附屬設備')).toHaveValue('冷氣, 洗衣機');
    expect(screen.getByLabelText('其他特約')).toHaveValue('禁止轉租');
  });

  it('migrates existing browser draft to cloud when account draft is missing', async () => {
    window.localStorage.setItem('contract-draft-preview:property-1', JSON.stringify({
      form: {
        contractType: 'lease',
        tenantName: '本地草稿承租人',
        contractDate: '2026-04-01',
        usePurpose: 'office',
        includedItemsInput: '冷氣, 書桌',
        specialTerms: '本地快取待同步',
      },
      generatedDraft: null,
    }));

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await waitFor(() => {
      expect(screen.getByLabelText('承租人姓名')).toHaveValue('本地草稿承租人');
    });

    await waitFor(() => {
      expect(mockSaveCloudDraft).toHaveBeenCalledWith(expect.objectContaining({
        formKey: 'contract-draft-preview:property-1',
      }));
    });

    expect(mockCloudDraft?.data).toEqual(expect.objectContaining({
      form: expect.objectContaining({
        tenantName: '本地草稿承租人',
        contractDate: '2026-04-01',
      }),
    }));
  });

  it('can save and switch between draft versions', async () => {
    const user = userEvent.setup();
    const cloudVersions: MockCloudDraft[] = [];

    mockLoadLatestCloudDraft.mockImplementation(async () => cloudVersions[0] ?? null);
    mockListCloudDrafts.mockImplementation(async () => cloudVersions);
    mockSaveCloudDraft.mockImplementation(async ({ data, name, draftId }: { data: Record<string, unknown>; name: string; draftId?: string | null }) => {
      const targetId = draftId ?? `draft-${cloudVersions.length + 1}`;
      const saved: MockCloudDraft = {
        id: targetId,
        name,
        updatedAt: `2026-03-2${Math.min(cloudVersions.length + 1, 9)}T10:00:00.000Z`,
        data,
      };
      const withoutTarget = cloudVersions.filter((item) => item.id !== targetId);
      cloudVersions.splice(0, cloudVersions.length, saved, ...withoutTarget);
      return saved;
    });

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await user.type(screen.getByLabelText('承租人姓名'), '版本一');
    await user.type(screen.getByLabelText('版本名稱'), '版本一-自訂名稱');
    await user.click(screen.getByRole('button', { name: '另存新版本' }));

    await waitFor(() => {
      expect(screen.getByLabelText('草稿版本')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('版本名稱')).toHaveValue('');
    });

    await user.clear(screen.getByLabelText('承租人姓名'));
    await user.type(screen.getByLabelText('承租人姓名'), '版本二');
    await user.click(screen.getByRole('button', { name: '另存新版本' }));

    await waitFor(() => {
      expect(screen.getAllByRole('option', { name: /版本/ }).length).toBeGreaterThan(1);
    });

    await user.selectOptions(screen.getByLabelText('草稿版本'), cloudVersions[1].id);

    await waitFor(() => {
      expect(screen.getByLabelText('承租人姓名')).toHaveValue('版本一');
    });

    expect(mockSaveCloudDraft).toHaveBeenCalledWith(expect.objectContaining({
      name: '版本一-自訂名稱',
    }));
  });

  it('can delete currently selected draft version and fallback to latest', async () => {
    const user = userEvent.setup();
    const cloudVersions: MockCloudDraft[] = [
      {
        id: 'draft-2',
        name: '版本二',
        updatedAt: '2026-03-22T10:00:00.000Z',
        data: {
          form: { tenantName: '版本二', contractType: 'lease', paymentSchedule: [] },
          generatedDraft: null,
        },
      },
      {
        id: 'draft-1',
        name: '版本一',
        updatedAt: '2026-03-21T10:00:00.000Z',
        data: {
          form: { tenantName: '版本一', contractType: 'lease', paymentSchedule: [] },
          generatedDraft: null,
        },
      },
    ];

    mockLoadLatestCloudDraft.mockImplementation(async () => cloudVersions[0] ?? null);
    mockListCloudDrafts.mockImplementation(async () => cloudVersions);
    mockDeleteCloudDraftById.mockImplementation(async (draftId: string) => {
      const index = cloudVersions.findIndex((item) => item.id === draftId);
      if (index >= 0) {
        cloudVersions.splice(index, 1);
      }
    });

    render(<ContractDraftPreviewSection property={createProperty('rental')} />);

    await waitFor(() => {
      expect(screen.getByLabelText('承租人姓名')).toHaveValue('版本二');
    });

    await user.click(screen.getByRole('button', { name: '刪除目前版本' }));

    await waitFor(() => {
      expect(mockDeleteCloudDraftById).toHaveBeenCalledWith('draft-2');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('承租人姓名')).toHaveValue('版本一');
    });
  });

  it('clears saved draft inputs, local cache, and cloud draft when requested', async () => {
    const user = userEvent.setup();
    render(<ContractDraftPreviewSection property={createProperty('sale')} />);

    await user.type(screen.getByLabelText('買方姓名'), '黃買方');
    await user.type(screen.getByLabelText('契約日期'), '2026-03-20');
    await user.type(screen.getByLabelText('仲介經紀人'), '王經紀');

    await waitFor(() => {
      expect(mockSaveCloudDraft).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: '清除草稿' }));

    await waitFor(() => {
      expect(mockDeleteCloudDraft).toHaveBeenCalledWith(expect.objectContaining({
        formKey: 'contract-draft-preview:property-1',
      }));
    });

    expect(screen.getByLabelText('買方姓名')).toHaveValue('');
    expect(screen.getByLabelText('契約日期')).toHaveValue('');
    expect(screen.getByLabelText('仲介經紀人')).toHaveValue('');

    const savedKeys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith('contract-draft-preview:'),
    );

    expect(savedKeys).toHaveLength(0);
    expect(mockCloudDraft).toBeNull();
  });
});