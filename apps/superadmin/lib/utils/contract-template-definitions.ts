import type { ContractType } from '@/lib/types/contracts';

export interface ContractTemplateFieldMapping {
  key: string;
  label: string;
  placeholder?: string;
  sourcePath: string;
  required: boolean;
  note?: string;
}

export interface ContractTemplateSectionDefinition {
  title: string;
  mappedFieldKeys: string[];
  note?: string;
}

export interface ContractTemplateDefinition {
  contractType: ContractType;
  templateCode: string;
  sourceDocumentName: string;
  sourceDocumentPath: string;
  displayTitle: string;
  reviewPeriodDays: number;
  sectionDefinitions: ContractTemplateSectionDefinition[];
  fieldMappings: ContractTemplateFieldMapping[];
}

const leaseDefinition: ContractTemplateDefinition = {
  contractType: 'lease',
  templateCode: 'tw-lease-template',
  sourceDocumentName: '房屋租賃契約書範本.doc',
  sourceDocumentPath: 'resources/samples/空白契約書/房屋租賃契約書範本.doc',
  displayTitle: '房屋租賃契約書草稿',
  reviewPeriodDays: 3,
  sectionDefinitions: [
    { title: '契約審閱權', mappedFieldKeys: ['contractDate'] },
    { title: '第一條 房屋標示及租賃範圍', mappedFieldKeys: ['propertyAddress', 'buildingNumber', 'landNumber', 'buildingAreaPing', 'landAreaPing'] },
    { title: '第二條 租賃附屬設備', mappedFieldKeys: ['includedItems'] },
    { title: '第三條 租賃期間', mappedFieldKeys: ['leaseStartDate', 'leaseEndDate'] },
    { title: '第四條 租金約定及支付', mappedFieldKeys: ['monthlyRent', 'paymentDueDay'] },
    { title: '第五條 擔保金（押金）約定及返還', mappedFieldKeys: ['depositAmount'] },
    { title: '第十四條 租賃物之返還', mappedFieldKeys: ['holdoverPenaltyMultiple'] },
    { title: '第九條 使用房屋之限制', mappedFieldKeys: ['usePurpose'] },
    { title: '第十六條 其他約定', mappedFieldKeys: ['specialTerms', 'encumbranceSummary', 'transcriptAttachmentNote'] },
    { title: '第二十四條 契約分存', mappedFieldKeys: ['contractCopiesCount'] },
  ],
  fieldMappings: [
    { key: 'contractDate', label: '契約審閱日期', placeholder: '{{contractDate}}', sourcePath: 'contractDate', required: false },
    { key: 'propertyAddress', label: '房屋標示地址', placeholder: '{{propertyAddress}}', sourcePath: 'propertyAddress', required: true },
    { key: 'ownerName', label: '出租人姓名', placeholder: '{{ownerName}}', sourcePath: 'ownerName', required: true },
    { key: 'tenantName', label: '承租人姓名', placeholder: '{{tenantName}}', sourcePath: 'tenantName', required: true },
    { key: 'buildingNumber', label: '建號', placeholder: '{{buildingNumber}}', sourcePath: 'buildingNumber', required: false },
    { key: 'landNumber', label: '土地地號', placeholder: '{{landNumber}}', sourcePath: 'landNumber', required: false },
    { key: 'buildingAreaPing', label: '建物面積（坪）', placeholder: '{{buildingAreaPing}}', sourcePath: 'buildingAreaPing', required: false },
    { key: 'landAreaPing', label: '土地面積（坪）', placeholder: '{{landAreaPing}}', sourcePath: 'landAreaPing', required: false },
    { key: 'leaseStartDate', label: '租期起日', placeholder: '{{leaseStartDate}}', sourcePath: 'leaseStartDate', required: true },
    { key: 'leaseEndDate', label: '租期迄日', placeholder: '{{leaseEndDate}}', sourcePath: 'leaseEndDate', required: true },
    { key: 'monthlyRent', label: '月租金', placeholder: '{{monthlyRent}}', sourcePath: 'monthlyRent', required: true },
    { key: 'depositAmount', label: '押金', placeholder: '{{depositAmount}}', sourcePath: 'depositAmount', required: true },
    { key: 'contractCopiesCount', label: '契約分存份數', placeholder: '{{contractCopiesCount}}', sourcePath: 'contractCopiesCount', required: false },
    { key: 'holdoverPenaltyMultiple', label: '返還遲延違約金倍數', placeholder: '{{holdoverPenaltyMultiple}}', sourcePath: 'holdoverPenaltyMultiple', required: false },
    { key: 'paymentDueDay', label: '每月付款日', placeholder: '{{paymentDueDay}}', sourcePath: 'paymentDueDay', required: false },
    { key: 'usePurpose', label: '使用用途', placeholder: '{{usePurpose}}', sourcePath: 'usePurpose', required: false },
    { key: 'specialTerms', label: '其他特約', placeholder: '{{specialTerms}}', sourcePath: 'specialTerms', required: false },
    { key: 'includedItems', label: '附屬設備', placeholder: '{{includedItems}}', sourcePath: 'includedItems', required: false },
    { key: 'encumbranceSummary', label: '他項權利摘要', placeholder: '{{encumbranceSummary}}', sourcePath: 'encumbranceSummary', required: false },
    { key: 'transcriptAttachmentNote', label: '謄本附件說明', placeholder: '{{transcriptAttachmentNote}}', sourcePath: 'transcriptAttachmentNote', required: false },
  ],
};

