import type { ContactLeadSourceContext } from './actions';

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