/**
 * @file DashboardLayout.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Universal dashboard layout with breadcrumbs and role switcher
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { RoleSwitcher } from './RoleSwitcher'
import type { UserRole } from './types'

interface Breadcrumb {
  label: string
  href?: string
}

interface DashboardLayoutProps {
  currentRole: UserRole
  availableRoles?: UserRole[]
  pageTitle: string
  breadcrumbs: Breadcrumb[]
  greeting?: string
  children: React.ReactNode
  headerActions?: React.ReactNode
  className?: string
}

/**
 * DashboardLayout Component
 *
 * Provides consistent layout for all role dashboards with:
 * - Breadcrumb navigation
 * - Role switcher
 * - Page title and greeting
 * - Optional header actions
 *
 * @example
 * <DashboardLayout
 *   currentRole="landlord"
 *   pageTitle="房東儀表板"
 *   breadcrumbs={[
 *     { label: "首頁", href: "/" },
 *     { label: "房東專區", href: "/landlord" },
 *     { label: "儀表板" }
 *   ]}
 *   greeting="早安，王先生"
 * >
 *   <KPICard ... />
 * </DashboardLayout>
 */
export function DashboardLayout({
  currentRole,
  availableRoles,
  pageTitle,
  breadcrumbs,
  greeting,
  children,
  headerActions,
  className = '',
}: DashboardLayoutProps) {
  return (
    <div className={`min-h-screen bg-bg-primary transition-colors duration-200 ${className}`}>
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-default px-6 py-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-primary font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {pageTitle}
              </h1>
              {greeting && (
                <p className="text-sm text-text-secondary">{greeting}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              {headerActions}
              <RoleSwitcher
                currentRole={currentRole}
                availableRoles={availableRoles}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  )
}
