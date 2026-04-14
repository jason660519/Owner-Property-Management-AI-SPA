'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  Users,
  Calendar,
  Wrench,
  DollarSign,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Search,
  ClipboardList,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

// ---------------------------------------------------------------------------
// Nav item definitions per role
// ---------------------------------------------------------------------------
type NavItem = { label: string; href: string; icon: React.ReactNode };

const LANDLORD_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/landlord/dashboard',            icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Properties',  href: '/landlord/properties',           icon: <Building2 className="w-4 h-4" /> },
  { label: 'Tenants',     href: '/landlord/customers',            icon: <Users className="w-4 h-4" /> },
  { label: 'Applications',href: '/landlord/applications',         icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Viewings',    href: '/landlord/appointments',         icon: <Calendar className="w-4 h-4" /> },
  { label: 'Maintenance', href: '/landlord/maintenance',          icon: <Wrench className="w-4 h-4" /> },
  { label: 'Finance',     href: '/landlord/finance',              icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Leases',      href: '/landlord/leases',               icon: <FileText className="w-4 h-4" /> },
  { label: 'Messages',    href: '/landlord/messages',             icon: <MessageSquare className="w-4 h-4" /> },
];

const TENANT_POTENTIAL_NAV: NavItem[] = [
  { label: 'Dashboard',     href: '/tenant/potential/dashboard',    icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Find Property', href: '/tenant/potential/properties',   icon: <Search className="w-4 h-4" /> },
  { label: 'Inspections',   href: '/tenant/potential/viewings',     icon: <Calendar className="w-4 h-4" /> },
  { label: 'Applications',  href: '/tenant/potential/applications', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Messages',      href: '/tenant/messages',               icon: <MessageSquare className="w-4 h-4" /> },
];

const TENANT_CONTRACTED_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/tenant/contracted/dashboard',    icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Property', href: '/tenant/contracted/property',     icon: <Home className="w-4 h-4" /> },
  { label: 'Maintenance', href: '/tenant/maintenance',             icon: <Wrench className="w-4 h-4" /> },
  { label: 'Payments',    href: '/tenant/contracted/payments',     icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Documents',   href: '/tenant/contracted/documents',    icon: <FileText className="w-4 h-4" /> },
  { label: 'Messages',    href: '/tenant/messages',                icon: <MessageSquare className="w-4 h-4" /> },
];

const BUYER_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/buyer/dashboard',                icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Find Property',href: '/buyer/properties',              icon: <Search className="w-4 h-4" /> },
  { label: 'Inspections', href: '/buyer/inspections',              icon: <Calendar className="w-4 h-4" /> },
  { label: 'Offers',      href: '/buyer/offers',                   icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Documents',   href: '/buyer/documents',                icon: <FileText className="w-4 h-4" /> },
  { label: 'Messages',    href: '/buyer/messages',                 icon: <MessageSquare className="w-4 h-4" /> },
];

function pickNavItems(pathname: string): NavItem[] {
  if (pathname.startsWith('/landlord'))               return LANDLORD_NAV;
  if (pathname.startsWith('/tenant/potential'))       return TENANT_POTENTIAL_NAV;
  if (pathname.startsWith('/tenant/contracted'))      return TENANT_CONTRACTED_NAV;
  if (pathname.startsWith('/tenant'))                 return TENANT_CONTRACTED_NAV;
  if (pathname.startsWith('/buyer'))                  return BUYER_NAV;
  return LANDLORD_NAV;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AUSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = pickNavItems(pathname);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside
      className={[
        'flex flex-col h-full bg-bg-secondary border-r border-border-default',
        'transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border-default shrink-0">
        {!collapsed && (
          <span className="text-sm font-bold text-text-primary tracking-wide">
            Prop<span className="text-accent">AI</span>{' '}
            <span className="text-xs font-normal text-text-muted">AU</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors ml-auto"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              ].join(' ')}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border-default px-2 py-3 space-y-0.5 shrink-0">
        <div
          className={[
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed ? 'justify-center px-0' : '',
          ].join(' ')}
          title={collapsed ? 'Toggle light / dark theme' : undefined}
        >
          <ThemeToggle />
          {!collapsed && <span className="text-sm text-text-secondary">Theme</span>}
        </div>
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
