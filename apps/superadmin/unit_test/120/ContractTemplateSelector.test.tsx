import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractDraftPreviewSection } from '../../components/admin/properties/ContractDraftPreviewSection';
import { ContractDraftCommissionFields } from '../../components/admin/properties/ContractDraftCommissionFields';
import {
  CONTRACT_TEMPLATE_OPTIONS,
  CATEGORY_BADGE_CLASSES,
  type ContractDraftFormState,
} from '../../components/admin/properties/ContractTemplateConfig';
import type { PropertyItem } from '@/lib/types/properties';

// --- Mocks ---

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

jest.mock('@/lib/utils/contract-document-renderer', () => ({
  renderContractDocumentHtml: jest.fn(() => '<html><body>mock</body></html>'),
  renderContractDocumentDocx: jest.fn(async () => new Blob(['mock'])),
  buildContractDocumentFileName: jest.fn(() => 'mock-contract'),
  getContractOfficialDocxTemplatePath: jest.fn(() => '/contract-templates/mock.docx'),
}));

// --- Helpers ---

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
    buildingTranscript: null,
    landTranscript: null,
  };
}

function buildEmptyForm(): ContractDraftFormState {
  return {
    tenantName: '', buyerName: '', agentName: '', brokerName: '', scrivenerName: '',
    deliveryCondition: '', taxAllocation: '', registrationFeeAllocation: '', brokerFeeAllocation: '',
    escrowMethod: '', occupiedByOthersCondition: '', encroachmentCondition: '', leaseBorrowCondition: '',
    copyRetentionHolder: '', defaultClauseSummary: '', contractDate: '',
    leaseStartDate: '', leaseEndDate: '',
    depositAmount: 0, contractCopiesCount: 2, holdoverPenaltyMultiple: '',
    usePurpose: '', includedItemsInput: '', specialTerms: '',
    monthlyRent: 0, paymentDueDay: 5,
    salePriceTotal: 0, landPrice: 0, buildingPrice: 0,
    parkingLandPrice: 0, parkingBuildingPrice: 0, handoverDate: '', ownershipTransferDate: '',
    paymentSchedule: [],
    commissionPrincipalName: '', commissionBrokerageName: '',
    commissionType: '', commissionRatePercent: 0, commissionFixedFee: 0,
    commissionStartDate: '', commissionEndDate: '',
    commissionListingPrice: 0, commissionFloorPrice: 0,
    commissionMarketingMethods: '', commissionSpecialTerms: '',
  };
}

// --- Setup ---

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
  window.localStorage.clear();
  window.open = jest.fn(() => ({ onload: null, print: jest.fn() } as unknown as Window));
  mockLoadLatestCloudDraft.mockReset().mockResolvedValue(null);
  mockListCloudDrafts.mockReset().mockResolvedValue([]);
  mockSaveCloudDraft.mockReset().mockResolvedValue(null);
  mockDeleteCloudDraft.mockReset().mockResolvedValue(undefined);
  mockDeleteCloudDraftById.mockReset().mockResolvedValue(undefined);
});

// ============================================================================
// 1. ContractDraftPreviewSection — Template card rendering
// ============================================================================

