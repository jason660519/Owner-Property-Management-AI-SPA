'use server';

import { createClient } from '@/utils/supabase/server';
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
  const supabase = await createClient();
  try {
    const { count: totalUsers } = await supabase
      .from('users_profile')
      .select('*', { count: 'exact', head: true });

    const { count: salesCount } = await supabase
      .from('property_sales')
      .select('*', { count: 'exact', head: true });
    const { count: rentalsCount } = await supabase
      .from('property_rentals')
      .select('*', { count: 'exact', head: true });

    const { count: activeRentals } = await supabase
      .from('property_rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rented');

    const { count: activeListings } = await supabase
      .from('property_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    return {
      totalUsers: totalUsers || 0,
      totalProperties: (salesCount || 0) + (rentalsCount || 0),
      activeRentals: activeRentals || 0,
      activeListings: activeListings || 0,
      totalRevenue: 0,
      pendingVerifications: 0,
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
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
