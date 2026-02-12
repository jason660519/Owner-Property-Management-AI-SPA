'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Users, 
  Lock, 
  Building, 
  FileText, 
  ShieldCheck, 
  Shield, 
  Grid, 
  Database, 
  HardDrive, 
  VenetianMask, 
  FileBarChart, 
  Settings 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Overview', href: '/superadmin', icon: Home },
  { name: 'Users', href: '/superadmin/users', icon: Users },
  { name: 'Auth Groups', href: '/superadmin/groups', icon: Lock },
  { name: 'Properties', href: '/superadmin/properties', icon: Building },
  { name: 'Leases', href: '/superadmin/leases', icon: FileText },
  { name: 'Verifications', href: '/superadmin/verifications', icon: ShieldCheck },
  { name: 'RBAC Settings', href: '/superadmin/dashboard/rbac_access_control', icon: Shield },
  { name: 'Permission Matrix', href: '/superadmin/dashboard/role_access_matrix', icon: Grid },
  { name: 'Database', href: '/superadmin/dashboard/supabase', icon: Database },
  { name: 'Storage', href: '/superadmin/dashboard/storage', icon: HardDrive },
  { name: 'Impersonate', href: '/superadmin/role-simulation', icon: VenetianMask },
  { name: 'IAM Audit', href: '/superadmin/dashboard/iam-audit', icon: FileBarChart },
  { name: 'Project Progress', href: '/superadmin/dashboard/project-progress', icon: FileText },
  { name: 'Settings', href: '/superadmin/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <aside
      className={twMerge(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-[#1A1A1A] border-r border-gray-200 dark:border-[#2A2A2A] transition-all duration-300 ease-in-out flex flex-col",
        isHovered ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700">
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={twMerge(
                  "group flex items-center px-3 py-2.5 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] hover:text-gray-900 dark:hover:text-white"
                )}
                title={!isHovered ? item.name : undefined}
              >
                <item.icon 
                  className={twMerge(
                    "flex-shrink-0 w-5 h-5 transition-colors",
                    isActive ? "text-emerald-500" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                  )} 
                />
                <span 
                  className={twMerge(
                    "ml-3 whitespace-nowrap transition-all duration-300",
                    isHovered 
                      ? "opacity-100 translate-x-0" 
                      : "opacity-0 -translate-x-4 w-0 overflow-hidden"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section (Optional User Profile or Version) */}
        <div className="mt-auto px-2 py-4 border-t border-gray-200 dark:border-[#2A2A2A]">
           <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
              <div 
                className={twMerge(
                  "ml-3 overflow-hidden transition-all duration-300",
                   isHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">admin@example.com</p>
              </div>
           </div>
        </div>
      </div>
    </aside>
  );
}