const saleDefinition: ContractTemplateDefinition = {
  contractType: 'sale',
  templateCode: 'tw-sale-template',
  sourceDocumentName: '成屋買賣契約書範本.doc',
  sourceDocumentPath: 'resources/samples/空白契約書/成屋買賣契約書範本.doc',
  displayTitle: '成屋買賣契約書草稿',
  reviewPeriodDays: 5,
  sectionDefinitions: [
    { title: '契約審閱權', mappedFieldKeys: ['contractDate'] },
    { title: '第一條 買賣標的', mappedFieldKeys: ['propertyAddress', 'buildingNumber', 'landNumbers', 'transcriptSections'] },
    { title: '第二條 價款議定', mappedFieldKeys: ['salePriceTotal', 'landPrice', 'buildingPrice', 'parkingLandPrice', 'parkingBuildingPrice'] },
    { title: '第三條 付款約定', mappedFieldKeys: ['paymentSchedule'] },
    { title: '第四條 貸款處理之一', mappedFieldKeys: ['riskNotes'] },
    { title: '第五條 貸款處理之二', mappedFieldKeys: ['escrowMethod'] },
    { title: '第六條 產權移轉', mappedFieldKeys: ['ownershipTransferDate'] },
    { title: '第七條 稅費負擔', mappedFieldKeys: ['taxAllocation', 'registrationFeeAllocation', 'brokerFeeAllocation'] },
    { title: '第八條 點交', mappedFieldKeys: ['handoverDate', 'deliveryCondition'] },
    { title: '第十一條 其他約定', mappedFieldKeys: ['occupiedByOthersCondition', 'encroachmentCondition', 'leaseBorrowCondition', 'defaultClauseSummary'] },
    { title: '第十三條 仲介簽章', mappedFieldKeys: ['brokerName', 'agentName'] },
    { title: '第十二條 契約分存', mappedFieldKeys: ['copyRetentionHolder'] },
    { title: '第十九條 附件及特約', mappedFieldKeys: ['transcriptAttachmentNote', 'riskNotes'] },
  ],
  fieldMappings: [
    { key: 'contractDate', label: '契約審閱日期', placeholder: '{{contractDate}}', sourcePath: 'contractDate', required: false },
    { key: 'sellerName', label: '賣方姓名', placeholder: '{{sellerName}}', sourcePath: 'sellerName', required: true },
    { key: 'buyerName', label: '買方姓名', placeholder: '{{buyerName}}', sourcePath: 'buyerName', required: true },
    { key: 'agentName', label: '仲介經紀人', placeholder: '{{agentName}}', sourcePath: 'agentName', required: false },
    { key: 'brokerName', label: '仲介公司', placeholder: '{{brokerName}}', sourcePath: 'brokerName', required: false },
    { key: 'scrivenerName', label: '代書／地政士', placeholder: '{{scrivenerName}}', sourcePath: 'scrivenerName', required: false },
    { key: 'propertyAddress', label: '買賣標的地址', placeholder: '{{propertyAddress}}', sourcePath: 'propertyAddress', required: true },
    { key: 'buildingNumber', label: '建號', placeholder: '{{buildingNumber}}', sourcePath: 'buildingNumber', required: false },
    { key: 'landNumbers', label: '土地地號', placeholder: '{{landNumbers}}', sourcePath: 'landNumbers', required: false },
    { key: 'salePriceTotal', label: '買賣總價', placeholder: '{{salePriceTotal}}', sourcePath: 'salePriceTotal', required: true },
    { key: 'landPrice', label: '土地價款', placeholder: '{{landPrice}}', sourcePath: 'landPrice', required: false },
    { key: 'buildingPrice', label: '建物價款', placeholder: '{{buildingPrice}}', sourcePath: 'buildingPrice', required: false },
    { key: 'parkingLandPrice', label: '車位土地價款', placeholder: '{{parkingLandPrice}}', sourcePath: 'parkingLandPrice', required: false },
    { key: 'parkingBuildingPrice', label: '車位建物價款', placeholder: '{{parkingBuildingPrice}}', sourcePath: 'parkingBuildingPrice', required: false },
    { key: 'paymentSchedule', label: '付款約定', placeholder: '{{paymentSchedule}}', sourcePath: 'paymentSchedule', required: true },
    { key: 'handoverDate', label: '交屋日', placeholder: '{{handoverDate}}', sourcePath: 'handoverDate', required: false },
    { key: 'ownershipTransferDate', label: '所有權移轉日', placeholder: '{{ownershipTransferDate}}', sourcePath: 'ownershipTransferDate', required: false },
    { key: 'taxAllocation', label: '稅費負擔', placeholder: '{{taxAllocation}}', sourcePath: 'taxAllocation', required: false },
    { key: 'registrationFeeAllocation', label: '登記規費分擔', placeholder: '{{registrationFeeAllocation}}', sourcePath: 'registrationFeeAllocation', required: false },
    { key: 'brokerFeeAllocation', label: '仲介費分擔', placeholder: '{{brokerFeeAllocation}}', sourcePath: 'brokerFeeAllocation', required: false },
    { key: 'escrowMethod', label: '履約保證／價金保管方式', placeholder: '{{escrowMethod}}', sourcePath: 'escrowMethod', required: false },
    { key: 'occupiedByOthersCondition', label: '建物被他人占用情形', placeholder: '{{occupiedByOthersCondition}}', sourcePath: 'occupiedByOthersCondition', required: false },
    { key: 'encroachmentCondition', label: '占用他人土地情形', placeholder: '{{encroachmentCondition}}', sourcePath: 'encroachmentCondition', required: false },
    { key: 'leaseBorrowCondition', label: '出租或出借情形', placeholder: '{{leaseBorrowCondition}}', sourcePath: 'leaseBorrowCondition', required: false },
    { key: 'copyRetentionHolder', label: '副本留存人', placeholder: '{{copyRetentionHolder}}', sourcePath: 'copyRetentionHolder', required: false },
    { key: 'defaultClauseSummary', label: '特約條款摘要', placeholder: '{{defaultClauseSummary}}', sourcePath: 'defaultClauseSummary', required: false },
    { key: 'deliveryCondition', label: '點交現況', placeholder: '{{deliveryCondition}}', sourcePath: 'deliveryCondition', required: false },
    { key: 'transcriptSections', label: '謄本摘要區塊', placeholder: '{{transcriptSections}}', sourcePath: 'transcriptSections', required: true },
    { key: 'transcriptAttachmentNote', label: '謄本附件說明', placeholder: '{{transcriptAttachmentNote}}', sourcePath: 'transcriptAttachmentNote', required: false },
    { key: 'riskNotes', label: '風險備註', placeholder: '{{riskNotes}}', sourcePath: 'riskNotes', required: false },
  ],
};

const definitions: Record<ContractType, ContractTemplateDefinition> = {
  lease: leaseDefinition,
  sale: saleDefinition,
};

export function getContractTemplateDefinition(contractType: ContractType) {
  return definitions[contractType];
}

export function listContractTemplateDefinitions() {
  return Object.values(definitions);
}