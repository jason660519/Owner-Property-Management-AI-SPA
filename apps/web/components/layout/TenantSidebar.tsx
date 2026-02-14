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

export function TenantSidebar() {
  const pathname = usePathname()
  
  // Determine which nav items to show based on path
  // If we are in 'contracted' path or have a contracted context, show contracted items.
  // Otherwise default to potential or detect potential path.
  // For now, simple path check.
  const isContracted = pathname.includes('/tenant/contracted') || 
                       pathname.includes('/tenant/payments') || 
                       pathname.includes('/tenant/maintenance') ||
                       pathname.includes('/tenant/leases')

  const navItems = isContracted ? contractedTenantNavItems : potentialTenantNavItems

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#2A2A2A] border-r border-[#333333] overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-[#333333]">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <div>
            <h1 className="text-white font-semibold">RESA AI</h1>
            <p className="text-xs text-[#999999]">租客專區</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
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
