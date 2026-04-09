/**
 * @file RoleSwitcher.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Role switcher component for multi-role dashboard navigation
 */

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { UserRole, RoleMetadata, ROLE_METADATA } from '@/config/roles'

export { ROLE_METADATA, type RoleMetadata }

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
        window.location.assign(targetRole.dashboardPath)
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
