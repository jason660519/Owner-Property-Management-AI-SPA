'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Home,
  Calendar,
  FileCheck,
  FileText,
  HelpCircle,
  CreditCard,
  Wrench,
  Bell,
  Settings
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}

const potentialTenantNavItems: NavItem[] = [
  {
    name: '儀表板',
    href: '/tenant/potential/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: '房東物件',
    href: '/tenant/potential/properties',
    icon: <Home className="w-5 h-5" />,
  },
  {
    name: '預約看房',
    href: '/tenant/potential/viewings',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    name: '租賃申請',
    href: '/tenant/potential/applications',
    icon: <FileCheck className="w-5 h-5" />,
  },
  {
    name: '空白租約',
    href: '/tenant/resources/blank-lease',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    name: '常見問題',
    href: '/tenant/resources/faq',
    icon: <HelpCircle className="w-5 h-5" />,
  },
]

const contractedTenantNavItems: NavItem[] = [
  {
    name: '儀表板',
    href: '/tenant/contracted/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: '我的租約',
    href: '/tenant/leases/current',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    name: '租金繳納',
    href: '/tenant/payments',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    name: '維修申請',
    href: '/tenant/maintenance',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    name: '通知中心',
    href: '/tenant/notifications',
    icon: <Bell className="w-5 h-5" />,
  },
  {
    name: '設定',
    href: '/tenant/settings',
    icon: <Settings className="w-5 h-5" />,
  },
]

export interface TenantSidebarProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

function TenantSidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const isContracted =
    pathname.includes('/tenant/contracted') ||
    pathname.includes('/tenant/payments') ||
    pathname.includes('/tenant/maintenance') ||
    pathname.includes('/tenant/leases')

  const navItems = isContracted ? contractedTenantNavItems : potentialTenantNavItems

  return (
    <aside className="flex w-64 flex-col overflow-y-auto border-r border-[#333333] bg-[#2A2A2A]">
      <div className="border-b border-[#333333] p-6">
        <Link href="/" className="flex items-center space-x-3" onClick={onNavigate}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C3AED]">
            <span className="text-xl font-bold text-white">R</span>
          </div>
          <div>
            <h1 className="font-semibold text-white">RESA AI</h1>
            <p className="text-xs text-[#999999]">租客專區</p>
          </div>
        </Link>
      </div>

      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                'flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                isActive
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#999999] hover:bg-[#333333] hover:text-white'
              )}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function TenantSidebar({ mobileOpen, onMobileOpenChange }: TenantSidebarProps) {
  return (
    <>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <TenantSidebarInner />
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="關閉側邊選單"
            onClick={() => onMobileOpenChange(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <TenantSidebarInner onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </>
      ) : null}
    </>
  )
}
