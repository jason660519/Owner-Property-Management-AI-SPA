/**
 * @file types.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description TypeScript type definitions for Dashboard components
 */

import { LucideIcon } from 'lucide-react'

/**
 * Badge variant types for progress links
 */
export type BadgeVariant = 'info' | 'warning' | 'success' | 'error' | 'default'

/**
 * Progress link configuration
 * Represents a clickable link with optional badge in KPI cards
 */
export interface ProgressLink {
  label: string
  href: string
  query?: Record<string, string>
  badge?: {
    count: number
    variant: BadgeVariant
  }
}

/**
 * Trend indicator for KPI values
 */
export interface TrendIndicator {
  value: number // Percentage change (e.g., 12.5 means +12.5%)
  direction: 'up' | 'down'
  label: string // Description (e.g., "vs last month")
}

/**
 * KPI Card configuration
 * Represents a single KPI metric card in the dashboard
 */
export interface KPIConfig {
  title: string
  value: number | string
  icon: LucideIcon
  color: string // Tailwind color class (e.g., "text-blue-500")
  trend?: TrendIndicator
  progressLinks: ProgressLink[]
}

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
  | 'super_admin'

/**
 * Role display metadata
 */
export interface RoleMetadata {
  role: UserRole
  displayName: string
  description: string
  icon: LucideIcon
  color: string
  dashboardPath: string
}

/**
 * Dashboard configuration for each role
 */
export interface DashboardConfig {
  role: UserRole
  pageTitle: string
  breadcrumbs: Array<{
    label: string
    href?: string
  }>
  kpis: KPIConfig[]
  greeting?: string // Custom greeting message
}

/**
 * Loading state for KPI cards
 */
export interface KPILoadingState {
  isLoading: boolean
  error?: string
  isEmpty?: boolean
}
