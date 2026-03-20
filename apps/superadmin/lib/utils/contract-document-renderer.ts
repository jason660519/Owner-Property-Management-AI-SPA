import JSZip from 'jszip';
import type { ContractDraft } from '@/lib/types/contracts';
import { buildContractTemplateTokenMap } from '@/lib/utils/contract-template-token-map';
import {
  applyContractTemplateTokens,
  getContractTokenizedTemplate,
} from '@/lib/utils/contract-tokenized-templates';

interface RenderContractDocumentDocxOptions {
  templateDocxBytes?: ArrayBuffer | Uint8Array;
}

interface OfficialTemplateRenderResult {
  documentXml: string;
  didApplyInlineTemplate: boolean;
}

const PRINT_CSS = `
@page { size: A4; margin: 20mm 25mm; }
body {
  font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
  color: #111827;
  line-height: 1.8;
  font-size: 11pt;
}
h1 {
  text-align: center;
  font-size: 20pt;
  font-weight: bold;
  letter-spacing: 4px;
  margin: 0 0 8px;
}
h2 {
  font-size: 12pt;
  font-weight: bold;
  margin: 24px 0 6px;
}
h3 {
  font-size: 11pt;
  font-weight: bold;
  margin: 16px 0 6px;
}
p { margin: 0 0 6px; }
ol { margin: 4px 0 8px; padding-left: 24px; }
ol li { margin-bottom: 4px; }
.header-info {
  text-align: center;
  font-size: 9pt;
  color: #6b7280;
  margin-bottom: 4px;
}
.muted { color: #6b7280; font-size: 9pt; }
.review-section {
  border: 1px solid #374151;
  padding: 10px 14px;
  margin: 16px 0;
}
.summary {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
.summary th,
.summary td,
.schedule th,
.schedule td,
.attachments th,
.attachments td {
  border: 1px solid #374151;
  padding: 6px 10px;
  vertical-align: top;
}
.summary th,
.schedule th,
.attachments th {
  width: 160px;
  background: #f3f4f6;
  text-align: left;
  font-weight: 600;
}
.schedule,
.attachments {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.section-card {
  border: 1px solid #d1d5db;
  padding: 10px 12px;
  margin-top: 8px;
  background: #fafafa;
}
.signature-section {
  margin-top: 32px;
}
.signature-block {
  border: 1px solid #374151;
  min-height: 100px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.signature-block p { margin: 4px 0; }
.signature-date {
  text-align: center;
  margin-top: 32px;
  letter-spacing: 2px;
}
/* Backward compat for lease template */
.signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}
.signature-box {
  border: 1px solid #374151;
  min-height: 100px;
  padding: 12px 16px;
}
.risk {
  margin-top: 16px;
  border: 1px solid #f59e0b;
  background: #fff7ed;
  padding: 12px;
}
`;

function escapeHtml(value: string | number | undefined | null) {
  if (value == null) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtmlDocument(title: string, content: string) {
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-Hant">',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${PRINT_CSS}</style>`,
    '</head>',
    '<body>',
    content,
    '</body>',
    '</html>',
  ].join('');
}

