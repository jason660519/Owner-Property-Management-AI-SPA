export const inquiryOptions = [
  '買屋',
  '賣屋',
  '租屋',
  '看屋',
  '一般諮詢',
  '物業代管',
  '維修報修',
  '合作提案',
  '系統功能建議',
  '帳務問題',
  '法律諮詢',
  '投訴與建議',
  '其他',
] as const;

export const allowedEntryPoints = [
  'pricing-cta',
  'services-cta',
  'about-cta',
  'property-detail-viewing',
  'property-detail-legal',
  'property-detail-collaboration',
] as const;

export type AllowedEntryPoint = (typeof allowedEntryPoints)[number];

export interface SourceSummary {
  title: string;
  body: string;
  detail?: string;
}

export function sanitizeSourcePath(value: string | null) {
  if (!value || !value.startsWith('/') || value.length > 200) {
    return undefined;
  }

  return value;
}

export function sanitizeEntryPoint(value: string | null) {
  if (!value) {
    return undefined;
  }

  return allowedEntryPoints.includes(value as AllowedEntryPoint)
    ? (value as AllowedEntryPoint)
    : undefined;
}

export function sanitizePropertyId(value: string | null) {
  if (!value || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) {
    return undefined;
  }

  return value;
}

export function sanitizePropertyTitle(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > 120) {
    return undefined;
  }

  return trimmed;
}

export function getEntryPointLabel(entryPoint?: AllowedEntryPoint) {
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

export function getSourceSummary({
  sourcePath,
  entryPoint,
  propertyTitle,
}: {
  sourcePath?: string;
  entryPoint?: AllowedEntryPoint;
  propertyTitle?: string;
}): SourceSummary | null {
  const detail = getEntryPointLabel(entryPoint);

  if (propertyTitle) {
    return {
      title: '案件來源',
      body: propertyTitle,
      ...(detail ? { detail } : {}),
    };
  }

  if (sourcePath) {
    return {
      title: '來自公開頁面',
      body: sourcePath,
      ...(detail ? { detail } : {}),
    };
  }

  return null;
}