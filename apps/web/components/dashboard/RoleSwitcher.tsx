/**
 * @file RoleSwitcher.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Role switcher component for multi-role dashboard navigation
 */

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Key,
  Search,
  ShoppingCart,
  Eye,
  Users,
  Wrench,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import type { UserRole, RoleMetadata } from './types'

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
]

interface RoleSwitcherProps {
  currentRole: UserRole
  availableRoles?: UserRole[] // If not provided, show all roles
  className?: string
}

/**
 * RoleSwitcher Component
 *
 * Allows users to switch between different role dashboards
 *
 * @example
 * <RoleSwitcher
 *   currentRole="landlord"
 *   availableRoles={["landlord", "contracted_tenant"]}
 * />
 */
export function RoleSwitcher({
  currentRole,
  availableRoles,
  className = '',
}: RoleSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Filter roles if availableRoles is provided
  const roles = availableRoles
    ? ROLE_METADATA.filter((r) => availableRoles.includes(r.role))
    : ROLE_METADATA

  const currentRoleMetadata = roles.find((r) => r.role === currentRole)

  if (!currentRoleMetadata) {
    return null
  }

  const CurrentIcon = currentRoleMetadata.icon

  const handleRoleChange = (newRole: string) => {
    const targetRole = roles.find((r) => r.role === newRole)
    if (targetRole) {
      if (targetRole.dashboardPath.startsWith('http')) {
        window.location.href = targetRole.dashboardPath
      } else {
        router.push(targetRole.dashboardPath)
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Select value={currentRole} onValueChange={handleRoleChange}>
        <SelectTrigger
          data-testid="role-switcher"
          className="w-[240px] bg-[#2A2A2A] border-[#333333] text-white hover:border-[#7C3AED]"
        >
          <div className="flex items-center gap-3">
            <CurrentIcon className={`w-5 h-5 ${currentRoleMetadata.color}`} />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {currentRoleMetadata.displayName}
              </span>
              <span className="text-xs text-[#666666]">
                {currentRoleMetadata.description}
              </span>
            </div>
          </div>
        </SelectTrigger>

        <SelectContent>
          {roles.map((roleData) => {
            const RoleIcon = roleData.icon
            return (
              <SelectItem
                key={roleData.role}
                value={roleData.role}
              >
                <div className="flex items-center gap-3 py-1">
                  <RoleIcon className={`w-5 h-5 ${roleData.color}`} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {roleData.displayName}
                    </span>
                    <span className="text-xs text-[#666666]">
                      {roleData.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Get role metadata by role name
 */
export function getRoleMetadata(role: UserRole): RoleMetadata | undefined {
  return ROLE_METADATA.find((r) => r.role === role)
}
