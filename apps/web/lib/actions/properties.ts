/**
 * @file properties.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Server actions for property management
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreatePropertyInput {
  // Step 1: 基本資料
  title: string
  address: string
  type: 'rental' | 'sale'
  price: number

  // Step 2: 權狀資料
  owner_name: string
  owner_contact?: string
  building_number?: string
  land_number?: string

  // Step 3: 面積資料
  main_area_sqm: number
  auxiliary_buildings?: Array<{
    id: string
    name: string
    area_sqm: number
    location: string
  }>
  parking_spaces?: Array<{
    id: string
    type: 'independent' | 'shared'
    category: string
    number: string
    area_sqm: number
    location: string
  }>
  common_area_sqm?: number

  // Step 4: 其他資料
  bedrooms?: number
  bathrooms?: number
  floor?: number
  total_floors?: number
  description?: string
}

export interface CreatePropertyResult {
  success: boolean
  property_id?: string
  error?: string
  error_code?: string
}

/**
 * 創建新物件
 */
export async function createProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  try {
    const supabase = await createClient()

    // 1. 獲取當前用戶
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '用戶未登入',
        error_code: 'UNAUTHORIZED',
      }
    }

    // 2. 獲取用戶 profile (需要 owner_id)
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: '找不到用戶資料',
        error_code: 'PROFILE_NOT_FOUND',
      }
    }

    // 3. 準備 details JSONB 欄位
    const details = {
      title: input.title,
      owner_name: input.owner_name,
      owner_contact: input.owner_contact,
      building_number: input.building_number,
      land_number: input.land_number,
      main_area_sqm: input.main_area_sqm,
      auxiliary_buildings: input.auxiliary_buildings || [],
      parking_spaces: input.parking_spaces || [],
      common_area_sqm: input.common_area_sqm,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      floor: input.floor,
      total_floors: input.total_floors,
      description: input.description,
    }

    // 4. 根據類型插入不同的表
    let propertyId: string | undefined

    if (input.type === 'sale') {
      // 出售物件 → property_sales
      const { data, error } = await supabase
        .from('property_sales')
        .insert({
          owner_id: profile.id,
          address: input.address,
          price: input.price,
          status: 'available',
          details,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[CreateProperty] Property_Sales insert error:', error)
        return {
          success: false,
          error: `寫入出售物件失敗: ${error.message}`,
          error_code: 'DATABASE_ERROR',
        }
      }

      propertyId = data?.id
    } else {
      // 出租物件 → property_rentals
      const { data, error } = await supabase
        .from('property_rentals')
        .insert({
          owner_id: profile.id,
          address: input.address,
          monthly_rent: input.price, // 月租金
          status: 'vacant',
          lease_term: 12, // 預設 12 個月
          details,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[CreateProperty] Property_Rentals insert error:', error)
        return {
          success: false,
          error: `寫入出租物件失敗: ${error.message}`,
          error_code: 'DATABASE_ERROR',
        }
      }

      propertyId = data?.id
    }

    if (!propertyId) {
      return {
        success: false,
        error: '無法取得新物件 ID',
        error_code: 'UNKNOWN_ERROR',
      }
    }

    // 5. Revalidate 列表頁面快取
    revalidatePath('/landlord/properties')
    revalidatePath('/properties')

    console.log('[CreateProperty] Success:', {
      property_id: propertyId,
      type: input.type,
      address: input.address,
    })

    return {
      success: true,
      property_id: propertyId,
    }
  } catch (error) {
    console.error('[CreateProperty] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      error_code: 'UNEXPECTED_ERROR',
    }
  }
}

/**
 * 上傳物件照片到 Supabase Storage
 */
export async function uploadPropertyPhoto(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  file: File,
  isPrimary: boolean = false
): Promise<{ success: boolean; storage_path?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. 生成唯一檔名
    const fileExt = file.name.split('.').pop()
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

    // 2. 上傳到 Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[UploadPhoto] Storage upload error:', uploadError)
      return {
        success: false,
        error: `照片上傳失敗: ${uploadError.message}`,
      }
    }

    // 3. 寫入 property_photos 表
    const { error: dbError } = await supabase.from('property_photos').insert({
      property_id: propertyId,
      storage_path: data.path,
      is_primary: isPrimary,
      photo_type: isPrimary ? 'primary' : 'interior',
    })

    if (dbError) {
      console.error('[UploadPhoto] DB insert error:', dbError)
      // 上傳成功但資料庫寫入失敗，嘗試刪除 storage 中的檔案
      await supabase.storage.from('property-photos').remove([data.path])
      return {
        success: false,
        error: `照片記錄寫入失敗: ${dbError.message}`,
      }
    }

    // 4. 更新物件 details 欄位（同步圖片 URL）
    if (data.path) {
      const { data: { publicUrl } } = supabase.storage
        .from('property-photos')
        .getPublicUrl(data.path)

      const tableName = propertyType === 'sale' ? 'property_sales' : 'property_rentals'
      
      // 獲取當前 details
      const { data: currentProp, error: fetchError } = await supabase
        .from(tableName)
        .select('details')
        .eq('id', propertyId)
        .single()

      if (!fetchError && currentProp?.details) {
        const newDetails = {
          ...currentProp.details,
          // 如果是主圖，設置 imageUrl；如果原本沒有 imageUrl，也設置它
          imageUrl: isPrimary ? publicUrl : (currentProp.details.imageUrl || publicUrl),
          // 添加到 images 陣列
          images: [...(currentProp.details.images || []), publicUrl]
        }

        const { error: updateError } = await supabase
          .from(tableName)
          .update({ details: newDetails })
          .eq('id', propertyId)
          
        if (updateError) {
           console.error('[UploadPhoto] Failed to update property details:', updateError)
        }
      }
    }

    return {
      success: true,
      storage_path: data.path,
    }
  } catch (error) {
    console.error('[UploadPhoto] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
    }
  }
}
