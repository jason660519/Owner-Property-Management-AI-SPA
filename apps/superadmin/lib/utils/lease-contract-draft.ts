// filepath: apps/superadmin/lib/utils/lease-contract-draft.ts
// Lease agreement draft generator — pure function returning sections + full text.

import type { BuildingTranscriptData, LandTranscriptData } from '@/lib/types/properties';

export type ContractSectionKey =
  | 'parties'
  | 'object'
  | 'term'
  | 'rent'
  | 'restrictions'
  | 'use_and_maintenance'
  | 'termination'
  | 'others';

export interface ContractSection {
  key: ContractSectionKey;
  title: string;
  body: string;
}

export interface LeaseContractDraftVariables {
  contractNumber: string;
  contractDate: string;
  landlordName: string;
  tenantName: string;
  fullAddress: string;
  buildingNumber?: string;
  landNumber?: string;
  totalAreaPing?: number;
  landAreaPing?: number;
  monthlyRent?: number;
  depositAmount?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  paymentDueDay?: number;
  parkingSpaces?: number;
  restrictionsSummary?: string;
}

export interface LeaseContractDraft {
  variables: LeaseContractDraftVariables;
  sections: ContractSection[];
  fullText: string;
}

function sqmToPing(value: number | undefined | null): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Math.round(value * 0.3025 * 100) / 100;
}

function buildRestrictionsSummary(
  buildingTranscript?: BuildingTranscriptData | null,
  landTranscript?: LandTranscriptData | null,
): string {
  // For now, use a conservative, human‑editable summary.
  if (!buildingTranscript && !landTranscript) {
    return '依謄本記載，目前無特別揭露之他項權利，若有以登記機關謄本為準。';
  }

  const notes: string[] = [];

  if (buildingTranscript?.encumbrances && buildingTranscript.encumbrances.length > 0) {
    const first = buildingTranscript.encumbrances[0];
    notes.push(
      `建物謄本他項權利部記載有「${first.encumbranceType || '他項權利'}」，權利人為「${
        first.creditorName || '（詳謄本）'
      }」，擔保債權總金額約為「${first.totalDebt || '（詳謄本）'}」。`,
    );
  }

  if (landTranscript?.encumbrances && landTranscript.encumbrances.length > 0) {
    const first = landTranscript.encumbrances[0];
    notes.push(
      `土地謄本他項權利部記載有「${first.encumbranceType || '他項權利'}」，權利人為「${
        first.creditorName || '（詳謄本）'
      }」，擔保債權總金額約為「${first.totalDebt || '（詳謄本）'}」。`,
    );
  }

  if (notes.length === 0) {
    return '經查建物及土地謄本，目前未見特別記載之他項權利，然最終仍以登記機關謄本為準。';
  }

  return notes.join(' ');
}

