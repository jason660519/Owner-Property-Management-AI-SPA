
import {
  Home,
  Key,
  Search,
  ShoppingCart,
  Eye,
  Users,
  Wrench,
  Shield,
  LucideIcon,
} from 'lucide-react';

/**
 * User role types (8 roles)
 */
export type UserRole =
  | 'landlord'
  | 'contracted_tenant'
  | 'potential_tenant'
  | 'contracted_buyer'
  | 'potential_buyer'
  | 'agent'
  | 'service_provider'
  | 'super_admin';

/**
 * Role display metadata
 */
export interface RoleMetadata {
  role: UserRole;
  displayName: string;
  description: string;
  icon: LucideIcon;
  color: string;
  dashboardPath: string;
}

/**
 * All available roles with metadata
 */
export const ROLE_METADATA: RoleMetadata[] = [
  {
    role: 'landlord',
    displayName: '房東',
    description: '物件擁有者',
    icon: Home,
    color: 'text-blue-500',
    dashboardPath: '/landlord/dashboard',
  },
  {
    role: 'contracted_tenant',
    displayName: '簽約租客',
    description: '已簽署租約',
    icon: Key,
    color: 'text-green-500',
    dashboardPath: '/tenant/contracted/dashboard',
  },
  {
    role: 'potential_tenant',
    displayName: '潛在租客',
    description: '尋找租屋',
    icon: Search,
    color: 'text-yellow-500',
    dashboardPath: '/tenant/potential/dashboard',
  },
  {
    role: 'contracted_buyer',
    displayName: '簽約買家',
    description: '已簽署購買合約',
    icon: ShoppingCart,
    color: 'text-purple-500',
    dashboardPath: '/buyer/contracted/dashboard',
  },
  {
    role: 'potential_buyer',
    displayName: '潛在買家',
    description: '尋找購屋',
    icon: Eye,
    color: 'text-orange-500',
    dashboardPath: '/buyer/potential/dashboard',
  },
  {
    role: 'agent',
    displayName: '仲介',
    description: '房地產仲介',
    icon: Users,
    color: 'text-cyan-500',
    dashboardPath: '/agent/dashboard',
  },
  {
    role: 'service_provider',
    displayName: '服務提供者',
    description: '維修、清潔等服務商',
    icon: Wrench,
    color: 'text-pink-500',
    dashboardPath: '/service-provider/dashboard',
  },
  {
    role: 'super_admin',
    displayName: '超級管理員',
    description: '系統管理員',
    icon: Shield,
    color: 'text-red-500',
    dashboardPath: (process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001') + '/superadmin/dashboard',
  },
];
