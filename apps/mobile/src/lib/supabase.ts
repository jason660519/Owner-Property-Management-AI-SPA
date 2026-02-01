import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Log warning instead of throwing error to prevent app crash
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase URL or Anon Key in environment variables. Some features may not work.')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Expo doesn't use URL-based auth
  },
})

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
 * Exchange Transfer Token for Session
 * Used when redirecting from Next.js to Expo via Deep Link
 */
export async function exchangeTransferToken(token: string) {
  try {
    // Decode the token payload
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      throw new Error('Transfer token has expired')
    }

    // Call the Next.js API to exchange the token for a session
    const response = await fetch(`${process.env.EXPO_PUBLIC_WEB_URL}/api/auth/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to exchange token')
    }

    const { session } = await response.json()

    // Set the session in Supabase client
    const { error: setSessionError } = await supabase.auth.setSession(session)

    if (setSessionError) throw setSessionError

    return { success: true, session }
  } catch (err) {
    console.error('Token exchange failed:', err)
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