function renderContractDocumentBody(draft: ContractDraft) {
  const template = getContractTokenizedTemplate(draft.contractType);
  const tokenMap = buildContractTemplateTokenMap(draft);
  const content = applyContractTemplateTokens(template, tokenMap)
    .replace(/<p><\/p>/g, '')
    .replace(/\n\s*\n/g, '\n');

  return {
    content,
    title: tokenMap['{{templateDisplayTitle}}'] || '契約草稿',
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripXmlTags(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearchText(value: string) {
  return value.replace(/[\s　]+/g, '');
}

function buildWordTextRun(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return '<w:r><w:t xml:space="preserve"></w:t></w:r>';
  }

  return lines.map((line, index) => {
    const escapedLine = escapeXml(line);
    const breakNode = index === lines.length - 1 ? '' : '<w:br/>';
    return `<w:r><w:t xml:space="preserve">${escapedLine}</w:t>${breakNode}</w:r>`;
  }).join('');
}

function extractParagraphProperties(paragraphXml: string) {
  const propertiesMatch = paragraphXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
  return propertiesMatch?.[0] ?? '';
}

function buildParagraphWithOriginalStyle(paragraphXml: string, text: string) {
  return `<w:p>${extractParagraphProperties(paragraphXml)}${buildWordTextRun(text)}</w:p>`;
}

function formatRocDate(input?: string) {
  if (!input) return '中華民國　　　年　　　月　　　日';

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return escapeXml(input);
  }

  const rocYear = parsed.getFullYear() - 1911;
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `中華民國${rocYear}年${month}月${day}日`;
}

function formatOfficialCurrency(value: number | undefined) {
  if (value == null) return '　　　　　　';

  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSalePropertySummary(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return [
    `買賣標的：${draft.propertyAddress}`,
    draft.transcriptSections.landDescription?.content
      ? `土地標示：${draft.transcriptSections.landDescription.content}`
      : draft.landNumbers?.length
        ? `土地標示：${draft.landNumbers.join('、')}`
        : '',
    draft.transcriptSections.landOwnership?.content
      ? `土地權利：${draft.transcriptSections.landOwnership.content}`
      : '',
    draft.transcriptSections.buildingDescription?.content
      ? `建物標示：${draft.transcriptSections.buildingDescription.content}`
      : draft.buildingNumber
        ? `建物標示：建號 ${draft.buildingNumber}`
        : '',
    draft.transcriptSections.buildingOwnership?.content
      ? `建物權利：${draft.transcriptSections.buildingOwnership.content}`
      : '',
    draft.parkingInfo ? `停車位：${draft.parkingInfo}` : '',
    draft.deliveryCondition
      ? `交付現況：${draft.deliveryCondition}`
      : '交付現況：以雙方建物現況確認書及點交內容為準。',
  ].filter(Boolean).join('\n');
}

function formatOfficialCurrencyOrPending(value: number | undefined) {
  return value == null ? '待補' : formatOfficialCurrency(value);
}

function buildSaleClauseTwoParagraphs(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return [
    `本買賣總價款為新台幣 ${formatOfficialCurrency(draft.salePriceTotal)} 元整。土地、建物及車位價款分別如下：`,
    `一、土地價款：新台幣 ${formatOfficialCurrencyOrPending(draft.landPrice)} 元整。`,
    `二、建物價款：新台幣 ${formatOfficialCurrencyOrPending(draft.buildingPrice)} 元整。`,
    `三、車位價款：土地部分新台幣 ${formatOfficialCurrencyOrPending(draft.parkingLandPrice)} 元整。`,
    `建物部分新台幣 ${formatOfficialCurrencyOrPending(draft.parkingBuildingPrice)} 元整。`,
  ];
}

function buildSaleClauseSevenParagraphs(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return [
    draft.taxAllocation
      ? `稅費負擔：${draft.taxAllocation}`
      : '本買賣標的物應繳納之地價稅、房屋稅、水電費、瓦斯費、管理費、公共基金等稅費，以點交日為準按雙方約定分擔。',
    draft.registrationFeeAllocation
      ? `登記規費：${draft.registrationFeeAllocation}`
      : '辦理產權移轉時、抵押權設定登記應納之印花稅、登記規費、火災保險費、建物契稅等，由雙方依約分擔。',
    '土地增值稅、契稅或其他依法應繳之稅負，如因可歸責於一方之遲延或未履約事由而增加者，應由該方負擔。',
    '工程受益費、管理費與其他未到期費用，除法令另有規定外，依雙方書面約定與點交日比例計算。',
  ];
}

function buildSaleClauseFiveParagraph(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return `價金履約／保管方式：${draft.escrowMethod}`;
}

function buildSaleClauseSixParagraph(
  draft: Extract<ContractDraft, { contractType: 'sale' }>,
  ownershipTransferDateText: string,
) {
  const scrivenerSegment = draft.scrivenerName
    ? `，並交由${draft.scrivenerName}專責辦理。`
    : '。';

  return `雙方應於備證款付款同時備齊過戶文件，所有權移轉預定日為${ownershipTransferDateText}${scrivenerSegment}`;
}

function buildSaleClauseElevenLine(label: string, value: string) {
  return `${label}${value}`;
}

function buildSaleClauseTwelveCopyParagraph(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return `本契約壹式兩份，雙方各執乙份為憑。副本由${draft.copyRetentionHolder}留存。`;
}

function buildLeaseClauseFourteenParagraphs(draft: Extract<ContractDraft, { contractType: 'lease' }>) {
  if (draft.holdoverPenaltyMultiple == null) {
    return null;
  }

  return [
    '租賃契約終止時，承租人應即將房屋返還出租人，不應藉詞推諉或主張任何權利。',
    `承租人未即時遷出返還房屋時，出租人每月得向承租人請求按照月租金${draft.holdoverPenaltyMultiple}倍支付違約金至遷讓完竣，承租人及保證人不得有異議。`,
  ];
}

function buildLeaseClauseNineParagraph(draft: Extract<ContractDraft, { contractType: 'lease' }>) {
  const usePurpose = draft.usePurpose === 'residential'
    ? '住宅'
    : draft.usePurpose === 'office'
      ? '辦公'
      : draft.usePurpose === 'commercial'
        ? '商業'
        : draft.usePurpose === 'other'
          ? '其他'
          : null;

  if (!usePurpose) {
    return null;
  }

  return `本房屋係供${usePurpose}之使用。`;
}

function buildLeaseClauseTwentyFourParagraph(draft: Extract<ContractDraft, { contractType: 'lease' }>) {
  return `本契約書壹式${draft.contractCopiesCount ?? 2}份，由立契約人各執乙份，以昭信守。`;
}

function buildSaleSignatureParagraphs(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  return [
    `買方：${draft.buyerName} 簽章`,
    '國民身分證統一編號：',
    '地址：',
    '電話：',
    `賣方：${draft.sellerName} 簽章`,
    '國民身分證統一編號：',
    '地址：',
    '電話：',
    '見證人',
    '姓名： 簽章',
    '國民身分證統一編號：',
    '地址：',
    '電話：',
    '姓名： 簽章',
    '國民身分證統一編號：',
    '地址：',
    '電話：',
    formatRocDate(draft.contractDate),
  ];
}

function buildSaleBrokerClauseParagraph(draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  const details = [
    draft.brokerName ? `經紀業：${draft.brokerName}` : '',
    draft.agentName ? `經紀人：${draft.agentName}` : '',
  ].filter(Boolean).join('；');

  if (!details) {
    return '十三、買賣若透過仲介業務之公司（或商號）辦理者，應由該公司指派經紀人於本契約簽章。（不動產經紀業管理條例第二十二條）';
  }

  return `十三、買賣若透過仲介業務之公司（或商號）辦理者，應由該公司指派經紀人於本契約簽章。（不動產經紀業管理條例第二十二條）\n${details}`;
}

function replaceParagraphByNeedle(
  documentXml: string,
  needle: string,
  replacementText: string,
  options: { exactNormalized?: boolean } = {},
) {
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g));
  const normalizedNeedle = normalizeSearchText(needle);

  for (const match of paragraphs) {
    const paragraphXml = match[0];
    const paragraphText = stripXmlTags(paragraphXml);

    const didMatch = options.exactNormalized
      ? normalizeSearchText(paragraphText) === normalizedNeedle
      : normalizeSearchText(paragraphText).includes(normalizedNeedle);

    if (!didMatch) {
      continue;
    }

    return {
      didReplace: true,
      documentXml: documentXml.replace(paragraphXml, buildParagraphWithOriginalStyle(paragraphXml, replacementText)),
    };
  }

  return {
    didReplace: false,
    documentXml,
  };
}

