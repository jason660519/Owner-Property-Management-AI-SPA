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
  PropertyPhotoItem,
  PropertyDocumentItem,
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

    // Normalize sales (title + address from columns or details fallback)
    const salesProperties: PropertyItem[] = (salesData || []).map((s) => {
      const details = (s.details || {}) as Record<string, unknown>;
      const row = s as Record<string, unknown>;
      return {
        id: s.id,
        type: 'sale' as const,
        title: (row.title as string) ?? (details.title as string) ?? s.address,
        address: s.address,
        addressCity: (row.address_city as string) ?? (details.addressCity as string) ?? undefined,
        addressDistrict: (row.address_district as string) ?? (details.addressDistrict as string) ?? undefined,
        addressStreet: (row.address_street as string) ?? (details.addressStreet as string) ?? undefined,
        addressNumber: (row.address_number as string) ?? (details.addressNumber as string) ?? undefined,
        addressFloor: (row.address_floor as string) ?? (details.addressFloor as string) ?? undefined,
        addressUnit: (row.address_unit as string) ?? (details.addressUnit as string) ?? undefined,
        status: s.status,
        price: s.price,
        monthlyRent: null,
        ownerName: ownerMap[s.owner_id] || s.owner_id.slice(0, 8),
        ownerId: s.owner_id,
        area: (details.area as number | null) ?? null,
        propertyType: (details.type as string | null) ?? null,
        bedrooms: (details.bedrooms as number | null) ?? null,
        bathrooms: (details.bathrooms as number | null) ?? null,
        livingRooms: (details.livingRooms as number | null) ?? null,
        parkingSpaces: (details.parkingSpaces as number | null) ?? null,
        createdAt: s.created_at,
      };
    });

    // Normalize rentals
    const rentalProperties: PropertyItem[] = (rentalsData || []).map((r) => {
      const details = (r.details || {}) as Record<string, unknown>;
      const row = r as Record<string, unknown>;
      return {
        id: r.id,
        type: 'rental' as const,
        title: (row.title as string) ?? (details.title as string) ?? r.address,
        address: r.address,
        addressCity: (row.address_city as string) ?? (details.addressCity as string) ?? undefined,
        addressDistrict: (row.address_district as string) ?? (details.addressDistrict as string) ?? undefined,
        addressStreet: (row.address_street as string) ?? (details.addressStreet as string) ?? undefined,
        addressNumber: (row.address_number as string) ?? (details.addressNumber as string) ?? undefined,
        addressFloor: (row.address_floor as string) ?? (details.addressFloor as string) ?? undefined,
        addressUnit: (row.address_unit as string) ?? (details.addressUnit as string) ?? undefined,
        status: r.status,
        price: null,
        monthlyRent: r.monthly_rent,
        ownerName: ownerMap[r.owner_id] || r.owner_id.slice(0, 8),
        ownerId: r.owner_id,
        area: (details.area as number | null) ?? null,
        propertyType: (details.type as string | null) ?? null,
        bedrooms: (details.bedrooms as number | null) ?? null,
        bathrooms: (details.bathrooms as number | null) ?? null,
        livingRooms: (details.livingRooms as number | null) ?? null,
        parkingSpaces: (details.parkingSpaces as number | null) ?? null,
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

    // Merge details JSONB (preserve existing fields; keep details in sync for backward compat)
    const existingDetails = (existing?.details || {}) as Record<string, unknown>;
    const updatedDetails = { ...existingDetails };
    if (input.title !== undefined) updatedDetails.title = input.title;
    if (input.addressCity !== undefined) updatedDetails.addressCity = input.addressCity;
    if (input.addressDistrict !== undefined) updatedDetails.addressDistrict = input.addressDistrict;
    if (input.addressStreet !== undefined) updatedDetails.addressStreet = input.addressStreet;
    if (input.addressNumber !== undefined) updatedDetails.addressNumber = input.addressNumber;
    if (input.addressFloor !== undefined) updatedDetails.addressFloor = input.addressFloor;
    if (input.addressUnit !== undefined) updatedDetails.addressUnit = input.addressUnit;
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
    .select('id, storage_path, is_primary, photo_type')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });

  if (error || !rows?.length) return [];

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const bucket = 'property-photos';
  return rows.map((r) => ({
    id: r.id,
    storagePath: r.storage_path,
    url: `${baseUrl}/storage/v1/object/public/${bucket}/${r.storage_path}`,
    isPrimary: !!r.is_primary,
    photoType: r.photo_type ?? 'interior',
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

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const bucket = 'property-documents';
  return rows.map((r) => ({
    id: r.id,
    documentType: r.document_type,
    documentName: r.document_name,
    filePath: r.file_path,
    url: `${baseUrl}/storage/v1/object/public/${bucket}/${r.file_path}`,
  }));
}

/** 上傳物件照片；formData 需含 file (File) */
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

  const table = propertyType === 'sale' ? 'property_sales' : 'property_rentals';
  const { data: current } = await adminClient.from(table).select('details').eq('id', propertyId).single();
  if (current?.details && typeof current.details === 'object') {
    const details = current.details as Record<string, unknown>;
    const { data: urlData } = adminClient.storage.from('property-photos').getPublicUrl(uploadData.path);
    const images = (details.images as string[] | undefined) || [];
    const imageUrl = isPrimary ? urlData.publicUrl : (details.imageUrl as string) || urlData.publicUrl;
    await adminClient.from(table).update({
      details: { ...details, imageUrl, images: [...images, urlData.publicUrl] },
    }).eq('id', propertyId);
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '照片已上傳', storagePath: uploadData.path };
}

/** 上傳物件文件（謄本或權狀）；formData 需含 file (File)，documentType: 'land_registry_transcript' | 'building_title' | 'land_title' */
export async function uploadPropertyDocument(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  ownerId: string,
  documentType: 'land_registry_transcript' | 'building_title' | 'land_title',
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
  const documentName = documentType === 'land_registry_transcript' ? '謄本' : documentType === 'building_title' ? '建物權狀' : '土地權狀';
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
