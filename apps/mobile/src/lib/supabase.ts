import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 測試資料庫連接
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('連接測試失敗:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('連接測試成功:', data)
    return { success: true, data }
  } catch (err) {
    console.error('連接異常:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 上傳照片到 Storage
 */
export async function uploadPhoto(file: File, propertyId: string) {
  try {
    const fileName = `${propertyId}/${Date.now()}.jpg`
    
    const { data, error } = await supabase.storage
      .from('property-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    const { data: publicUrlData } = supabase.storage
      .from('property-photos')
      .getPublicUrl(fileName)
    
    return {
      success: true,
      path: fileName,
      publicUrl: publicUrlData.publicUrl
    }
  } catch (err) {
    console.error('上傳照片失敗:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * 獲取認證使用者
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    
    return { success: true, user }
  } catch (err) {
    console.error('獲取使用者失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 用戶註冊
 */
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (err) {
    console.error('註冊失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 用戶登入
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (err) {
    console.error('登入失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 用戶登出
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('登出失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 創建物件
 */
export async function createProperty(propertyData: {
  address: string
  district: string
  total_area?: number
  building_age?: number
  transcript_data?: Record<string, unknown>
}) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
    
    if (error) throw error
    
    return { success: true, data: data[0] }
  } catch (err) {
    console.error('創建物件失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 獲取使用者的物件列表
 */
export async function getUserProperties() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (err) {
    console.error('獲取物件列表失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 更新物件
 */
export async function updateProperty(propertyId: string, updates: Record<string, unknown>) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
    
    if (error) throw error
    
    return { success: true, data: data[0] }
  } catch (err) {
    console.error('更新物件失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * 刪除物件
 */
export async function deleteProperty(propertyId: string) {
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('刪除物件失敗:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