describe('ContractDraftPreviewSection — Template Cards', () => {
  it('renders 6 template cards with labels and category badges', () => {
    render(<ContractDraftPreviewSection property={createProperty()} />);

    for (const template of CONTRACT_TEMPLATE_OPTIONS) {
      expect(screen.getByText(template.label)).toBeInTheDocument();
    }

    // Verify all 4 category badges are rendered
    const categories = [...new Set(CONTRACT_TEMPLATE_OPTIONS.map(t => t.category))];
    expect(categories).toHaveLength(4);
    for (const cat of categories) {
      expect(screen.getAllByText(cat).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('toggles card selection on click', async () => {
    const user = userEvent.setup();
    render(<ContractDraftPreviewSection property={createProperty()} />);

    const leaseCard = screen.getByText('房屋租賃契約書').closest('button')!;
    await user.click(leaseCard);

    // After selecting, the hint text should disappear
    expect(screen.queryByText('請點選上方範本以開始套版')).not.toBeInTheDocument();

    // Click again to deselect
    await user.click(leaseCard);
    expect(screen.getByText('請點選上方範本以開始套版')).toBeInTheDocument();
  });

  it('shows hint text when no template is selected', () => {
    render(<ContractDraftPreviewSection property={createProperty()} />);
    expect(screen.getByText('請點選上方範本以開始套版')).toBeInTheDocument();
  });

  it('shows "upload only" indicator for unavailable templates', () => {
    render(<ContractDraftPreviewSection property={createProperty()} />);

    // presale and presale-parking have available: false
    const unavailableLabels = CONTRACT_TEMPLATE_OPTIONS
      .filter(t => !t.available)
      .map(t => t.label);

    expect(unavailableLabels.length).toBeGreaterThanOrEqual(2);

    const uploadHints = screen.getAllByText('僅支援上傳合約（AI 套版開發中）');
    expect(uploadHints).toHaveLength(unavailableLabels.length);
  });
});

// ============================================================================
// 2. ContractDraftPanel — Mode switching (AI available vs unavailable)
// ============================================================================

describe('ContractDraftPreviewSection — Panel mode switching', () => {
  it('defaults to AI mode when template is AI-available', async () => {
    const user = userEvent.setup();
    render(<ContractDraftPreviewSection property={createProperty()} />);

    // Select a commission template (available: true)
    const commissionCard = screen.getByText('房屋委託租賃契約書').closest('button')!;
    await user.click(commissionCard);

    // The AI tab should be active (not disabled)
    const aiTab = screen.getByRole('button', { name: /AI 套版生成/ });
    expect(aiTab).not.toBeDisabled();
  });

  it('defaults to upload mode and disables AI tab when template is unavailable', async () => {
    const user = userEvent.setup();
    render(<ContractDraftPreviewSection property={createProperty()} />);

    // Select presale template (available: false)
    const presaleCard = screen.getByText('預售屋買賣契約書').closest('button')!;
    await user.click(presaleCard);

    // The AI tab should be disabled with "(開發中)" text
    const aiTab = screen.getByRole('button', { name: /AI 套版生成/ });
    expect(aiTab).toBeDisabled();
  });

  it('renders upload panel for unavailable templates', async () => {
    const user = userEvent.setup();
    render(<ContractDraftPreviewSection property={createProperty()} />);

    // Select presale-parking template (available: false)
    const presaleParkingCard = screen.getByText('預售停車位買賣契約書').closest('button')!;
    await user.click(presaleParkingCard);

    // Upload mode should be active — check for upload-related UI
    const uploadTab = screen.getByRole('button', { name: /自行上傳合約/ });
    expect(uploadTab).not.toBeDisabled();
  });
});

// ============================================================================
// 3. ContractDraftCommissionFields — Field rendering
// ============================================================================

describe('ContractDraftCommissionFields', () => {
  it('renders all commission-specific fields for sale type', () => {
    const form = buildEmptyForm();
    const setField = jest.fn();

    render(
      <ContractDraftCommissionFields
        form={form}
        setField={setField}
        commissionFor="sale"
      />
    );

    // Verify key labels are rendered
    expect(screen.getByText('委託銷售合約資訊')).toBeInTheDocument();
    expect(screen.getByText('委託人（屋主）')).toBeInTheDocument();
    expect(screen.getByText('受託仲介公司')).toBeInTheDocument();
    expect(screen.getByText('委託方式')).toBeInTheDocument();
    expect(screen.getByText('委託起始日')).toBeInTheDocument();
    expect(screen.getByText('委託到期日')).toBeInTheDocument();
    expect(screen.getByText('委託售價')).toBeInTheDocument();
    expect(screen.getByText(/底價/)).toBeInTheDocument();
    expect(screen.getByText('服務報酬')).toBeInTheDocument();
    expect(screen.getByText('授權行銷方式')).toBeInTheDocument();
    expect(screen.getByText('委託特約事項')).toBeInTheDocument();
  });

  it('renders lease-specific labels when commissionFor is lease', () => {
    const form = buildEmptyForm();
    const setField = jest.fn();

    render(
      <ContractDraftCommissionFields
        form={form}
        setField={setField}
        commissionFor="lease"
      />
    );

    expect(screen.getByText('委託租賃合約資訊')).toBeInTheDocument();
    expect(screen.getByText('委託租金（月）')).toBeInTheDocument();
    expect(screen.getByText(/最低可接受租金/)).toBeInTheDocument();
  });

  it('renders commission type dropdown with correct options', () => {
    const form = buildEmptyForm();
    const setField = jest.fn();

    render(
      <ContractDraftCommissionFields
        form={form}
        setField={setField}
        commissionFor="sale"
      />
    );

    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(3); // '', 'exclusive', 'general'
    expect(options.map(o => o.value)).toEqual(['', 'exclusive', 'general']);
  });

  it('calls setField when principal name is changed', async () => {
    const user = userEvent.setup();
    const form = buildEmptyForm();
    const setField = jest.fn();

    render(
      <ContractDraftCommissionFields
        form={form}
        setField={setField}
        commissionFor="sale"
      />
    );

    const principalInput = screen.getByPlaceholderText('委託人姓名');
    await user.type(principalInput, '張');

    expect(setField).toHaveBeenCalledWith('commissionPrincipalName', '張');
  });

  it('calls setField when commission type is selected', async () => {
    const user = userEvent.setup();
    const form = buildEmptyForm();
    const setField = jest.fn();

    render(
      <ContractDraftCommissionFields
        form={form}
        setField={setField}
        commissionFor="sale"
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'exclusive');

    expect(setField).toHaveBeenCalledWith('commissionType', 'exclusive');
  });
});

// ============================================================================
// 4. ContractTemplateConfig — Static config correctness
// ============================================================================

describe('ContractTemplateConfig', () => {
  it('defines exactly 6 templates', () => {
    expect(CONTRACT_TEMPLATE_OPTIONS).toHaveLength(6);
  });

  it('has unique IDs for all templates', () => {
    const ids = CONTRACT_TEMPLATE_OPTIONS.map(t => t.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('maps all 4 categories to badge classes', () => {
    const categories = [...new Set(CONTRACT_TEMPLATE_OPTIONS.map(t => t.category))];
    for (const cat of categories) {
      expect(CATEGORY_BADGE_CLASSES[cat]).toBeDefined();
      expect(CATEGORY_BADGE_CLASSES[cat]).toContain('bg-');
    }
  });

  it('marks presale templates as unavailable and commission templates as available', () => {
    const presale = CONTRACT_TEMPLATE_OPTIONS.filter(t => t.id.startsWith('presale'));
    const commission = CONTRACT_TEMPLATE_OPTIONS.filter(t => t.id.startsWith('commission'));

    for (const t of presale) {
      expect(t.available).toBe(false);
    }
    for (const t of commission) {
      expect(t.available).toBe(true);
    }
  });
});
