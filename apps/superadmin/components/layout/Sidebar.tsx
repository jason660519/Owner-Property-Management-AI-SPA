'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Users, 
  Building, 
  FileText, 
  ShieldCheck, 
  Settings, 
  Activity, 
  Database,
  Lock,
  Grid,
  VenetianMask
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: '總覽',
    href: '/superadmin',
    icon: <Home className="w-5 h-5" />,
  },
  {
    name: '用戶管理',
    href: '/superadmin/users',
    icon: <Users className="w-5 h-5" />,
  },
  {
    name: '權限群組',
    href: '/superadmin/groups',
    icon: <Lock className="w-5 h-5" />,
  },
  {
    name: '物件管理',
    href: '/superadmin/properties',
    icon: <Building className="w-5 h-5" />,
  },
  {
    name: '租約管理',
    href: '/superadmin/leases',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    name: '審核申請',
    href: '/superadmin/verifications',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    name: 'RBAC 設定',
    href: '/superadmin/dashboard/rbac_access_control',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    name: '權限矩陣',
    href: '/superadmin/dashboard/role_access_matrix',
    icon: <Grid className="w-5 h-5" />,
  },
  {
    name: '資料庫管理',
    href: '/superadmin/dashboard/supabase',
    icon: <Database className="w-5 h-5" />,
  },
  {
    name: '角色模擬切換',
    href: '/superadmin/role-simulation',
    icon: <VenetianMask className="w-5 h-5" />,
  },
  {
    name: '系統設定',
    href: '/superadmin/settings',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    name: '系統日誌',
    href: '/superadmin/logs',
    icon: <Activity className="w-5 h-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#2A2A2A] border-r border-[#333333] overflow-y-auto z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#333333]">
        <Link href="/superadmin" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div>
            <h1 className="text-white font-semibold">RESA Admin</h1>
            <p className="text-xs text-[#999999]">超級管理員後台</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#999999] hover:bg-[#333333] hover:text-white'
              )}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
