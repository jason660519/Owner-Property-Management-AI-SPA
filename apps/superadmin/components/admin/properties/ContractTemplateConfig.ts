import type { SalePaymentMilestone } from '@/lib/types/contracts';

export type ContractTemplateId =
  | 'lease'
  | 'sale'
  | 'commission-lease'
  | 'commission-sale'
  | 'presale'
  | 'presale-parking';

export type ContractTemplateCategory = '租賃' | '買賣' | '委託' | '預售';

export interface ContractTemplateOption {
  id: ContractTemplateId;
  label: string;
  description: string;
  contractType: 'lease' | 'sale';
  /** Whether the template rendering is fully implemented */
  available: boolean;
  /** Source filename in resources/samples/空白契約書/ */
  sourceFile: string;
  category: ContractTemplateCategory;
}

export interface ContractDraftFormState {
  tenantName: string;
  buyerName: string;
  agentName: string;
  brokerName: string;
  scrivenerName: string;
  deliveryCondition: string;
  taxAllocation: string;
  registrationFeeAllocation: string;
  brokerFeeAllocation: string;
  escrowMethod: string;
  occupiedByOthersCondition: string;
  encroachmentCondition: string;
  leaseBorrowCondition: string;
  copyRetentionHolder: string;
  defaultClauseSummary: string;
  contractDate: string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositAmount: number;
  contractCopiesCount: number;
  holdoverPenaltyMultiple: number | '';
  usePurpose: '' | 'residential' | 'office' | 'commercial' | 'other';
  includedItemsInput: string;
  specialTerms: string;
  monthlyRent: number;
  paymentDueDay: number;
  salePriceTotal: number;
  landPrice: number;
  buildingPrice: number;
  parkingLandPrice: number;
  parkingBuildingPrice: number;
  handoverDate: string;
  ownershipTransferDate: string;
  paymentSchedule: SalePaymentMilestone[];
  // Commission contract fields
  /** Entrusting party name (landlord/owner) */
  commissionPrincipalName: string;
  /** Brokerage company name */
  commissionBrokerageName: string;
  /** Commission type: exclusive or general */
  commissionType: '' | 'exclusive' | 'general';
  /** Commission rate as percentage (e.g. 4 = 4%) */
  commissionRatePercent: number;
  /** Fixed commission fee (alternative to percentage) */
  commissionFixedFee: number;
  /** Commission contract start date */
  commissionStartDate: string;
  /** Commission contract end date */
  commissionEndDate: string;
  /** Expected listing price */
  commissionListingPrice: number;
  /** Minimum acceptable price */
  commissionFloorPrice: number;
  /** Marketing methods authorized by the principal */
  commissionMarketingMethods: string;
  /** Commission-specific special terms */
  commissionSpecialTerms: string;
}

export interface PersistedContractDraftState {
  form: ContractDraftFormState;
  generatedDraft: unknown | null;
}

export interface DraftVersionOption {
  id: string;
  name: string;
  updatedAt: string;
}

export const CONTRACT_TEMPLATE_OPTIONS: ContractTemplateOption[] = [
  {
    id: 'lease',
    label: '房屋租賃契約書',
    description: '標準住宅／辦公室出租，房東直接與承租人簽約',
    contractType: 'lease',
    available: true,
    sourceFile: '房屋租賃契約書範本.doc',
    category: '租賃',
  },
  {
    id: 'sale',
    label: '成屋買賣契約書',
    description: '現成屋買賣，需附建物與土地謄本',
    contractType: 'sale',
    available: true,
    sourceFile: '成屋買賣契約書範本.doc',
    category: '買賣',
  },
  {
    id: 'commission-lease',
    label: '房屋委託租賃契約書',
    description: '房東委託仲介代為出租之委託管理合約',
    contractType: 'lease',
    available: true,
    sourceFile: '房屋委託租賃契約書範本.doc',
    category: '委託',
  },
  {
    id: 'commission-sale',
    label: '不動產委託銷售契約書',
    description: '房東委託仲介代為銷售之委託合約',
    contractType: 'sale',
    available: true,
    sourceFile: '不動產委託銷售契約書範本.doc',
    category: '委託',
  },
  {
    id: 'presale',
    label: '預售屋買賣契約書',
    description: '預售建案買賣，適用尚未完工之物件',
    contractType: 'sale',
    available: false,
    sourceFile: '預售屋買賣契約書範本.doc',
    category: '預售',
  },
  {
    id: 'presale-parking',
    label: '預售停車位買賣契約書',
    description: '預售停車位專用買賣合約',
    contractType: 'sale',
    available: false,
    sourceFile: '預售停車位買賣契約書範本.doc',
    category: '預售',
  },
];

export const CATEGORY_BADGE_CLASSES: Record<ContractTemplateCategory, string> = {
  '租賃': 'bg-blue-50 text-blue-700 border-blue-200',
  '買賣': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '委託': 'bg-amber-50 text-amber-700 border-amber-200',
  '預售': 'bg-purple-50 text-purple-700 border-purple-200',
};
