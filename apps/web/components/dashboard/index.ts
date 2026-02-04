/**
 * @file index.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Central export point for all dashboard components
 */

export { DashboardLayout } from './DashboardLayout'
export { KPICard } from './KPICard'
export { ProgressLink } from './ProgressLink'
export { RoleSwitcher, getRoleMetadata } from './RoleSwitcher'
export { StatsGrid } from './StatsGrid'

export type {
  UserRole,
  RoleMetadata,
  KPIConfig,
  KPILoadingState,
  ProgressLink as ProgressLinkType,
  TrendIndicator,
  DashboardConfig,
  BadgeVariant,
} from './types'
