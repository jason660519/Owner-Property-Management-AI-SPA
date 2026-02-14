// filepath: apps/superadmin/lib/actions/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// CRUD operations for superadmin properties using service_role to bypass RLS
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import type {
  PropertyItem,
  PropertiesResult,
  UpdatePropertyInput,
  ActionResult,
  SaleStatus,
  RentalStatus,
} from '@/lib/types/properties';
import { SALE_STATUSES, RENTAL_STATUSES } from '@/lib/types/properties';

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

// ── Update Property ─────────────────────────────────────────────────────
export async function updateProperty(
  id: string,
  type: 'sale' | 'rental',
  input: UpdatePropertyInput
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const table = type === 'sale' ? 'property_sales' : 'property_rentals';

  try {
    // Validate status against CHECK constraints
    if (input.status) {
      const validStatuses = type === 'sale' ? SALE_STATUSES : RENTAL_STATUSES;
      if (!validStatuses.includes(input.status as SaleStatus & RentalStatus)) {
        return {
          success: false,
          message: `無效的狀態「${input.status}」。有效值：${validStatuses.join(', ')}`,
        };
      }
    }

    // Validate price / rent >= 0
    if (type === 'sale' && input.price != null && input.price < 0) {
      return { success: false, message: '價格不能為負數' };
    }
    if (type === 'rental' && input.monthlyRent != null && input.monthlyRent < 0) {
      return { success: false, message: '月租金不能為負數' };
    }

    // First fetch existing record to merge details JSONB
    const { data: existing, error: fetchError } = await adminClient
      .from(table)
      .select('details')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`[Properties] Error fetching ${table} for update:`, fetchError);
      return { success: false, message: `找不到物件：${fetchError.message}` };
    }

    // Build the update payload for top-level columns
    const updatePayload: Record<string, unknown> = {};
    if (input.address !== undefined) updatePayload.address = input.address;
    if (input.status !== undefined) updatePayload.status = input.status;

    if (type === 'sale' && input.price !== undefined) {
      updatePayload.price = input.price;
    }
    if (type === 'rental') {
      if (input.monthlyRent !== undefined) updatePayload.monthly_rent = input.monthlyRent;
      if (input.leaseTerm !== undefined) updatePayload.lease_term = input.leaseTerm;
    }

    // Merge details JSONB (preserve existing fields not being updated)
    const existingDetails = existing?.details || {};
    const updatedDetails = { ...existingDetails };
    if (input.title !== undefined) updatedDetails.title = input.title;
    if (input.propertyType !== undefined) updatedDetails.type = input.propertyType;
    if (input.area !== undefined) updatedDetails.area = input.area;
    if (input.bedrooms !== undefined) updatedDetails.bedrooms = input.bedrooms;
    if (input.bathrooms !== undefined) updatedDetails.bathrooms = input.bathrooms;
    if (input.description !== undefined) updatedDetails.description = input.description;

    updatePayload.details = updatedDetails;

    const { error: updateError } = await adminClient
      .from(table)
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error(`[Properties] Error updating ${table}:`, updateError);
      return { success: false, message: `更新失敗：${updateError.message}` };
    }

    console.log(`[Properties] Updated ${table} id=${id}`, {
      fields: Object.keys(updatePayload),
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/superadmin/properties');
    revalidatePath('/superadmin');

    return { success: true, message: '物件已成功更新' };
  } catch (error) {
    console.error('[Properties] Unexpected error in updateProperty:', error);
    return {
      success: false,
      message: `更新失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}

// ── Delete Property ─────────────────────────────────────────────────────
export async function deleteProperty(
  id: string,
  type: 'sale' | 'rental'
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const table = type === 'sale' ? 'property_sales' : 'property_rentals';

  try {
    const { error } = await adminClient.from(table).delete().eq('id', id);

    if (error) {
      console.error(`[Properties] Error deleting from ${table}:`, error);
      return { success: false, message: `刪除失敗：${error.message}` };
    }

    console.log(`[Properties] Deleted from ${table} id=${id}`, {
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/superadmin/properties');
    revalidatePath('/superadmin');

    return { success: true, message: '物件已成功刪除' };
  } catch (error) {
    console.error('[Properties] Unexpected error in deleteProperty:', error);
    return {
      success: false,
      message: `刪除失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}
