// filepath: apps/superadmin/lib/actions/dashboard.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// fix: Use service_role admin client for ALL superadmin dashboard queries
//      - auth.admin.listUsers() requires service_role (anon key returns 403)
//      - Property table queries require service_role to bypass RLS for global counts
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { unstable_noStore as noStore } from 'next/cache';
import { FALLBACK_STATS } from './dashboard-types';
import type { AdminStats } from './dashboard-types';

export async function getAdminDashboardStats(): Promise<AdminStats> {
  noStore();

  try {
    // Superadmin dashboard needs a global system-wide view of ALL data.
    // The service_role client:
    //   1. Can call auth.admin.listUsers() (anon key gets 403 "not_admin")
    //   2. Bypasses RLS on all tables (anon/session clients are filtered by RLS policies
    //      that restrict visibility by owner_id or status, e.g. only 'available'/'vacant')
    const adminClient = createAdminClient();
    // All dashboard numeric fields are read from Supabase (live sync). Seed data: 20260215200000_seed_superadmin_dashboard_data.sql when DB is empty.
    // ── 1. Total users + active (7d) + online (24h) from Supabase Auth ─
    let totalUsers = 0;
    let activeUsersCount = 0;
    let onlineUsersCount = 0;
    const onlineThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
    const activeThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7d
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

      const batch = authUsersData.users?.length || 0;
      totalUsers += batch;
      authUsersData.users?.forEach((u) => {
        if (u.last_sign_in_at) {
          const t = new Date(u.last_sign_in_at);
          if (t > onlineThreshold) onlineUsersCount += 1;
          if (t > activeThreshold) activeUsersCount += 1;
        }
      });

      if (!authUsersData.users || authUsersData.users.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // ── 2. Total groups + total roles + superadmin count from IAM ─────
    const { count: totalGroups, error: groupsError } = await adminClient
      .from('iam_groups')
      .select('*', { count: 'exact', head: true });

    if (groupsError) {
      console.error('[Dashboard Stats] Error counting iam_groups:', groupsError);
    }

    const { count: totalRoles, error: rolesError } = await adminClient
      .from('iam_roles')
      .select('*', { count: 'exact', head: true });

    if (rolesError) {
      console.error('[Dashboard Stats] Error counting iam_roles:', rolesError);
    }

    const { data: adminGroup } = await adminClient
      .from('iam_groups')
      .select('id')
      .eq('name', 'Administrators')
      .maybeSingle();

    let superadminCount = 0;
    if (adminGroup?.id) {
      const { count: superCount, error: superError } = await adminClient
        .from('iam_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', adminGroup.id);
      if (!superError) superadminCount = superCount ?? 0;
    }

    // ── 3. Property counts (bypass RLS with service_role) ─────────────
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

    const { count: overdueSalesCount, error: overdueSalesError } = await adminClient
      .from('property_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (overdueSalesError) {
      console.error('[Dashboard Stats] Error counting overdue sales (pending):', overdueSalesError);
    }

    const { count: soldSalesCount, error: soldSalesError } = await adminClient
      .from('property_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    if (soldSalesError) {
      console.error('[Dashboard Stats] Error counting sold sales:', soldSalesError);
    }

    const { count: overdueRentalsCount, error: overdueRentalsError } = await adminClient
      .from('property_rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'maintenance');

    if (overdueRentalsError) {
      console.error('[Dashboard Stats] Error counting overdue rentals (maintenance):', overdueRentalsError);
    }

    // ── 4. Blog posts count ─────────────────────────────────────────
    const { count: totalBlogs, error: blogError } = await adminClient
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });

    if (blogError) {
      console.error('[Dashboard Stats] Error counting blog_posts:', blogError);
    }

    // ── 5. 出售物件概覽：調查報告書、買賣合約、出售部落格 ───────────
    const { count: surveyReportForSales, error: surveyError } = await adminClient
      .from('property_documents')
      .select('*', { count: 'exact', head: true })
      .eq('property_type', 'sales');

    if (surveyError) {
      console.error('[Dashboard Stats] Error counting property_documents (sales):', surveyError);
    }

    const { count: salesContractsCount, error: salesAgreementsError } = await adminClient
      .from('sales_agreements')
      .select('*', { count: 'exact', head: true });

    if (salesAgreementsError) {
      console.error('[Dashboard Stats] Error counting sales_agreements:', salesAgreementsError);
    }

    const { count: salesBlogCount, error: salesBlogError } = await adminClient
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });

    if (salesBlogError) {
      console.error('[Dashboard Stats] Error counting blog_posts for sales:', salesBlogError);
    }

    // ── 6. 出租物件概覽：調查報告書、租賃合約、出租部落格 ───────────
    const { count: surveyReportForRentals, error: surveyRentalError } = await adminClient
      .from('property_documents')
      .select('*', { count: 'exact', head: true })
      .eq('property_type', 'rentals');

    if (surveyRentalError) {
      console.error('[Dashboard Stats] Error counting property_documents (rentals):', surveyRentalError);
    }

    const { count: leaseContractsCount, error: leaseAgreementsError } = await adminClient
      .from('lease_agreements')
      .select('*', { count: 'exact', head: true });

    if (leaseAgreementsError) {
      console.error('[Dashboard Stats] Error counting lease_agreements:', leaseAgreementsError);
    }

    const { count: rentalBlogCount, error: rentalBlogError } = await adminClient
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });

    if (rentalBlogError) {
      console.error('[Dashboard Stats] Error counting blog_posts for rental:', rentalBlogError);
    }

    // ── 7. 尚未完成拍照的物件數 (property_photos) ─────────────────────
    const { data: withoutPhotoRows, error: withoutPhotoError } = await adminClient
      .rpc('get_properties_without_photo_counts');

    if (withoutPhotoError) {
      console.error('[Dashboard Stats] Error get_properties_without_photo_counts:', withoutPhotoError);
    }
    const row0 = Array.isArray(withoutPhotoRows) ? withoutPhotoRows[0] : withoutPhotoRows;
    const salesWithoutPhotoCount = row0 ? Number(row0.sales_without_photo ?? 0) : 0;
    const rentalsWithoutPhotoCount = row0 ? Number(row0.rentals_without_photo ?? 0) : 0;

    // ── 8. 尚未完成行銷部落格的物件數 (blog_posts.property_id) ─────────────
    const { data: withoutBlogRows, error: withoutBlogError } = await adminClient
      .rpc('get_properties_without_blog_counts');
    if (withoutBlogError) {
      console.error('[Dashboard Stats] Error get_properties_without_blog_counts:', withoutBlogError);
    }
    const blogRow0 = Array.isArray(withoutBlogRows) ? withoutBlogRows[0] : withoutBlogRows;
    const salesWithoutBlogCount = blogRow0 ? Number(blogRow0.sales_without_blog ?? 0) : 0;
    const rentalsWithoutBlogCount = blogRow0 ? Number(blogRow0.rentals_without_blog ?? 0) : 0;

    const stats: AdminStats = {
      totalUsers,
      totalGroups: totalGroups ?? 0,
      totalRoles: totalRoles ?? 0,
      superadminCount,
      activeUsersCount,
      onlineUsersCount,
      totalProperties: (salesCount || 0) + (rentalsCount || 0),
      totalSales: salesCount ?? 0,
      totalRentals: rentalsCount ?? 0,
      overdueSalesCount: overdueSalesCount ?? 0,
      overdueRentalsCount: overdueRentalsCount ?? 0,
      soldSalesCount: soldSalesCount ?? 0,
      totalBlogs: totalBlogs ?? 0,
      surveyReportCountForSales: surveyReportForSales ?? 0,
      salesContractsCount: salesContractsCount ?? 0,
      salesBlogCount: salesBlogCount ?? 0,
      surveyReportCountForRentals: surveyReportForRentals ?? 0,
      leaseContractsCount: leaseContractsCount ?? 0,
      rentalBlogCount: rentalBlogCount ?? 0,
      salesWithoutPhotoCount,
      rentalsWithoutPhotoCount,
      salesWithoutBlogCount,
      rentalsWithoutBlogCount,
      activeRentals: activeRentals || 0,
      activeListings: activeListings || 0,
      totalRevenue: 0,
      pendingVerifications: 0,
    };

    console.log('[Dashboard Stats] Fetched successfully:', {
      totalUsers,
      totalGroups: stats.totalGroups,
      totalRoles: stats.totalRoles,
      superadminCount: stats.superadminCount,
      activeUsersCount: stats.activeUsersCount,
      onlineUsersCount: stats.onlineUsersCount,
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
    return FALLBACK_STATS;
  }
}