export function buildLeaseContractDraft(params: {
  contractNumber: string;
  contractDate: string;
  landlordName: string;
  tenantName: string;
  fullAddress: string;
  monthlyRent: number;
  depositAmount: number;
  leaseStartDate: string;
  leaseEndDate: string;
  paymentDueDay: number;
  parkingSpaces?: number;
  buildingTranscript?: BuildingTranscriptData | null;
  landTranscript?: LandTranscriptData | null;
}): LeaseContractDraft {
  const totalAreaSqmRaw =
    params.buildingTranscript?.description.totalArea &&
    Number.parseFloat(String(params.buildingTranscript.description.totalArea).replace(/[^\d.]/g, ''));
  const totalAreaPing = sqmToPing(
    Number.isFinite(totalAreaSqmRaw as number) ? (totalAreaSqmRaw as number) : undefined,
  );

  const landAreaSqmRaw =
    params.landTranscript?.description.area &&
    Number.parseFloat(String(params.landTranscript.description.area).replace(/[^\d.]/g, ''));
  const landAreaPing = sqmToPing(
    Number.isFinite(landAreaSqmRaw as number) ? (landAreaSqmRaw as number) : undefined,
  );

  const variables: LeaseContractDraftVariables = {
    contractNumber: params.contractNumber,
    contractDate: params.contractDate,
    landlordName: params.landlordName,
    tenantName: params.tenantName,
    fullAddress: params.fullAddress,
    buildingNumber: params.buildingTranscript?.description.buildingNumber,
    landNumber: params.landTranscript?.description.landNumber,
    totalAreaPing,
    landAreaPing,
    monthlyRent: params.monthlyRent,
    depositAmount: params.depositAmount,
    leaseStartDate: params.leaseStartDate,
    leaseEndDate: params.leaseEndDate,
    paymentDueDay: params.paymentDueDay,
    parkingSpaces: params.parkingSpaces,
    restrictionsSummary: buildRestrictionsSummary(
      params.buildingTranscript,
      params.landTranscript,
    ),
  };

  const sections: ContractSection[] = [];

  sections.push({
    key: 'parties',
    title: '第一條 當事人',
    body: [
      `一、出租人（以下稱甲方）：${variables.landlordName}。`,
      `二、承租人（以下稱乙方）：${variables.tenantName}。`,
      '',
      '甲乙雙方就下列房屋租賃事宜，本於誠信原則與相關法令之規定訂立本契約，並共同遵守之。',
    ].join('\n'),
  });

  const objectLines: string[] = [];
  objectLines.push(`一、租賃標的為位於 ${variables.fullAddress} 之房屋（以下稱本件房屋）。`);
  if (variables.buildingNumber || variables.landNumber) {
    const bn = variables.buildingNumber ? `建號：${variables.buildingNumber}` : '';
    const ln = variables.landNumber ? `土地地號：${variables.landNumber}` : '';
    objectLines.push(
      `二、本件房屋之建號及土地地號如下：${[bn, ln].filter(Boolean).join('；')}，其範圍及權利內容悉依地政機關登記及謄本記載。`,
    );
  }
  if (variables.totalAreaPing) {
    objectLines.push(
      `三、本件房屋建物面積約為 ${variables.totalAreaPing} 坪（實際以謄本及相關登記資料為準）。`,
    );
  }
  if (variables.landAreaPing) {
    objectLines.push(
      `四、本件房屋所坐落土地持分面積約為 ${variables.landAreaPing} 坪（實際以謄本及相關登記資料為準）。`,
    );
  }
  if (variables.parkingSpaces && variables.parkingSpaces > 0) {
    objectLines.push(
      `五、本件租賃包含車位 ${variables.parkingSpaces} 個，其位置及使用方式由雙方另行約定之。`,
    );
  }

  sections.push({
    key: 'object',
    title: '第二條 租賃標的',
    body: objectLines.join('\n'),
  });

  sections.push({
    key: 'term',
    title: '第三條 租賃期間',
    body: [
      `一、本契約租賃期間自 ${variables.leaseStartDate} 起至 ${variables.leaseEndDate} 止，`,
      '   共計依實際起迄日計算之年數及月數，雙方得於契約屆滿前依約定協商是否續約。',
      '二、如乙方有續租意願，應於租期屆滿前一個月以書面或其他可得證明之方式通知甲方；',
      '   甲方同意續租時，雙方得就租金及其他條件另行協議續約事宜。',
    ].join('\n'),
  });

  sections.push({
    key: 'rent',
    title: '第四條 租金及押金',
    body: [
      `一、本件房屋月租金為新臺幣 ${variables.monthlyRent ?? 0} 元整（下稱租金）。`,
      `二、乙方應於每月 ${variables.paymentDueDay ?? 5} 日前，將當月租金以現金匯款或雙方約定之方式支付予甲方指定帳戶。`,
      `三、乙方應於簽訂本契約時給付押金新臺幣 ${variables.depositAmount ?? 0} 元整（約相當於數月租金，確切金額依本條約定為準）。`,
      '四、乙方如有遲延給付租金之情形，每逾一日，乙方應按當期應付租金千分之三計付違約金；',
      '   遲延逾一定期間或累計次數達一定標準時，甲方得依本契約及相關法令終止契約。',
      '五、乙方如無積欠租金、違約金及其他應付款項，並於租賃關係終止或契約終止後依約返還房屋且無損害，',
      '   甲方應自實際返還房屋之日起一定期間內，無息返還押金予乙方。',
    ].join('\n'),
  });

  sections.push({
    key: 'restrictions',
    title: '第五條 權利負擔及限制登記',
    body: [
      '一、甲方聲明本件房屋及其坐落土地之所有權屬甲方所有，或甲方已取得合法出租權限。',
      `二、經查謄本記載，本件房屋及土地之他項權利及限制登記事項如下：${variables.restrictionsSummary}`,
      '三、前項所述之他項權利及限制登記事項，如有不實或未據實揭露，致乙方權益受有重大影響，',
      '   乙方得請求甲方負擔因此所生之一切損害賠償責任，並得依法終止契約。',
    ].join('\n'),
  });

  sections.push({
    key: 'use_and_maintenance',
    title: '第六條 使用管理及修繕',
    body: [
      '一、乙方應善良管理人之注意義務使用本件房屋，並遵守公寓大廈管理規約及相關管委會規定。',
      '二、因正常使用所生之必要小修繕，由乙方負責；其餘因非乙方可歸責事由所生之重大修繕，則由甲方負責。',
      '三、乙方如擬變更房屋用途、增改建、設定轉租或提供第三人使用，應事先徵得甲方書面同意。',
    ].join('\n'),
  });

  sections.push({
    key: 'termination',
    title: '第七條 契約終止與返還',
    body: [
      '一、乙方有下列情形之一者，甲方得催告限期改善，屆期仍未改善者，得終止本契約並請求乙方返還房屋：',
      '   （一）連續遲延給付租金達二期以上者。',
      '   （二）擅自變更用途、轉租或供第三人使用，經制止仍不改善者。',
      '   （三）其他重大違反本契約約定，致甲方權益受損者。',
      '二、租賃關係終止時，乙方應將本件房屋連同附屬設備及約定交付之物品完好返還予甲方（正常使用所致合理耗損除外）。',
    ].join('\n'),
  });

  sections.push({
    key: 'others',
    title: '第八條 其他約定',
    body: [
      '一、本契約未約定事項，悉依中華民國相關法令及一般租賃慣例辦理。',
      '二、本契約一式貳份，甲乙雙方各執壹份為憑。',
      '三、本契約經雙方簽名或蓋章後生效。',
    ].join('\n'),
  });

  const fullText = sections
    .map((s) => `${s.title}\n${s.body}`)
    .join('\n\n');

  return {
    variables,
    sections,
    fullText,
  };
}

