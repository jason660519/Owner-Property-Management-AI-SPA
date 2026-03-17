// filepath: apps/superadmin/lib/actions/properties.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// CRUD operations for superadmin properties using service_role to bypass RLS
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import type {
  PropertyItem,
  PropertiesResult,
  UpdatePropertyInput,
  CreatePropertyInput,
  OwnerOption,
  ActionResult,
  SaleStatus,
  RentalStatus,
  PropertyPhotoItem,
  PropertyDocumentItem,
  BuildingTranscriptData,
  LandTranscriptData,
} from '@/lib/types/properties';
import { SALE_STATUSES, RENTAL_STATUSES } from '@/lib/types/properties';

/**
 * Paginated fetch: Supabase/PostgREST caps each request at `max_rows` (default 1000).
 * This helper fetches all rows by iterating with `.range()`.
 */
async function fetchAllRows<T extends Record<string, unknown>>(
  client: ReturnType<typeof createAdminClient>,
  table: string,
  orderCol = 'created_at',
): Promise<{ data: T[]; error: Error | null }> {
  const PAGE = 1000;
  const allRows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(orderCol, { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) return { data: allRows, error };
    if (!data || data.length === 0) break;
    allRows.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return { data: allRows, error: null };
}

export async function getAllProperties(): Promise<PropertiesResult> {
  noStore();
  const adminClient = createAdminClient();

  try {
    const { data: salesData, error: salesError } = await fetchAllRows(
      adminClient, 'property_sales',
    );

    if (salesError) {
      console.error('[Properties] Error fetching property_sales:', salesError);
    }

    const { data: rentalsData, error: rentalsError } = await fetchAllRows(
      adminClient, 'property_rentals',
    );

    if (rentalsError) {
      console.error('[Properties] Error fetching property_rentals:', rentalsError);
    }

    // Collect unique owner IDs (system creator) to resolve display names
    const creatorIds = new Set<string>();
    (salesData || []).forEach((s) => typeof s.owner_id === 'string' && creatorIds.add(s.owner_id));
    (rentalsData || []).forEach((r) => typeof r.owner_id === 'string' && creatorIds.add(r.owner_id));

    // creatorMap: system user who created/imported the property
    const creatorMap: Record<string, string> = {};
    if (creatorIds.size > 0) {
      const { data: profiles } = await adminClient
        .from('users_profile')
        .select('id, display_name')
        .in('id', Array.from(creatorIds));

      if (profiles) {
        for (const p of profiles) {
          if (p.display_name) {
            creatorMap[p.id] = p.display_name;
          }
        }
      }
    }

    const missingCreators = Array.from(creatorIds).filter((id) => !creatorMap[id]);
    if (missingCreators.length > 0) {
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        for (const u of authData.users) {
          if (missingCreators.includes(u.id)) {
            creatorMap[u.id] =
              u.user_metadata?.display_name ||
              u.user_metadata?.name ||
              u.email ||
              u.id.slice(0, 8);
          }
        }
      }
    }

    // Fetch real property owners from property_owners table
    // ownerAggMap: property_id → { firstName, count } for display like "余逸凡等6人"
    const ownerAggMap: Record<string, { firstName: string; count: number }> = {};
    const { data: ownersData } = await adminClient
      .from('property_owners')
      .select('property_id, owner_name')
      .order('created_at', { ascending: true });

    if (ownersData) {
      for (const o of ownersData) {
        const pid = o.property_id as string | null;
        const name = o.owner_name as string | null;
        if (!pid || !name) continue;

        if (!ownerAggMap[pid]) {
          ownerAggMap[pid] = { firstName: name, count: 1 };
        } else {
          ownerAggMap[pid].count += 1;
        }
      }
    }

    // Fetch all primary photos in one query (no .in() to avoid URL length limits with thousands of IDs)
    const primaryPhotoMap: Record<string, string> = {};
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const { data: primaryPhotos } = await adminClient
      .from('property_photos')
      .select('property_id, storage_path')
      .eq('is_primary', true);
    if (primaryPhotos) {
      for (const p of primaryPhotos) {
        if (p.property_id && !primaryPhotoMap[p.property_id]) {
          primaryPhotoMap[p.property_id] =
            `${baseUrl}/storage/v1/object/public/property-photos/${p.storage_path}`;
        }
      }
    }

    // Helper: normalize a DB row into PropertyItem
    function toPropertyItem(
      row: Record<string, unknown>,
      type: 'sale' | 'rental'
    ): PropertyItem {
      const details = (row.details || {}) as Record<string, unknown>;
      const propertyId = row.id as string;
      const systemUserId = row.owner_id as string;
    const ownerAgg = ownerAggMap[propertyId];
    let ownerName: string | null = null;

    if (ownerAgg) {
      ownerName =
        ownerAgg.count > 1
          ? `${ownerAgg.firstName}等${ownerAgg.count}人`
          : ownerAgg.firstName;
    } else {
      // Fallback: derive from saved transcript ownership if property_owners 尚未建好
      const buildingTranscript = details.buildingTranscript as BuildingTranscriptData | undefined;
      const landTranscript = details.landTranscript as LandTranscriptData | undefined;
      const buildingOwners = buildingTranscript?.ownership ?? [];
      const landOwners = landTranscript?.ownership ?? [];
      const transcriptOwners = buildingOwners.length > 0 ? buildingOwners : landOwners;

      if (transcriptOwners.length > 0) {
        const first = transcriptOwners[0];
        const name = typeof first.ownerName === 'string' ? first.ownerName.trim() : '';
        if (name) {
          const count = transcriptOwners.length;
          ownerName = count > 1 ? `${name}等${count}人` : name;
        }
      }
    }
      return {
        id: propertyId,
        type,
        title:
          (row.title as string) ?? (details.title as string) ?? (row.address as string),
        address: row.address as string,
        addressCity: (row.address_city as string) ?? undefined,
        addressDistrict: (row.address_district as string) ?? undefined,
        addressStreet: (row.address_street as string) ?? undefined,
        addressNumber: (row.address_number as string) ?? undefined,
        addressFloor: (row.address_floor as string) ?? undefined,
        addressUnit: (row.address_unit as string) ?? undefined,
        status: row.status as string,
        price: type === 'sale' ? (row.price as number) : null,
        monthlyRent: type === 'rental' ? (row.monthly_rent as number) : null,
        creatorName: creatorMap[systemUserId] || systemUserId.slice(0, 8),
        ownerName,
        ownerId: systemUserId,
        area:
          (row.area_registered as number | null) ??
          (details.area as number | null) ??
          null,
        propertyType:
          (row.building_type as string | null) ??
          (details.type as string | null) ??
          null,
        bedrooms:
          (row.layout_rooms as number | null) ??
          (details.bedrooms as number | null) ??
          null,
        bathrooms:
          (row.layout_bathrooms as number | null) ??
          (details.bathrooms as number | null) ??
          null,
        livingRooms:
          (row.layout_living_rooms as number | null) ??
          (details.livingRooms as number | null) ??
          null,
        parkingSpaces:
          (details.parkingSpaces as number | null) ??
          ((row.has_parking as boolean) ? 1 : 0),
        createdAt: row.created_at as string,
        mainPhotoUrl: primaryPhotoMap[propertyId] ?? null,
        latitude: (row.latitude as number | null) ?? null,
        longitude: (row.longitude as number | null) ?? null,
        isPureLand: (row.is_pure_land as boolean) ?? false,
        landNumber: (row.land_number as string) ?? null,
      };
    }

    const salesProperties: PropertyItem[] = (salesData || []).map((s) =>
      toPropertyItem(s as Record<string, unknown>, 'sale')
    );

    const rentalProperties: PropertyItem[] = (rentalsData || []).map((r) =>
      toPropertyItem(r as Record<string, unknown>, 'rental')
    );

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

// ── Get Single Property ───────────────────────────────────────────────────
export async function getPropertyById(id: string): Promise<PropertyItem | null> {
  noStore();
  const adminClient = createAdminClient();

  // Try sale table first, then rental
  const { data: saleRow } = await adminClient
    .from('property_sales')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  let row: Record<string, unknown> | null = null;
  let type: 'sale' | 'rental' = 'sale';

  if (saleRow) {
    row = saleRow as Record<string, unknown>;
    type = 'sale';
  } else {
    const { data: rentalRow } = await adminClient
      .from('property_rentals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!rentalRow) return null;
    row = rentalRow as Record<string, unknown>;
    type = 'rental';
  }

  const systemUserId = row.owner_id as string;

  // Resolve creator display name
  let creatorName = systemUserId.slice(0, 8);
  const { data: profile } = await adminClient
    .from('users_profile')
    .select('display_name')
    .eq('id', systemUserId)
    .maybeSingle();
  if (profile?.display_name) {
    creatorName = profile.display_name as string;
  } else {
    const { data: authData } = await adminClient.auth.admin.getUserById(systemUserId);
    if (authData?.user) {
      creatorName =
        (authData.user.user_metadata?.display_name as string) ||
        (authData.user.user_metadata?.name as string) ||
        authData.user.email ||
        systemUserId.slice(0, 8);
    }
  }

  // Resolve real owner name (first from property_owners; fallback to transcript ownership if needed)
  const { data: ownerData } = await adminClient
    .from('property_owners')
    .select('owner_name')
    .eq('property_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  let ownerName: string | null = null;
  if (ownerData?.owner_name) {
    ownerName = ownerData.owner_name as string;
  } else {
    const details = (row.details || {}) as Record<string, unknown>;
    const buildingTranscript = details.buildingTranscript as BuildingTranscriptData | undefined;
    const landTranscript = details.landTranscript as LandTranscriptData | undefined;
    const buildingOwners = buildingTranscript?.ownership ?? [];
    const landOwners = landTranscript?.ownership ?? [];
    const transcriptOwners = buildingOwners.length > 0 ? buildingOwners : landOwners;
    if (transcriptOwners.length > 0) {
      const first = transcriptOwners[0];
      const name = typeof first.ownerName === 'string' ? first.ownerName.trim() : '';
      if (name) {
        const count = transcriptOwners.length;
        ownerName = count > 1 ? `${name}等${count}人` : name;
      }
    }
  }

  // Fetch primary photo from property_photos (SSOT)
  const { data: primaryPhotoRow } = await adminClient
    .from('property_photos')
    .select('storage_path')
    .eq('property_id', id)
    .eq('is_primary', true)
    .limit(1)
    .maybeSingle();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const mainPhotoUrl = primaryPhotoRow?.storage_path
    ? `${baseUrl}/storage/v1/object/public/property-photos/${primaryPhotoRow.storage_path}`
    : null;

  const details = (row.details || {}) as Record<string, unknown>;

  return {
    id,
    type,
    title: (row.title as string) ?? (details.title as string) ?? (row.address as string),
    address: row.address as string,
    addressCity: (row.address_city as string) ?? undefined,
    addressDistrict: (row.address_district as string) ?? undefined,
    addressStreet: (row.address_street as string) ?? undefined,
    addressNumber: (row.address_number as string) ?? undefined,
    addressFloor: (row.address_floor as string) ?? undefined,
    addressUnit: (row.address_unit as string) ?? undefined,
    status: row.status as string,
    price: type === 'sale' ? (row.price as number) : null,
    monthlyRent: type === 'rental' ? (row.monthly_rent as number) : null,
    creatorName,
    ownerName,
    ownerId: systemUserId,
    area:
      (row.area_registered as number | null) ??
      (details.area as number | null) ??
      null,
    propertyType:
      (row.building_type as string | null) ??
      (details.type as string | null) ??
      null,
    bedrooms:
      (row.layout_rooms as number | null) ??
      (details.bedrooms as number | null) ??
      null,
    bathrooms:
      (row.layout_bathrooms as number | null) ??
      (details.bathrooms as number | null) ??
      null,
    livingRooms:
      (row.layout_living_rooms as number | null) ??
      (details.livingRooms as number | null) ??
      null,
    parkingSpaces:
      (details.parkingSpaces as number | null) ??
      ((row.has_parking as boolean) ? 1 : 0),
    createdAt: row.created_at as string,
    mainPhotoUrl,
    buildingTranscript: (details.buildingTranscript as BuildingTranscriptData) ?? null,
    landTranscript: (details.landTranscript as LandTranscriptData) ?? null,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    isPureLand: (row.is_pure_land as boolean) ?? false,
    landNumber: (row.land_number as string) ?? null,
  };
}

// ── Save Transcript Data ──────────────────────────────────────────────────
export async function savePropertyTranscriptData(
  id: string,
  type: 'sale' | 'rental',
  data: { buildingTranscript?: BuildingTranscriptData; landTranscript?: LandTranscriptData }
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const table = type === 'sale' ? 'property_sales' : 'property_rentals';

  try {
    const { data: existing, error: fetchError } = await adminClient
      .from(table)
      .select('details')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { success: false, message: `找不到物件：${fetchError.message}` };
    }

    const existingDetails = (existing?.details || {}) as Record<string, unknown>;
    const updatedDetails = { ...existingDetails };
    if (data.buildingTranscript !== undefined) {
      updatedDetails.buildingTranscript = data.buildingTranscript;
    }
    if (data.landTranscript !== undefined) {
      updatedDetails.landTranscript = data.landTranscript;
    }

    const { error } = await adminClient
      .from(table)
      .update({ details: updatedDetails })
      .eq('id', id);

    if (error) {
      return { success: false, message: `儲存失敗：${error.message}` };
    }

    // Sync primary legal owner name to property_owners so list page顯示最新「所有權人」
    // 1) Try buildingTranscript.ownership → first non-empty ownerName
    // 2) Fallback to landTranscript.ownership
    const buildingOwners = data.buildingTranscript?.ownership ?? [];
    const landOwners = data.landTranscript?.ownership ?? [];
    const primaryOwnerName =
      buildingOwners.find((o) => o.ownerName && o.ownerName.trim().length > 0)?.ownerName?.trim() ??
      landOwners.find((o) => o.ownerName && o.ownerName.trim().length > 0)?.ownerName?.trim() ??
      null;

    if (primaryOwnerName) {
      // property_owners: upsert first row for this property (keep other columns/rows intact)
      const { data: existingOwner } = await adminClient
        .from('property_owners')
        .select('id')
        .eq('property_id', id)
        .eq('property_type', type)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingOwner?.id) {
        await adminClient
          .from('property_owners')
          .update({ owner_name: primaryOwnerName })
          .eq('id', existingOwner.id);
      } else {
        await adminClient.from('property_owners').insert({
          property_id: id,
          property_type: type,
          owner_name: primaryOwnerName,
        });
      }
    }

    revalidatePath(`/superadmin/properties/${id}/edit`);
    revalidatePath('/superadmin/properties');
    return { success: true, message: '謄本資料已成功儲存' };
  } catch (error) {
    return {
      success: false,
      message: `儲存失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}

// ── Get Owners List ──────────────────────────────────────────────────────
export async function getOwnersList(): Promise<OwnerOption[]> {
  const adminClient = createAdminClient();
  const { data: profiles } = await adminClient
    .from('users_profile')
    .select('id, display_name')
    .order('display_name', { ascending: true });

  if (!profiles?.length) return [];
  return profiles
    .filter((p) => p.display_name)
    .map((p) => ({ id: p.id, displayName: p.display_name as string }));
}

// ── Create Property ──────────────────────────────────────────────────────
export async function createProperty(
  type: 'sale' | 'rental',
  input: CreatePropertyInput
): Promise<ActionResult & { propertyId?: string }> {
  const adminClient = createAdminClient();
  const table = type === 'sale' ? 'property_sales' : 'property_rentals';

  try {
    // Resolve ownerId — default to current session user if not provided
    let resolvedOwnerId = input.ownerId;
    if (!resolvedOwnerId) {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (!user) return { success: false, message: '無法取得使用者身份，請重新登入' };
      resolvedOwnerId = user.id;
    }

    if (type === 'sale' && (input.price ?? 0) < 0) {
      return { success: false, message: '價格不能為負數' };
    }
    if (type === 'rental' && (input.monthlyRent ?? 0) < 0) {
      return { success: false, message: '月租金不能為負數' };
    }

    const details: Record<string, unknown> = {};
    if (input.title) details.title = input.title;
    if (input.propertyType) details.type = input.propertyType;
    if (input.area != null) details.area = input.area;
    if (input.bedrooms != null) details.bedrooms = input.bedrooms;
    if (input.bathrooms != null) details.bathrooms = input.bathrooms;
    if (input.livingRooms != null) details.livingRooms = input.livingRooms;
    if (input.parkingSpaces != null) details.parkingSpaces = input.parkingSpaces;
    if (input.description) details.description = input.description;

    const insertPayload: Record<string, unknown> = {
      owner_id: resolvedOwnerId,
      address: input.address ?? '',
      status: input.status || 'pending',
      details,
    };
    if (input.title) insertPayload.title = input.title;
    if (input.addressCity) insertPayload.address_city = input.addressCity;
    if (input.addressDistrict) insertPayload.address_district = input.addressDistrict;
    if (input.addressStreet) insertPayload.address_street = input.addressStreet;
    if (input.addressNumber) insertPayload.address_number = input.addressNumber;
    if (input.addressFloor) insertPayload.address_floor = input.addressFloor;
    if (input.addressUnit) insertPayload.address_unit = input.addressUnit;

    if (input.latitude != null) insertPayload.latitude = input.latitude;
    if (input.longitude != null) insertPayload.longitude = input.longitude;

    if (type === 'sale') {
      insertPayload.price = input.price ?? 0;
    } else {
      insertPayload.monthly_rent = input.monthlyRent ?? 0;
      insertPayload.lease_term = input.leaseTerm ?? 12;
    }

    const { data, error } = await adminClient
      .from(table)
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      console.error(`[Properties] Error inserting into ${table}:`, error);
      return { success: false, message: `新增失敗：${error.message}` };
    }

    console.log(`[Properties] Created ${table} id=${data.id}`, {
      timestamp: new Date().toISOString(),
    });

    revalidatePath('/superadmin/properties');
    revalidatePath('/superadmin');

    return { success: true, message: '物件已成功新增', propertyId: data.id };
  } catch (error) {
    console.error('[Properties] Unexpected error in createProperty:', error);
    return {
      success: false,
      message: `新增失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
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
    // Validate status against allowed values
    if (input.status) {
      const { PROPERTY_STATUSES } = await import('@/lib/types/properties');
      if (!(PROPERTY_STATUSES as readonly string[]).includes(input.status)) {
        return {
          success: false,
          message: `無效的狀態「${input.status}」。有效值：${PROPERTY_STATUSES.join(', ')}`,
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

    // Build the update payload for top-level columns (including title + structured address)
    const updatePayload: Record<string, unknown> = {};
    if (input.address !== undefined) updatePayload.address = input.address;
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.addressCity !== undefined) updatePayload.address_city = input.addressCity;
    if (input.addressDistrict !== undefined) updatePayload.address_district = input.addressDistrict;
    if (input.addressStreet !== undefined) updatePayload.address_street = input.addressStreet;
    if (input.addressNumber !== undefined) updatePayload.address_number = input.addressNumber;
    if (input.addressFloor !== undefined) updatePayload.address_floor = input.addressFloor;
    if (input.addressUnit !== undefined) updatePayload.address_unit = input.addressUnit;
    if (input.status !== undefined) updatePayload.status = input.status;

    if (type === 'sale' && input.price !== undefined) {
      updatePayload.price = input.price;
    }
    if (type === 'rental') {
      if (input.monthlyRent !== undefined) updatePayload.monthly_rent = input.monthlyRent;
      if (input.leaseTerm !== undefined) updatePayload.lease_term = input.leaseTerm;
    }

    // Write dedicated top-level columns so the list page reads fresh values
    // (getAllProperties / getPropertyById read these columns first, falling back to details)
    if (input.propertyType !== undefined) updatePayload.building_type = input.propertyType;
    if (input.area !== undefined) updatePayload.area_registered = input.area;
    if (input.bedrooms !== undefined) updatePayload.layout_rooms = input.bedrooms;
    if (input.livingRooms !== undefined) updatePayload.layout_living_rooms = input.livingRooms;
    if (input.bathrooms !== undefined) updatePayload.layout_bathrooms = input.bathrooms;
    if (input.parkingSpaces !== undefined) updatePayload.has_parking = (input.parkingSpaces ?? 0) > 0;
    if (input.latitude !== undefined) updatePayload.latitude = input.latitude;
    if (input.longitude !== undefined) updatePayload.longitude = input.longitude;

    // Merge details JSONB (preserve existing fields; address fields now live only in top-level columns)
    const existingDetails = (existing?.details || {}) as Record<string, unknown>;
    const updatedDetails = { ...existingDetails };
    if (input.title !== undefined) updatedDetails.title = input.title;
    if (input.propertyType !== undefined) updatedDetails.type = input.propertyType;
    if (input.area !== undefined) updatedDetails.area = input.area;
    if (input.bedrooms !== undefined) updatedDetails.bedrooms = input.bedrooms;
    if (input.bathrooms !== undefined) updatedDetails.bathrooms = input.bathrooms;
    if (input.livingRooms !== undefined) updatedDetails.livingRooms = input.livingRooms;
    if (input.parkingSpaces !== undefined) updatedDetails.parkingSpaces = input.parkingSpaces;
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
    revalidatePath(`/superadmin/properties/${id}/edit`);
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

// ── Property Photos & Documents (for edit modal) ─────────────────────────────

export async function getPropertyPhotos(propertyId: string): Promise<PropertyPhotoItem[]> {
  const adminClient = createAdminClient();
  const { data: rows, error } = await adminClient
    .from('property_photos')
    .select('id, storage_path, is_primary, photo_type, sort_order, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });

  if (error || !rows?.length) return [];

  // Sort in TS: non-zero sort_order ascending, sort_order=0 (unordered) goes to end
  const sorted = [...rows].sort((a, b) => {
    const ao = a.sort_order || Infinity;
    const bo = b.sort_order || Infinity;
    if (ao !== bo) return ao - bo;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const bucket = 'property-photos';
  return sorted.map((r) => ({
    id: r.id,
    storagePath: r.storage_path,
    url: `${baseUrl}/storage/v1/object/public/${bucket}/${r.storage_path}`,
    isPrimary: !!r.is_primary,
    photoType: r.photo_type ?? 'interior',
    sortOrder: r.sort_order ?? 0,
  }));
}

export async function getPropertyDocuments(
  propertyId: string
): Promise<PropertyDocumentItem[]> {
  const adminClient = createAdminClient();
  const { data: rows, error } = await adminClient
    .from('property_documents')
    .select('id, document_type, document_name, file_path')
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !rows?.length) return [];

  // 謄本為隱私：不暴露直接 Storage URL，改為需權限檢查的檢視 API（會 302 到短期 signed URL）
  return rows.map((r) => ({
    id: r.id,
    documentType: r.document_type,
    documentName: r.document_name,
    filePath: r.file_path,
    url: `/api/documents/${r.id}/view`,
  }));
}

/** 取得單一文件的已儲存解析結果（用於進入／切換謄本時還原顯示，不影響文件列表） */
export async function getDocumentParseResult(documentId: string): Promise<{
  parsedResult: import('@/lib/types/transcript').TranscriptParseOutput | null;
  consensusMetadata: import('@/lib/types/transcript').ConsensusMetadata | null;
} | null> {
  if (!documentId) return null;
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('property_documents')
    .select('parsed_result, consensus_metadata')
    .eq('id', documentId)
    .single();
  if (error || !data) return null;
  return {
    parsedResult: (data.parsed_result as import('@/lib/types/transcript').TranscriptParseOutput) ?? null,
    consensusMetadata: (data.consensus_metadata as import('@/lib/types/transcript').ConsensusMetadata) ?? null,
  };
}

/**
 * Move a photo to a specific position (1-based) within the property.
 * Renumbers ALL photos in the property so sort_order is always contiguous (1, 2, 3 …).
 * Position 1 automatically becomes the primary photo.
 */
export async function updatePhotoSortOrder(
  propertyId: string,
  photoId: string,
  targetPosition: number
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  // Fetch all photos for this property in current display order
  const { data: rows, error: fetchErr } = await adminClient
    .from('property_photos')
    .select('id, sort_order, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });

  if (fetchErr || !rows) return { success: false, message: `讀取照片失敗：${fetchErr?.message}` };

  // Sort in TS: non-zero sort_order first (ascending), then created_at for unordered (sort_order === 0)
  const sorted = [...rows].sort((a, b) => {
    const ao = a.sort_order || Infinity;
    const bo = b.sort_order || Infinity;
    if (ao !== bo) return ao - bo;
    return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
  });

  // Re-insert the moved photo at the requested position
  const clamped = Math.max(1, Math.min(targetPosition, sorted.length));
  const withoutTarget = sorted.filter((r) => r.id !== photoId);
  withoutTarget.splice(clamped - 1, 0, { id: photoId, sort_order: clamped, created_at: '' });

  // Batch-update sort_order + is_primary for every photo
  for (let i = 0; i < withoutTarget.length; i++) {
    const pos = i + 1;
    const { error } = await adminClient
      .from('property_photos')
      .update({
        sort_order: pos,
        is_primary: pos === 1,
        photo_type: pos === 1 ? 'primary' : 'interior',
      })
      .eq('id', withoutTarget[i].id);
    if (error) return { success: false, message: `更新排序失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: 'ok' };
}

/**
 * Step 1 of direct-upload flow:
 * Generate a signed upload URL so the browser can PUT the file directly to
 * Supabase Storage without routing the bytes through Next.js (no body-size limit).
 * Returns the signed URL, the storage path, and the upload token.
 */
export async function createPhotoUploadUrl(
  propertyId: string,
  originalFileName: string
): Promise<ActionResult & { signedUrl?: string; storagePath?: string; token?: string }> {
  const allowed = /\.(jpe?g|png|webp)$/i;
  if (!allowed.test(originalFileName)) {
    return { success: false, message: '僅支援 JPG、PNG、WebP' };
  }
  const ext = originalFileName.split('.').pop()!.toLowerCase().replace('jpeg', 'jpg');
  const storagePath = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from('property-photos')
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return { success: false, message: `無法建立上傳授權：${error?.message}` };
  }

  return { success: true, message: 'ok', signedUrl: data.signedUrl, storagePath, token: data.token };
}

/**
 * Step 2 of direct-upload flow:
 * After the browser has PUT the file via the signed URL, call this to persist
 * the storage_path reference in the property_photos table.
 */
export async function savePhotoMetadata(
  propertyId: string,
  storagePath: string,
  isPrimary: boolean
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  // Enforce per-property photo count limit from system_settings
  const [{ data: settingRow }, { count: existingCount }] = await Promise.all([
    adminClient.from('system_settings').select('value').eq('key', 'max_photos_per_property').single(),
    adminClient.from('property_photos').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
  ]);
  const maxPhotos: number = typeof settingRow?.value === 'number' ? settingRow.value : 30;
  if ((existingCount ?? 0) >= maxPhotos) {
    await adminClient.storage.from('property-photos').remove([storagePath]);
    return { success: false, message: `每個物件最多上傳 ${maxPhotos} 張照片（目前已達上限）` };
  }

  // Auto-set as primary if this is the first photo for the property
  const autoIsPrimary = isPrimary || (existingCount ?? 0) === 0;

  const { error } = await adminClient.from('property_photos').insert({
    property_id: propertyId,
    storage_path: storagePath,
    is_primary: autoIsPrimary,
    photo_type: autoIsPrimary ? 'primary' : 'interior',
    sort_order: autoIsPrimary ? 1 : 0,
  });

  if (error) {
    // Clean up the orphaned storage object
    await adminClient.storage.from('property-photos').remove([storagePath]);
    return { success: false, message: `寫入照片記錄失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '照片已儲存' };
}

/** @deprecated Use createPhotoUploadUrl + savePhotoMetadata instead. Kept for reference. */
export async function uploadPropertyPhoto(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  formData: FormData
): Promise<ActionResult & { storagePath?: string }> {
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return { success: false, message: '請選擇一張照片' };
  }
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { success: false, message: '僅支援 JPG、PNG、WebP' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, message: '單張照片不得超過 10MB' };
  }

  const adminClient = createAdminClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from('property-photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    return { success: false, message: `照片上傳失敗：${uploadError.message}` };
  }

  const isPrimary = formData.get('isPrimary') === 'true';
  const { error: insertError } = await adminClient.from('property_photos').insert({
    property_id: propertyId,
    storage_path: uploadData.path,
    is_primary: isPrimary,
    photo_type: isPrimary ? 'primary' : 'interior',
  });

  if (insertError) {
    await adminClient.storage.from('property-photos').remove([uploadData.path]);
    return { success: false, message: `寫入照片記錄失敗：${insertError.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '照片已上傳', storagePath: uploadData.path };
}

const DOC_TYPE_NAME: Record<string, string> = {
  land_registry_transcript: '土地謄本',
  building_registry_transcript: '建物謄本',
  building_title: '建物權狀',
  land_title: '土地權狀',
  lease_contract: '租約',
  sales_contract: '買賣合約',
  blog: '部落格',
};

/** 上傳物件文件（謄本／權狀／合約／部落格）；formData 需含 file (File) */
export async function uploadPropertyDocument(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  ownerId: string,
  documentType: 'land_registry_transcript' | 'building_registry_transcript' | 'building_title' | 'land_title' | 'lease_contract' | 'sales_contract' | 'blog',
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return { success: false, message: '請選擇一個檔案' };
  }
  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { success: false, message: '僅支援 PDF、JPG、PNG、WebP' };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { success: false, message: '單檔不得超過 20MB' };
  }

  const adminClient = createAdminClient();
  const ext = file.name.split('.').pop() || 'pdf';
  const storagePath = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { error: uploadError } = await adminClient.storage
    .from('property-documents')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    return { success: false, message: `檔案上傳失敗：${uploadError.message}` };
  }

  const docType = propertyType === 'sale' ? 'sales' : 'rentals';
  // Build display name: "類型-原檔名", e.g. "謄本-仁愛路四段122號.pdf"
  const typeLabel = DOC_TYPE_NAME[documentType] ?? documentType;
  const originalBasename = file.name.replace(/\.[^.]+$/, ''); // strip extension
  const documentName = `${typeLabel}-${originalBasename}`;
  const { error: insertError } = await adminClient.from('property_documents').insert({
    property_id: propertyId,
    property_type: docType,
    owner_id: ownerId,
    document_type: documentType,
    document_name: documentName,
    file_path: storagePath,
    file_size_bytes: file.size,
    mime_type: file.type,
    original_filename: file.name,
    uploaded_by: ownerId,
  });

  if (insertError) {
    await adminClient.storage.from('property-documents').remove([storagePath]);
    return { success: false, message: `寫入文件記錄失敗：${insertError.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '文件已上傳' };
}

// ── Delete Photo / Document ───────────────────────────────────────────────────

/** 從 storage 及 property_photos 刪除指定照片 */
export async function deletePropertyPhoto(
  photoId: string,
  storagePath: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  const { error: storageErr } = await adminClient.storage
    .from('property-photos')
    .remove([storagePath]);

  if (storageErr) {
    console.error('[Properties] deletePropertyPhoto storage error:', storageErr);
  }

  const { error } = await adminClient.from('property_photos').delete().eq('id', photoId);
  if (error) {
    return { success: false, message: `刪除照片失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '照片已刪除' };
}

/** 軟刪除（is_active = false）property_documents 記錄並移除 storage 檔案 */
export async function deletePropertyDocument(
  documentId: string,
  filePath: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  const { error: storageErr } = await adminClient.storage
    .from('property-documents')
    .remove([filePath]);

  if (storageErr) {
    console.error('[Properties] deletePropertyDocument storage error:', storageErr);
  }

  const { error } = await adminClient
    .from('property_documents')
    .update({ is_active: false })
    .eq('id', documentId);

  if (error) {
    return { success: false, message: `刪除文件失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '文件已刪除' };
}
