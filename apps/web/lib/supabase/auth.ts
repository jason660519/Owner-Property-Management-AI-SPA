import { supabase } from './client';

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

  if (error) throw error;
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
      .eq('user_id', userId);
      
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
        full_name,
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
        user_id: data.user.id,
        email: email,
        full_name: full_name,
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
