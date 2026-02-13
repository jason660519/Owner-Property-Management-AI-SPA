// filepath: apps/superadmin/lib/actions/dashboard.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// fix: Use service_role admin client for ALL superadmin dashboard queries
//      - auth.admin.listUsers() requires service_role (anon key returns 403)
//      - Property table queries require service_role to bypass RLS for global counts
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { unstable_noStore as noStore } from 'next/cache';

export interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  activeRentals: number;
  activeListings: number;
  totalRevenue: number;
  pendingVerifications: number;
}

export async function getAdminDashboardStats(): Promise<AdminStats> {
  noStore();

  // Superadmin dashboard needs a global system-wide view of ALL data.
  // The service_role client:
  //   1. Can call auth.admin.listUsers() (anon key gets 403 "not_admin")
  //   2. Bypasses RLS on all tables (anon/session clients are filtered by RLS policies
  //      that restrict visibility by owner_id or status, e.g. only 'available'/'vacant')
  const adminClient = createAdminClient();

  try {
    // ── 1. Total users from Supabase Auth ─────────────────────────────
    // Paginate to handle datasets larger than default page size
    let totalUsers = 0;
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authUsersData, error: authError } =
        await adminClient.auth.admin.listUsers({ page, perPage });

      if (authError) {
        console.error('[Dashboard Stats] Error fetching auth users:', authError);
        throw authError;
      }

      totalUsers += authUsersData.users?.length || 0;

      if (!authUsersData.users || authUsersData.users.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // ── 2. Property counts (bypass RLS with service_role) ─────────────
    // Without service_role, RLS policies filter results:
    //   - property_sales: only status='available' visible to public
    //   - property_rentals: only status='vacant' visible to public
    //   - landlords: only own properties (owner_id = auth.uid())
    // Superadmin needs to see ALL properties regardless of status/owner.
    const { count: salesCount, error: salesError } = await adminClient
      .from('property_sales')
      .select('*', { count: 'exact', head: true });

    if (salesError) {
      console.error('[Dashboard Stats] Error counting property_sales:', salesError);
    }

    const { count: rentalsCount, error: rentalsError } = await adminClient
      .from('property_rentals')
      .select('*', { count: 'exact', head: true });

    if (rentalsError) {
      console.error('[Dashboard Stats] Error counting property_rentals:', rentalsError);
    }

    const { count: activeRentals, error: activeRentalsError } = await adminClient
      .from('property_rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rented');

    if (activeRentalsError) {
      console.error('[Dashboard Stats] Error counting active rentals:', activeRentalsError);
    }

    const { count: activeListings, error: activeListingsError } = await adminClient
      .from('property_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    if (activeListingsError) {
      console.error('[Dashboard Stats] Error counting active listings:', activeListingsError);
    }

    const stats: AdminStats = {
      totalUsers,
      totalProperties: (salesCount || 0) + (rentalsCount || 0),
      activeRentals: activeRentals || 0,
      activeListings: activeListings || 0,
      totalRevenue: 0,
      pendingVerifications: 0,
    };

    console.log('[Dashboard Stats] Fetched successfully:', {
      totalUsers,
      totalProperties: stats.totalProperties,
      salesCount,
      rentalsCount,
      activeRentals: stats.activeRentals,
      activeListings: stats.activeListings,
      timestamp: new Date().toISOString(),
      source: 'adminClient (service_role, bypasses RLS)',
    });

    return stats;
  } catch (error) {
    console.error('[Dashboard Stats] Error fetching admin stats:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return {
      totalUsers: 0,
      totalProperties: 0,
      activeRentals: 0,
      activeListings: 0,
      totalRevenue: 0,
      pendingVerifications: 0,
    };
  }
}
