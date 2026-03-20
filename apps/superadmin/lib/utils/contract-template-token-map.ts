import type { ContractDraft, SalePaymentMilestone, TranscriptSummarySection } from '@/lib/types/contracts';
import { getContractTemplateDefinition } from '@/lib/utils/contract-template-definitions';

function escapeHtml(value: string | number | undefined | null) {
  if (value == null) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number | undefined) {
  if (value == null) return '';

  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDraftStatus(status: ContractDraft['draftStatus']) {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'reviewing':
      return '覆核中';
    case 'approved':
      return '已核准';
    case 'exported':
      return '已匯出';
    default:
      return status;
  }
}

function formatLeaseUsePurpose(value: Extract<ContractDraft, { contractType: 'lease' }>['usePurpose']) {
  switch (value) {
    case 'residential':
      return '住宅';
    case 'office':
      return '辦公';
    case 'commercial':
      return '商業';
    case 'other':
      return '其他';
    default:
      return '依約定用途';
  }
}

function getValueByPath(input: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, input);
}

function formatTranscriptSections(value: unknown) {
  if (!value || typeof value !== 'object') return '';

  return Object.values(value as Record<string, TranscriptSummarySection | undefined>)
    .filter((section): section is TranscriptSummarySection => Boolean(section))
    .map((section) => `${escapeHtml(section.title)}: ${escapeHtml(section.content)}`)
    .join('\n');
}

