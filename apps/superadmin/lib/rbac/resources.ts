// RBAC resource definitions — 17 resources across 5 groups

export type ResourceId =
  // Property group
  | 'rental_properties'
  | 'sales_properties'
  | 'buildings'
  // Contracts group
  | 'lease_contracts'
  | 'sales_contracts'
  | 'agent_authorizations'
  // Finance group
  | 'rental_ledger'
  | 'sales_ledger'
  | 'bank_accounts'
  | 'escrow_accounts'
  // IAM group
  | 'iam_users'
  | 'iam_roles_groups'
  // System group
  | 'system_logs'
  | 'audit_trails'
  | 'system_config'
  | 'storage'
  | 'ai_services';

export interface ResourceDefinition {
  id: ResourceId;
  label: string;
  group: string;
}

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  // Property
  { id: 'rental_properties',    label: '出租物業',    group: 'Property' },
  { id: 'sales_properties',     label: '出售物業',    group: 'Property' },
  { id: 'buildings',            label: '維修管理',    group: 'Property' },
  // Contracts
  { id: 'lease_contracts',      label: '房屋租賃合約', group: 'Contracts' },
  { id: 'sales_contracts',      label: '房屋買賣合約', group: 'Contracts' },
  { id: 'agent_authorizations', label: '各類空白合約', group: 'Contracts' },
  // Finance
  { id: 'rental_ledger',        label: '租賃-結算清單', group: 'Finance' },
  { id: 'sales_ledger',         label: '買賣-結算清單', group: 'Finance' },
  { id: 'bank_accounts',        label: '個人銀行帳戶',        group: 'Finance' },
  { id: 'escrow_accounts',      label: '價金履約保證專戶',    group: 'Finance' },
  // IAM
  { id: 'iam_users',            label: 'IAM 用戶管理', group: 'IAM' },
  { id: 'iam_roles_groups',     label: '角色/群組',     group: 'IAM' },
  // System
  { id: 'system_logs',          label: '系統日誌',        group: 'System' },
  { id: 'audit_trails',         label: '稽核追蹤',        group: 'System' },
  { id: 'system_config',        label: '系統設定',        group: 'System' },
  { id: 'storage',              label: '儲存空間管理',    group: 'System' },
  { id: 'ai_services',          label: 'AI服務/API KEY 設定', group: 'System' },
];

export const RESOURCES: ResourceId[] = RESOURCE_DEFINITIONS.map(r => r.id);
