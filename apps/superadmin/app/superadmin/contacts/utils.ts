import type { ContactLeadSourceContext } from './actions';
import type { ContactLead } from './actions';
import {
  CONTACT_LEAD_SOURCE_TYPE_VALUES,
  CONTACT_LEAD_STATUS_LABELS,
  type ContactLeadSourceType,
  type ContactLeadStatus,
} from './constants';

export interface ContactLeadFilters {
  query?: string;
  status?: ContactLeadStatus;
  sourceType?: ContactLeadSourceType;
  inquiryType?: string;
}

function normalizeTextValue(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function getLeadSourceType(sourcePath?: string): ContactLeadSourceType {
  if (sourcePath?.startsWith('/properties')) {
    return 'property';
  }

  if (sourcePath === '/pricing' || sourcePath === '/services' || sourcePath === '/about') {
    return 'marketing';
  }

  return 'other';
}

export function getContactLeadFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ContactLeadFilters {
  const query = normalizeTextValue(searchParams?.query);
  const inquiryType = normalizeTextValue(searchParams?.inquiryType);
  const status = normalizeTextValue(searchParams?.status);
  const sourceType = normalizeTextValue(searchParams?.sourceType);

  return {
    query,
    inquiryType,
    status: status && CONTACT_LEAD_STATUS_LABELS[status as ContactLeadStatus] ? (status as ContactLeadStatus) : undefined,
    sourceType:
      sourceType && CONTACT_LEAD_SOURCE_TYPE_VALUES.includes(sourceType as ContactLeadSourceType)
        ? (sourceType as ContactLeadSourceType)
        : undefined,
  };
}

export function filterContactLeads(leads: ContactLead[], filters: ContactLeadFilters) {
  const query = filters.query?.toLowerCase();

  return leads.filter((lead) => {
    if (filters.status && lead.status !== filters.status) {
      return false;
    }

    if (filters.sourceType && getLeadSourceType(lead.sourcePath) !== filters.sourceType) {
      return false;
    }

    if (filters.inquiryType && lead.inquiryType !== filters.inquiryType) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystacks = [
      lead.leadReference,
      lead.name,
      lead.email,
      lead.message,
      lead.inquiryType,
      lead.sourceContext?.propertyId,
      lead.sourceContext?.propertyTitle,
    ];

    return haystacks.some((value) => value?.toLowerCase().includes(query));
  });
}

export function getAvailableInquiryTypes(leads: ContactLead[]) {
  return Array.from(new Set(leads.map((lead) => lead.inquiryType))).sort((left, right) =>
    left.localeCompare(right, 'zh-Hant'),
  );
}

export function hasActiveLeadFilters(filters: ContactLeadFilters) {
  return Boolean(filters.query || filters.status || filters.sourceType || filters.inquiryType);
}

export function formatLeadEntryPoint(entryPoint?: string) {
  switch (entryPoint) {
    case 'pricing-cta':
      return '從收費方式頁送出合作諮詢';
    case 'services-cta':
      return '從平台能力頁送出合作諮詢';
    case 'about-cta':
      return '從關於我們頁送出合作諮詢';
    case 'property-detail-viewing':
      return '從案件詳情頁發起預約看房';
    case 'property-detail-legal':
      return '從案件詳情頁發起簽約支援';
    case 'property-detail-collaboration':
      return '從案件詳情頁發起合作角色邀請';
    default:
      return undefined;
  }
}

export function formatLeadPropertyContext({
  propertyId,
  propertyTitle,
}: {
  propertyId?: string;
  propertyTitle?: string;
}) {
  if (propertyTitle && propertyId) {
    return `${propertyTitle}（${propertyId}）`;
  }

  return propertyTitle || propertyId || undefined;
}

function formatLeadSourcePathLabel(sourcePath?: string) {
  if (!sourcePath) {
    return undefined;
  }

  if (sourcePath.startsWith('/properties/')) {
    return '案件詳情頁';
  }

  if (sourcePath === '/properties') {
    return '案件列表頁';
  }

  if (sourcePath === '/pricing') {
    return '收費方式頁';
  }

  if (sourcePath === '/services') {
    return '平台能力頁';
  }

  if (sourcePath === '/about') {
    return '關於我們頁';
  }

  return sourcePath;
}

export function formatLeadSourceSummary({
  sourcePath,
  sourceContext,
}: {
  sourcePath?: string;
  sourceContext?: ContactLeadSourceContext;
}) {
  return {
    sourceLabel: formatLeadSourcePathLabel(sourcePath) ?? '未提供',
    actionLabel: formatLeadEntryPoint(sourceContext?.entryPoint) ?? '未提供',
    propertyLabel: formatLeadPropertyContext({
      propertyId: sourceContext?.propertyId,
      propertyTitle: sourceContext?.propertyTitle,
    }),
  };
}

export function formatLeadTimestamp(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatLeadStatus(status: ContactLeadStatus) {
  return CONTACT_LEAD_STATUS_LABELS[status];
}