function formatPaymentSchedule(value: unknown) {
  if (!Array.isArray(value)) return '';

  return value
    .map((item) => {
      const milestone = item as SalePaymentMilestone;
      return [escapeHtml(milestone.label), escapeHtml(formatCurrency(milestone.amount)), escapeHtml(milestone.dueDate)]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}

function formatAttachmentLabel(type: string) {
  switch (type) {
    case 'building_transcript':
      return '建物謄本';
    case 'land_transcript':
      return '土地謄本';
    case 'id_copy':
      return '身分證影本';
    case 'seal_certificate':
      return '印鑑證明';
    default:
      return '其他附件';
  }
}

function buildAttachmentsRows(draft: ContractDraft) {
  return draft.attachments.map((attachment) => `
    <tr>
      <td>${escapeHtml(formatAttachmentLabel(attachment.attachmentType))}</td>
      <td>${escapeHtml(attachment.fileName)}</td>
      <td>${attachment.isAttached ? '已附上' : '未附上'}</td>
      <td>${attachment.isRequired ? '必要' : '選填'}</td>
    </tr>
  `).join('');
}

function buildTranscriptSectionCards(draft: ContractDraft) {
  if (draft.contractType !== 'sale') return '';

  return Object.values(draft.transcriptSections)
    .filter(Boolean)
    .map((section) => `
      <div class="section-card">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.content)}</p>
      </div>
    `)
    .join('');
}

function buildPaymentScheduleRows(draft: ContractDraft) {
  if (draft.contractType !== 'sale') return '';

  return draft.paymentSchedule.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(formatCurrency(item.amount))}</td>
      <td>${escapeHtml(item.dueDate)}</td>
      <td>${escapeHtml(item.note || '')}</td>
    </tr>
  `).join('');
}

function buildSalePriceBreakdownLine(label: string, value: number | undefined) {
  return value == null ? `${label}：待補` : `${label}：${escapeHtml(formatCurrency(value))}`;
}

function buildRiskNotesBlock(draft: ContractDraft) {
  if (draft.contractType !== 'sale' || (!draft.riskNotes && !draft.transcriptAttachmentNote)) {
    return '';
  }

  return `
    <div class="risk">
      <strong>人工覆核提示</strong>
      ${draft.riskNotes ? `<p>${escapeHtml(draft.riskNotes)}</p>` : ''}
      ${draft.transcriptAttachmentNote ? `<p>${escapeHtml(draft.transcriptAttachmentNote)}</p>` : ''}
    </div>
  `;
}

function formatTemplateValue(value: unknown) {
  if (value == null) return '';

  if (typeof value === 'number') {
    return escapeHtml(formatCurrency(value));
  }

  if (Array.isArray(value)) {
    return value.map((item) => escapeHtml(String(item))).join('、');
  }

  if (typeof value === 'object') {
    if ('buildingDescription' in (value as Record<string, unknown>)) {
      return formatTranscriptSections(value);
    }

    return escapeHtml(JSON.stringify(value, null, 2));
  }

  return escapeHtml(String(value));
}

export function buildContractTemplateTokenMap(draft: ContractDraft) {
  const template = getContractTemplateDefinition(draft.contractType);
  const tokenMap: Record<string, string> = {
    '{{templateCode}}': escapeHtml(template.templateCode),
    '{{templateDisplayTitle}}': escapeHtml(template.displayTitle),
    '{{templateSourceDocumentName}}': escapeHtml(template.sourceDocumentName),
    '{{templateReviewPeriodDays}}': String(template.reviewPeriodDays),
    '{{draftStatus}}': escapeHtml(formatDraftStatus(draft.draftStatus)),
    '{{attachmentsRows}}': buildAttachmentsRows(draft),
    '{{buildingNumberLine}}': draft.buildingNumber ? `建號：${escapeHtml(draft.buildingNumber)}` : '',
    '{{landNumberLine}}': draft.contractType === 'lease' && draft.landNumber ? `土地地號：${escapeHtml(draft.landNumber)}` : '',
    '{{buildingAreaPingLine}}': draft.contractType === 'lease' && draft.buildingAreaPing ? `建物面積：約 ${escapeHtml(draft.buildingAreaPing)} 坪。` : '',
    '{{landAreaPingLine}}': draft.contractType === 'lease' && draft.landAreaPing ? `土地面積：約 ${escapeHtml(draft.landAreaPing)} 坪。` : '',
    '{{usePurposeLine}}': draft.contractType === 'lease' ? `本房屋係供 ${escapeHtml(formatLeaseUsePurpose(draft.usePurpose))} 之使用。` : '',
    '{{specialTermsLine}}': draft.contractType === 'lease' && draft.specialTerms ? `其他特約：${escapeHtml(draft.specialTerms)}` : '',
    '{{includedItemsLine}}': draft.contractType === 'lease'
      ? (draft.includedItems?.length ? `附屬設備：${draft.includedItems.map((item) => escapeHtml(item)).join('、')}` : '本件租賃之附屬設備、固定設備與點交內容，應由雙方於交屋時另行確認。')
      : '',
    '{{buildingOwnershipSummaryLine}}': draft.contractType === 'lease' && draft.buildingOwnershipSummary ? `建物所有權摘要：${escapeHtml(draft.buildingOwnershipSummary)}` : '',
    '{{landOwnershipSummaryLine}}': draft.contractType === 'lease' && draft.landOwnershipSummary ? `土地所有權摘要：${escapeHtml(draft.landOwnershipSummary)}` : '',
    '{{encumbranceSummaryLine}}': draft.contractType === 'lease' && draft.encumbranceSummary ? `他項權利摘要：${escapeHtml(draft.encumbranceSummary)}` : '',
    '{{paymentScheduleRows}}': buildPaymentScheduleRows(draft),
    '{{transcriptSectionCards}}': buildTranscriptSectionCards(draft),
    '{{brokerClauseLine}}': draft.contractType === 'sale'
      ? [draft.brokerName ? `經紀業：${escapeHtml(draft.brokerName)}` : '', draft.agentName ? `經紀人：${escapeHtml(draft.agentName)}` : '']
          .filter(Boolean)
          .join('；')
      : '',
    '{{scrivenerNameLine}}': draft.contractType === 'sale' && draft.scrivenerName
      ? `代書／地政士：${escapeHtml(draft.scrivenerName)}`
      : '',
    '{{landNumbersLine}}': draft.contractType === 'sale' && draft.landNumbers?.length ? `地號：${draft.landNumbers.map((item) => escapeHtml(item)).join('、')}` : '',
    '{{salePriceBreakdownLines}}': draft.contractType === 'sale'
      ? [
          buildSalePriceBreakdownLine('土地價款', draft.landPrice),
          buildSalePriceBreakdownLine('建物價款', draft.buildingPrice),
          buildSalePriceBreakdownLine('車位土地價款', draft.parkingLandPrice),
          buildSalePriceBreakdownLine('車位建物價款', draft.parkingBuildingPrice),
        ].join('<br />')
      : '',
    '{{deliveryConditionLine}}': draft.contractType === 'sale' && draft.deliveryCondition ? `交付現況：${escapeHtml(draft.deliveryCondition)}` : '',
    '{{riskNotesBlock}}': buildRiskNotesBlock(draft),
    '{{manualReviewRequired}}': draft.contractType === 'sale' ? (draft.manualReviewRequired ? '需要' : '目前無') : '',
  };

  for (const field of template.fieldMappings) {
    const rawValue = getValueByPath(draft, field.sourcePath);
    const formatted = field.key === 'paymentSchedule'
      ? formatPaymentSchedule(rawValue)
      : field.key === 'transcriptSections'
        ? formatTranscriptSections(rawValue)
        : field.key === 'contractCopiesCount'
          ? (rawValue == null ? '' : escapeHtml(String(rawValue)))
        : field.key === 'holdoverPenaltyMultiple'
          ? (rawValue == null ? '待補' : escapeHtml(String(rawValue)))
        : field.key === 'usePurpose'
          ? escapeHtml(formatLeaseUsePurpose(rawValue as Extract<ContractDraft, { contractType: 'lease' }>['usePurpose']))
        : field.key === 'paymentDueDay'
          ? (rawValue == null ? '' : escapeHtml(String(rawValue)))
        : formatTemplateValue(rawValue);

    tokenMap[`{{${field.key}}}`] = formatted;
  }

  return tokenMap;
}