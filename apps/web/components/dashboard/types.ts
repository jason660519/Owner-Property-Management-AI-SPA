import type { UserRole, RoleMetadata } from '@/config/roles'

export type { UserRole, RoleMetadata }

export type {
  BadgeVariant,
  ProgressLink,
  TrendIndicator,
  KPIConfig,
  KPILoadingState,
} from '@repo/shared-types'

// Re-import for local use in DashboardConfig
import type { KPIConfig } from '@repo/shared-types'

export interface DashboardConfig {
  role: UserRole
  pageTitle: string
  breadcrumbs: Array<{
    label: string
    href?: string
  }>
  kpis: KPIConfig[]
  greeting?: string
}