function replaceParagraphAfterNeedle(
  documentXml: string,
  needle: string,
  replacementText: string,
  options: { exactNormalized?: boolean } = {},
) {
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g));
  const normalizedNeedle = normalizeSearchText(needle);

  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    const anchorParagraphXml = paragraphs[index][0];
    const anchorText = stripXmlTags(anchorParagraphXml);

    const didMatch = options.exactNormalized
      ? normalizeSearchText(anchorText) === normalizedNeedle
      : normalizeSearchText(anchorText).includes(normalizedNeedle);

    if (!didMatch) {
      continue;
    }

    const targetParagraphXml = paragraphs[index + 1][0];
    return {
      didReplace: true,
      documentXml: documentXml.replace(targetParagraphXml, buildParagraphWithOriginalStyle(targetParagraphXml, replacementText)),
    };
  }

  return {
    didReplace: false,
    documentXml,
  };
}

function replaceParagraphsAfterNeedle(
  documentXml: string,
  needle: string,
  replacementTexts: string[],
  options: { exactNormalized?: boolean } = {},
) {
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g));
  const normalizedNeedle = normalizeSearchText(needle);

  for (let index = 0; index < paragraphs.length - replacementTexts.length; index += 1) {
    const anchorParagraphXml = paragraphs[index][0];
    const anchorText = stripXmlTags(anchorParagraphXml);

    const didMatch = options.exactNormalized
      ? normalizeSearchText(anchorText) === normalizedNeedle
      : normalizeSearchText(anchorText).includes(normalizedNeedle);

    if (!didMatch) {
      continue;
    }

    let nextDocumentXml = documentXml;
    let didReplaceAll = true;

    for (let replacementIndex = 0; replacementIndex < replacementTexts.length; replacementIndex += 1) {
      const targetParagraphXml = paragraphs[index + replacementIndex + 1][0];
      if (!targetParagraphXml) {
        didReplaceAll = false;
        break;
      }

      nextDocumentXml = nextDocumentXml.replace(
        targetParagraphXml,
        buildParagraphWithOriginalStyle(targetParagraphXml, replacementTexts[replacementIndex]),
      );
    }

    return {
      didReplace: didReplaceAll,
      documentXml: nextDocumentXml,
    };
  }

  return {
    didReplace: false,
    documentXml,
  };
}

