import { supabase } from './client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  full_name?: string;
  role?: 'landlord' | 'tenant' | 'buyer' | 'agent' | 'service_provider';
}

// Email + Password 登入
export async function signInWithPassword(credentials: SignInCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    const err = error as Error & { status?: number };
    const raw = err.message ?? '';
    const isUnexpected =
      raw.includes('unexpected response') || raw.includes('Unexpected response');
    const status = err.status ?? (err as unknown as { status?: number }).status;
    const msg = isUnexpected
      ? status === 400
        ? '登入被拒絕（400）。請確認密碼是否正確；本機請確認 Supabase 已啟動且 Auth 已啟用 Email 登入（supabase config.toml 中 enable_signup = true），並執行 supabase stop && supabase start 後再試。'
        : `登入失敗（${status ?? '伺服器異常'}），請稍後再試。`
      : raw;
    throw new Error(msg);
  }
  return data;
}

// 檢查用戶是否已存在
export async function checkUserExists(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.some(user => user.email === email);
}

// 為現有用戶添加角色
export async function addRoleToUser(userId: string, role: string) {
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  
  if (userData.user) {
    const currentRoles = userData.user.user_metadata?.roles || [];
    const updatedRoles = [...new Set([...currentRoles, role])];
    
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        ...userData.user.user_metadata,
        roles: updatedRoles
      }
    });
    
    if (error) throw error;
    
    // 更新 users_profile 表
    const { error: profileError } = await supabase
      .from('users_profile')
      .update({ 
        roles: updatedRoles,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (profileError) {
      console.error('Failed to update user profile roles:', profileError);
    }
  }
}

// 註冊 - 支持多角色
export async function signUp(credentials: SignUpCredentials) {
  const { email, password, full_name, role = 'landlord' } = credentials;
  
  // 檢查用戶是否已存在
  const userExists = await checkUserExists(email);
  
  if (userExists) {
    // 用戶已存在，獲取用戶ID並添加角色
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(user => user.email === email);
    
    if (existingUser) {
      await addRoleToUser(existingUser.id, role);
      return { user: existingUser, session: null };
    }
  }
  
  // 新用戶註冊
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name, // Supabase Auth Metadata uses full_name
        roles: [role],
        primary_role: role
      },
    },
  });

  if (error) throw error;
  
  // 創建 users_profile 記錄
  if (data.user) {
    const { error: profileError } = await supabase
      .from('users_profile')
      .insert({
        id: data.user.id, // Correct PK is id (not user_id)
        email: email,
        display_name: full_name, // Correct column is display_name (not full_name)
        roles: [role],
        primary_role: role
      });

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
    }
  }
  
  return data;
}

// 登出
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 取得當前 Session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// 取得當前使用者
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// OAuth 登入 (Google)
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// OAuth 登入 (Facebook)
export async function signInWithFacebook() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// 重設密碼請求
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
  });

  if (error) throw error;
  return data;
}

// 更新密碼
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

// 監聽認證狀態變化
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
