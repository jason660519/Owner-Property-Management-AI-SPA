// filepath: apps/superadmin/lib/actions/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// Fetch all properties for superadmin dashboard using service_role to bypass RLS
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { unstable_noStore as noStore } from 'next/cache';

export interface PropertyItem {
  id: string;
  type: 'sale' | 'rental';
  title: string;
  address: string;
  status: string;
  price: number | null;
  monthlyRent: number | null;
  ownerName: string | null;
  ownerId: string;
  area: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  createdAt: string;
}

export interface PropertiesResult {
  properties: PropertyItem[];
  totalSales: number;
  totalRentals: number;
}

export async function getAllProperties(): Promise<PropertiesResult> {
  noStore();
  const adminClient = createAdminClient();

  try {
    // Fetch all sales
    const { data: salesData, error: salesError } = await adminClient
      .from('property_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('[Properties] Error fetching property_sales:', salesError);
    }

    // Fetch all rentals
    const { data: rentalsData, error: rentalsError } = await adminClient
      .from('property_rentals')
      .select('*')
      .order('created_at', { ascending: false });

    if (rentalsError) {
      console.error('[Properties] Error fetching property_rentals:', rentalsError);
    }

    // Collect unique owner IDs to resolve display names
    const ownerIds = new Set<string>();
    (salesData || []).forEach((s) => ownerIds.add(s.owner_id));
    (rentalsData || []).forEach((r) => ownerIds.add(r.owner_id));

    // Fetch owner display names from users_profile
    // Note: users_profile has display_name but no email; fall back to auth.users for email
    let ownerMap: Record<string, string> = {};
    if (ownerIds.size > 0) {
      const { data: profiles } = await adminClient
        .from('users_profile')
        .select('id, display_name')
        .in('id', Array.from(ownerIds));

      if (profiles) {
        for (const p of profiles) {
          if (p.display_name) {
            ownerMap[p.id] = p.display_name;
          }
        }
      }
    }

    // Fill in missing names from auth.users (email / user_metadata)
    const missingOwners = Array.from(ownerIds).filter((id) => !ownerMap[id]);
    if (missingOwners.length > 0) {
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        for (const u of authData.users) {
          if (missingOwners.includes(u.id)) {
            ownerMap[u.id] =
              u.user_metadata?.display_name ||
              u.user_metadata?.name ||
              u.email ||
              u.id.slice(0, 8);
          }
        }
      }
    }

    // Normalize sales
    const salesProperties: PropertyItem[] = (salesData || []).map((s) => {
      const details = s.details || {};
      return {
        id: s.id,
        type: 'sale' as const,
        title: details.title || s.address,
        address: s.address,
        status: s.status,
        price: s.price,
        monthlyRent: null,
        ownerName: ownerMap[s.owner_id] || s.owner_id.slice(0, 8),
        ownerId: s.owner_id,
        area: details.area || null,
        propertyType: details.type || null,
        bedrooms: details.bedrooms || null,
        bathrooms: details.bathrooms || null,
        createdAt: s.created_at,
      };
    });

    // Normalize rentals
    const rentalProperties: PropertyItem[] = (rentalsData || []).map((r) => {
      const details = r.details || {};
      return {
        id: r.id,
        type: 'rental' as const,
        title: details.title || r.address,
        address: r.address,
        status: r.status,
        price: null,
        monthlyRent: r.monthly_rent,
        ownerName: ownerMap[r.owner_id] || r.owner_id.slice(0, 8),
        ownerId: r.owner_id,
        area: details.area || null,
        propertyType: details.type || null,
        bedrooms: details.bedrooms || null,
        bathrooms: details.bathrooms || null,
        createdAt: r.created_at,
      };
    });

    const properties = [...salesProperties, ...rentalProperties].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('[Properties] Fetched successfully:', {
      totalSales: salesProperties.length,
      totalRentals: rentalProperties.length,
      total: properties.length,
      timestamp: new Date().toISOString(),
    });

    return {
      properties,
      totalSales: salesProperties.length,
      totalRentals: rentalProperties.length,
    };
  } catch (error) {
    console.error('[Properties] Error fetching properties:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return { properties: [], totalSales: 0, totalRentals: 0 };
  }
}
