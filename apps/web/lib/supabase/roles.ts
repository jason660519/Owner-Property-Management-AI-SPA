import { supabase } from './client';

export type UserRole = 'landlord' | 'tenant' | 'buyer' | 'agent' | 'service_provider' | 'super_admin';

// 獲取用戶所有角色
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('roles')
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Failed to get user roles:', error);
    return ['landlord'];
  }
  
  return data.roles as UserRole[];
}

// 獲取用戶當前主要角色
export async function getPrimaryRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('primary_role')
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Failed to get primary role:', error);
    return 'landlord';
  }
  
  return data.primary_role as UserRole;
}

// 切換用戶主要角色
export async function switchPrimaryRole(userId: string, newRole: UserRole): Promise<boolean> {
  // 首先檢查用戶是否擁有該角色
  const userRoles = await getUserRoles(userId);
  
  if (!userRoles.includes(newRole)) {
    throw new Error(`User does not have the role: ${newRole}`);
  }
  
  const { error } = await supabase
    .from('users_profile')
    .update({ 
      primary_role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('Failed to switch primary role:', error);
    return false;
  }
  
  return true;
}

// 檢查用戶是否擁有特定角色
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(role);
}

// 獲取角色顯示名稱
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    landlord: '房東',
    tenant: '租客',
    buyer: '買家',
    agent: '仲介',
    service_provider: '服務商',
    super_admin: '超級管理員'
  };
  
  return roleNames[role] || role;
}

// 獲取所有可用角色
export function getAllRoles(): UserRole[] {
  return ['landlord', 'tenant', 'buyer', 'agent', 'service_provider', 'super_admin'];
}

// 角色權限檢查
export function checkRolePermission(role: UserRole, permission: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    landlord: ['view_properties', 'manage_properties', 'view_tenants', 'manage_leases'],
    tenant: ['view_leases', 'make_payments', 'submit_requests'],
    buyer: ['view_properties', 'make_offers', 'schedule_tours'],
    agent: ['view_all_properties', 'manage_listings', 'contact_clients'],
    service_provider: ['view_assigned_tasks', 'update_task_status'],
    super_admin: ['manage_users', 'view_reports', 'system_config']
  };
  
  return permissions[role]?.includes(permission) || false;
}