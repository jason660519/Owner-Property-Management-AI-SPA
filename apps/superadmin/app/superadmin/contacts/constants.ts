export const CONTACT_LEAD_STATUS_VALUES = ['new', 'read', 'replied', 'archived'] as const;

export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUS_VALUES)[number];

export const CONTACT_LEAD_SOURCE_TYPE_VALUES = ['property', 'marketing', 'other'] as const;

export type ContactLeadSourceType = (typeof CONTACT_LEAD_SOURCE_TYPE_VALUES)[number];

export const CONTACT_LEAD_STATUS_LABELS: Record<ContactLeadStatus, string> = {
  new: '待處理',
  read: '已讀',
  replied: '已回覆',
  archived: '已封存',
};

export const CONTACT_LEAD_STATUS_VARIANTS: Record<
  ContactLeadStatus,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  new: 'warning',
  read: 'info',
  replied: 'success',
  archived: 'default',
};

export const CONTACT_LEAD_SOURCE_TYPE_LABELS: Record<ContactLeadSourceType, string> = {
  property: '案件流程',
  marketing: '行銷頁面',
  other: '其他來源',
};