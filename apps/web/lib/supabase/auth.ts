import { supabase } from './client';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  full_name?: string;
  role?: 'landlord' | 'tenant' | 'buyer';
}

// Email + Password 登入
export async function signInWithPassword(credentials: SignInCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;
  return data;
}

// 註冊
export async function signUp(credentials: SignUpCredentials) {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        full_name: credentials.full_name,
        role: credentials.role || 'landlord',
      },
    },
  });

  if (error) throw error;
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
    redirectTo: `${window.location.origin}/auth/reset-password`,
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
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