function applyTemplateLeaseParagraphReplacements(documentXml: string, draft: Extract<ContractDraft, { contractType: 'lease' }>) {
  const replacements: Array<{ type: 'self' | 'next'; needle: string; text: string }> = [
    {
      type: 'self',
      needle: '房屋租賃契約書範本',
      text: '房屋租賃契約書草稿',
    },
    {
      type: 'next',
      needle: '契約審閱權',
      text: `${formatRocDate(draft.contractDate)}經承租人攜回審閱（契約審閱期間至少為3日）\n出租人簽章：${draft.ownerName}\n承租人簽章：${draft.tenantName}`,
    },
    {
      type: 'self',
      needle: '立契約書人',
      text: `立契約書人\n出租人 ${draft.ownerName}\n承租人 ${draft.tenantName}`,
    },
    {
      type: 'next',
      needle: '第一條',
      text: [
        `房屋標示：${draft.propertyAddress}`,
        draft.buildingNumber ? `建號：${draft.buildingNumber}` : '',
        draft.landNumber ? `土地地號：${draft.landNumber}` : '',
        '租賃範圍：以目前建物現況、謄本記載及雙方點交內容為準。',
      ].filter(Boolean).join('\n'),
    },
    {
      type: 'next',
      needle: '第二條',
      text: draft.includedItems?.length
        ? `租賃附屬設備：${draft.includedItems.join('、')}`
        : '租賃附屬設備：依交屋現況與雙方點交確認內容為準。',
    },
    {
      type: 'next',
      needle: '第三條',
      text: `租賃期間自${formatRocDate(draft.leaseStartDate)}起至${formatRocDate(draft.leaseEndDate)}止。`,
    },
    {
      type: 'next',
      needle: '第四條',
      text: `每月應繳月租金新台幣 ${formatOfficialCurrency(draft.monthlyRent)} 元整，並於每月 ${draft.paymentDueDay ?? '　'} 日前支付。`,
    },
    {
      type: 'next',
      needle: '第五條',
      text: `擔保金新台幣 ${formatOfficialCurrency(draft.depositAmount)} 元整。承租人應於簽訂本契約之同時給付出租人。`,
    },
    {
      type: 'next',
      needle: '第十六條',
      text: [
        draft.specialTerms ? `其他特約：${draft.specialTerms}` : '',
        draft.buildingOwnershipSummary ? `建物所有權摘要：${draft.buildingOwnershipSummary}` : '',
        draft.landOwnershipSummary ? `土地所有權摘要：${draft.landOwnershipSummary}` : '',
        draft.encumbranceSummary ? `他項權利摘要：${draft.encumbranceSummary}` : '',
        draft.transcriptAttachmentNote ?? '',
      ].filter(Boolean).join('\n'),
    },
  ];

  let nextDocumentXml = documentXml;
  let appliedCount = 0;

  for (const replacement of replacements) {
    const result = replacement.type === 'self'
      ? replaceParagraphByNeedle(nextDocumentXml, replacement.needle, replacement.text)
      : replaceParagraphAfterNeedle(nextDocumentXml, replacement.needle, replacement.text);

    nextDocumentXml = result.documentXml;
    if (result.didReplace) {
      appliedCount += 1;
    }
  }

  const landlordSignatureResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '出租人：　　　　　　　　（簽章）',
    `出租人：${draft.ownerName}（簽章）`,
    { exactNormalized: true },
  );

  nextDocumentXml = landlordSignatureResult.documentXml;
  if (landlordSignatureResult.didReplace) {
    appliedCount += 1;
  }

  const tenantSignatureResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '承租人：　　　　　　　　（簽章）',
    `承租人：${draft.tenantName}（簽章）`,
    { exactNormalized: true },
  );

  nextDocumentXml = tenantSignatureResult.documentXml;
  if (tenantSignatureResult.didReplace) {
    appliedCount += 1;
  }

  const contractDateSignatureResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '中　　　華　　　民　　　國　　　　　年　　　　　月　　　　　日',
    formatRocDate(draft.contractDate),
    { exactNormalized: true },
  );

  nextDocumentXml = contractDateSignatureResult.documentXml;
  if (contractDateSignatureResult.didReplace) {
    appliedCount += 1;
  }

  const contractCopiesResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '本契約書壹式',
    buildLeaseClauseTwentyFourParagraph(draft),
  );

  nextDocumentXml = contractCopiesResult.documentXml;
  if (contractCopiesResult.didReplace) {
    appliedCount += 1;
  }

  const clauseNineParagraph = buildLeaseClauseNineParagraph(draft);
  if (clauseNineParagraph) {
    const clauseNineResult = replaceParagraphAfterNeedle(
      nextDocumentXml,
      '第九條',
      clauseNineParagraph,
    );

    nextDocumentXml = clauseNineResult.documentXml;
    if (clauseNineResult.didReplace) {
      appliedCount += 1;
    }
  }

  const clauseFourteenParagraphs = buildLeaseClauseFourteenParagraphs(draft);
  if (clauseFourteenParagraphs) {
    const clauseFourteenNarrativeResult = replaceParagraphAfterNeedle(
      nextDocumentXml,
      '第十四條',
      clauseFourteenParagraphs[0],
    );

    nextDocumentXml = clauseFourteenNarrativeResult.documentXml;
    if (clauseFourteenNarrativeResult.didReplace) {
      appliedCount += 1;
    }

    const clauseFourteenPenaltyResult = replaceParagraphByNeedle(
      nextDocumentXml,
      '倍支付違約金至遷讓完竣',
      clauseFourteenParagraphs[1],
    );

    nextDocumentXml = clauseFourteenPenaltyResult.documentXml;
    if (clauseFourteenPenaltyResult.didReplace) {
      appliedCount += 1;
    }
  }

  return {
    documentXml: nextDocumentXml,
    didApplyInlineTemplate: appliedCount >= 6,
  };
}

