/**
 * @file index.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Central export point for all dashboard configurations
 */

import type { UserRole, DashboardConfig } from '@/components/dashboard'
import { landlordDashboardConfig } from './landlord'
import { contractedTenantDashboardConfig } from './contracted_tenant'
import { potentialTenantDashboardConfig } from './potential_tenant'
import { contractedBuyerDashboardConfig } from './contracted_buyer'
import { potentialBuyerDashboardConfig } from './potential_buyer'

/**
 * Dashboard configurations for all roles
 *
 * TODO: Implement configurations for:
 * - agent (Phase 4)
 * - service_provider (Phase 4)
 * - super_admin (Phase 5)
 */
export const dashboardConfigs: Record<UserRole, DashboardConfig> = {
  landlord: landlordDashboardConfig,
  contracted_tenant: contractedTenantDashboardConfig,
  potential_tenant: potentialTenantDashboardConfig,
  contracted_buyer: contractedBuyerDashboardConfig,
  potential_buyer: potentialBuyerDashboardConfig,
  agent: landlordDashboardConfig, // Placeholder
  service_provider: landlordDashboardConfig, // Placeholder
  super_admin: landlordDashboardConfig, // Placeholder
}

/**
 * Get dashboard configuration by role
 */
export function getDashboardConfig(role: UserRole): DashboardConfig {
  return dashboardConfigs[role] || landlordDashboardConfig
}

export { landlordDashboardConfig, contractedTenantDashboardConfig, potentialTenantDashboardConfig }