function applyTemplateSaleParagraphReplacements(documentXml: string, draft: Extract<ContractDraft, { contractType: 'sale' }>) {
  const paymentSummary = draft.paymentSchedule
    .map((item) => `${item.label}：${formatOfficialCurrency(item.amount)} 元，${item.dueDate || '待補'}`)
    .join('；');

  const paymentMilestoneMap = new Map(draft.paymentSchedule.map((item) => [item.label, item]));
  const contractDateText = formatRocDate(draft.contractDate);
  const ownershipTransferDateText = draft.ownershipTransferDate ? formatRocDate(draft.ownershipTransferDate) : '待補';
  const handoverDateText = draft.handoverDate ? formatRocDate(draft.handoverDate) : '待補';

  const replacements: Array<{ type: 'self' | 'next'; needle: string; text: string }> = [
    {
      type: 'self',
      needle: '成　屋　買',
      text: '成屋買賣契約書草稿',
    },
    {
      type: 'next',
      needle: '契約審',
      text: `${formatRocDate(draft.contractDate)}經買方攜回審閱五日（契約審閱期間至少五日）\n買方簽章：${draft.buyerName}\n賣方簽章：${draft.sellerName}`,
    },
    {
      type: 'self',
      needle: '立契約書人',
      text: `立契約書人\n買方 ${draft.buyerName}\n賣方 ${draft.sellerName}`,
    },
    {
      type: 'next',
      needle: '第一條',
      text: buildSalePropertySummary(draft),
    },
    {
      type: 'next',
      needle: '第三條',
      text: paymentSummary,
    },
    {
      type: 'next',
      needle: '第六條',
      text: buildSaleClauseSixParagraph(draft, draft.ownershipTransferDate || '待補'),
    },
    {
      type: 'next',
      needle: '第八條',
      text: `交屋日：${draft.handoverDate || '待補'}。${draft.transcriptAttachmentNote ?? ''}`,
    },
  ];

  let nextDocumentXml = documentXml;
  let appliedCount = 0;

  for (const replacement of replacements) {
    const result = replacement.type === 'self'
      ? replaceParagraphByNeedle(nextDocumentXml, replacement.needle, replacement.text)
      : replaceParagraphAfterNeedle(nextDocumentXml, replacement.needle, replacement.text);

    nextDocumentXml = result.documentXml;
    if (result.didReplace) {
      appliedCount += 1;
    }
  }

  const clauseTwoResult = replaceParagraphsAfterNeedle(
    nextDocumentXml,
    '第二條',
    buildSaleClauseTwoParagraphs(draft),
  );

  nextDocumentXml = clauseTwoResult.documentXml;
  if (clauseTwoResult.didReplace) {
    appliedCount += 1;
  }

  if (draft.escrowMethod) {
    const clauseFiveResult = replaceParagraphAfterNeedle(
      nextDocumentXml,
      '第五條',
      buildSaleClauseFiveParagraph(draft),
    );

    nextDocumentXml = clauseFiveResult.documentXml;
    if (clauseFiveResult.didReplace) {
      appliedCount += 1;
    }
  }

  const clauseSevenResult = replaceParagraphsAfterNeedle(
    nextDocumentXml,
    '第七條',
    buildSaleClauseSevenParagraphs(draft),
  );

  nextDocumentXml = clauseSevenResult.documentXml;
  if (clauseSevenResult.didReplace) {
    appliedCount += 1;
  }

  const clauseSevenFeeIntroResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '本買賣契約有關之稅費、代辦費',
    `本買賣契約有關之稅費、代辦費：${draft.brokerFeeAllocation || '仲介費及代辦費依雙方書面約定辦理。'}`,
  );

  nextDocumentXml = clauseSevenFeeIntroResult.documentXml;
  if (clauseSevenFeeIntroResult.didReplace) {
    appliedCount += 1;
  }

  const signatureBlockResult = replaceParagraphsAfterNeedle(
    nextDocumentXml,
    '立契約人',
    buildSaleSignatureParagraphs(draft),
    { exactNormalized: true },
  );

  nextDocumentXml = signatureBlockResult.documentXml;
  if (signatureBlockResult.didReplace) {
    appliedCount += 1;
  }

  const brokerClauseResult = replaceParagraphByNeedle(
    nextDocumentXml,
    '十三、買賣若透過仲介業務之公司（或商號）辦理者，應由該公司指派經紀人於本契約簽章。（不動產經紀業管理條例第二十二條）',
    buildSaleBrokerClauseParagraph(draft),
    { exactNormalized: true },
  );

  nextDocumentXml = brokerClauseResult.documentXml;
  if (brokerClauseResult.didReplace) {
    appliedCount += 1;
  }

  const paymentRowDefinitions = [
    {
      label: '簽約款',
      detailText: `於簽訂本契約同時由買方支付之（本款項包括已收定金 ${formatOfficialCurrency(paymentMilestoneMap.get('簽約款')?.amount)} 元）。`,
    },
    {
      label: '備證款',
      detailText: `於${contractDateText}起，賣方備齊所有權移轉登記應備文件同時，本期價款由買方支付之。`,
    },
    {
      label: '完稅款',
      detailText: `於土地增值稅、契稅稅單核下後，本期價款由買方支付之；同時雙方應依約繳清稅款。`,
    },
    {
      label: '交屋款',
      detailText: `於${handoverDateText}點交建物；如已完成所有權移轉登記，本期價款由買方支付之。`,
    },
  ];

  for (const rowDefinition of paymentRowDefinitions) {
    const milestone = paymentMilestoneMap.get(rowDefinition.label);
    if (!milestone) {
      continue;
    }

    const rowResult = replaceParagraphsAfterNeedle(nextDocumentXml, rowDefinition.label, [
      `新臺幣${formatOfficialCurrency(milestone.amount)}元`,
      rowDefinition.detailText,
    ], { exactNormalized: true });

    nextDocumentXml = rowResult.documentXml;
    if (rowResult.didReplace) {
      appliedCount += 1;
    }
  }

  const clauseSixResult = replaceParagraphAfterNeedle(
    nextDocumentXml,
    '第六條',
    buildSaleClauseSixParagraph(draft, ownershipTransferDateText),
  );

  nextDocumentXml = clauseSixResult.documentXml;
  if (clauseSixResult.didReplace) {
    appliedCount += 1;
  }

  const clauseEightResult = replaceParagraphAfterNeedle(
    nextDocumentXml,
    '第八條',
    `交屋日：${handoverDateText}。${draft.transcriptAttachmentNote ?? ''}`,
  );

  nextDocumentXml = clauseEightResult.documentXml;
  if (clauseEightResult.didReplace) {
    appliedCount += 1;
  }

  const clauseElevenReplacements = [
    draft.occupiedByOthersCondition
      ? {
          needle: '建物被他人占用之情形：',
          text: buildSaleClauseElevenLine('建物被他人占用之情形：', draft.occupiedByOthersCondition),
        }
      : null,
    draft.encroachmentCondition
      ? {
          needle: '占用他人土地之情形：',
          text: buildSaleClauseElevenLine('占用他人土地之情形：', draft.encroachmentCondition),
        }
      : null,
    draft.leaseBorrowCondition
      ? {
          needle: '出租或出借情形：',
          text: buildSaleClauseElevenLine('出租或出借情形：', draft.leaseBorrowCondition),
        }
      : null,
  ].filter(Boolean) as Array<{ needle: string; text: string }>;

  for (const replacement of clauseElevenReplacements) {
    const result = replaceParagraphByNeedle(nextDocumentXml, replacement.needle, replacement.text, {
      exactNormalized: true,
    });

    nextDocumentXml = result.documentXml;
    if (result.didReplace) {
      appliedCount += 1;
    }
  }

  if (draft.copyRetentionHolder) {
    const clauseTwelveCopyResult = replaceParagraphByNeedle(
      nextDocumentXml,
      '本契約壹式兩份，雙方各執乙份為憑。副本由',
      buildSaleClauseTwelveCopyParagraph(draft),
    );

    nextDocumentXml = clauseTwelveCopyResult.documentXml;
    if (clauseTwelveCopyResult.didReplace) {
      appliedCount += 1;
    }
  }

  return {
    documentXml: nextDocumentXml,
    didApplyInlineTemplate: appliedCount >= 8,
  };
}

function tryRenderOfficialTemplateDocumentXml(documentXml: string, draft: ContractDraft): OfficialTemplateRenderResult {
  if (draft.contractType === 'lease') {
    return applyTemplateLeaseParagraphReplacements(documentXml, draft);
  }

  return applyTemplateSaleParagraphReplacements(documentXml, draft);
}

function getDefaultSectionProperties() {
  return [
    '<w:sectPr>',
    '<w:pgSz w:w="11906" w:h="16838"/>',
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>',
    '</w:sectPr>',
  ].join('');
}

function buildWordDocumentBody(title: string, sectionProperties: string) {
  return [
    '<w:body>',
    `<w:p><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`,
    '<w:altChunk r:id="htmlChunk"/>',
    sectionProperties,
    '</w:body>',
  ].join('');
}

function replaceWordDocumentBody(documentXml: string, title: string) {
  const sectionPropertiesMatch = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const nextBody = buildWordDocumentBody(title, sectionPropertiesMatch?.[0] ?? getDefaultSectionProperties());

  if (documentXml.includes('<w:body>')) {
    return documentXml.replace(/<w:body>[\s\S]*<\/w:body>/, nextBody);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    nextBody,
    '</w:document>',
  ].join('');
}

function ensureHtmlContentType(contentTypesXml: string) {
  if (contentTypesXml.includes('Extension="html"')) {
    return contentTypesXml;
  }

  return contentTypesXml.replace(
    '</Types>',
    '<Default Extension="html" ContentType="text/html"/></Types>',
  );
}

function ensureAltChunkRelationship(documentRelationshipsXml: string) {
  if (documentRelationshipsXml.includes('Target="afchunk.html"')) {
    return documentRelationshipsXml;
  }

  return documentRelationshipsXml.replace(
    '</Relationships>',
    '<Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/></Relationships>',
  );
}

function createMinimalDocxZip(title: string) {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="html" ContentType="text/html"/>',
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
    buildWordDocumentBody(title, getDefaultSectionProperties()),
    '</w:document>',
  ].join(''));

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/>',
    '</Relationships>',
  ].join(''));

  return zip;
}

export function getContractOfficialDocxTemplatePath(contractType: ContractDraft['contractType']) {
  return contractType === 'lease'
    ? '/contract-templates/tw-lease-template.docx'
    : '/contract-templates/tw-sale-template.docx';
}

export function renderContractDocumentHtml(draft: ContractDraft) {
  const { title, content } = renderContractDocumentBody(draft);
  return renderHtmlDocument(title, content);
}

export async function renderContractDocumentDocx(
  draft: ContractDraft,
  options: RenderContractDocumentDocxOptions = {},
) {
  const { title, content } = renderContractDocumentBody(draft);
  const html = renderHtmlDocument(title, content);

  const zip = options.templateDocxBytes
    ? await JSZip.loadAsync(options.templateDocxBytes)
    : createMinimalDocxZip(title);

  const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const documentRelationshipsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

  if (options.templateDocxBytes && documentXml) {
    const inlineTemplateResult = tryRenderOfficialTemplateDocumentXml(documentXml, draft);

    if (inlineTemplateResult.didApplyInlineTemplate) {
      zip.file('word/document.xml', inlineTemplateResult.documentXml);
      return zip.generateAsync({ type: 'uint8array' });
    }
  }

  zip.file(
    '[Content_Types].xml',
    ensureHtmlContentType(contentTypesXml ?? [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '</Types>',
    ].join('')),
  );

  zip.file(
    'word/document.xml',
    replaceWordDocumentBody(documentXml ?? '', title),
  );

  zip.folder('word')?.folder('_rels')?.file(
    'document.xml.rels',
    ensureAltChunkRelationship(documentRelationshipsXml ?? [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '</Relationships>',
    ].join('')),
  );

  zip.folder('word')?.file('afchunk.html', html);

  return zip.generateAsync({ type: 'uint8array' });
}

export function buildContractDocumentFileName(draft: ContractDraft, format: 'html' | 'docx' = 'html') {
  const prefix = draft.contractType === 'lease' ? '租賃契約草稿' : '買賣契約草稿';
  return `${prefix}-${draft.propertyId}.${format}`;
}