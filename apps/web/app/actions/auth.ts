'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 初始化 Admin Client (需要 Service Role Key)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface SignUpCredentials {
  email: string;
  password: string;
  full_name?: string;
  role?: 'landlord' | 'tenant' | 'buyer' | 'agent' | 'service_provider';
}

export async function signUpWithRole(credentials: SignUpCredentials) {
  const { email, password, full_name, role = 'landlord' } = credentials;

  try {
    // 1. 檢查用戶是否已存在
    const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('List users error:', listError);
      throw new Error('系統錯誤，請稍後再試');
    }

    const existingUser = listData.users.find(u => u.email === email);

    if (existingUser) {
      // 2. 用戶已存在，添加角色
      const currentRoles = existingUser.user_metadata?.roles || [];
      
      // 如果角色已存在，直接返回成功
      if (currentRoles.includes(role)) {
        return { success: true, message: '帳號已存在，請直接登入' };
      }

      const updatedRoles = [...new Set([...currentRoles, role])];

      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          roles: updatedRoles
        }
      });

      if (updateError) {
        console.error('Update user error:', updateError);
        throw new Error('更新使用者失敗');
      }

      // 更新 users_profile 表
      // 注意：這裡使用 adminSupabase 直接操作資料庫，繞過 RLS
      const { error: profileError } = await adminSupabase
        .from('users_profile')
        .update({
          roles: updatedRoles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.id);

      if (profileError) {
        console.error('Failed to update user profile roles:', profileError);
        // 不拋出錯誤，因為 Auth 已經更新成功
      }

      return { success: true, message: '角色已新增，請登入' };
    }

    // 3. 新用戶註冊
    // 使用 adminSupabase.auth.admin.createUser 可以跳過 email 驗證（如果需要）
    // 但為了安全，我們還是建議走正常流程，或者在這裡直接創建並設為已驗證（視需求而定）
    // 這裡我們使用 createUser 來創建用戶，這樣可以自動確認 email (email_confirm: true)
    // 或者如果需要發送驗證信，則使用 signUp
    
    // 為了更好的用戶體驗，我們直接創建已驗證的用戶 (開發環境)
    // 生產環境應該視策略而定
    
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 email
      user_metadata: {
        full_name,
        roles: [role],
        primary_role: role
      }
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw new Error(createError.message || '註冊失敗');
    }

    // 創建 users_profile 記錄
    if (newUser.user) {
      const { error: profileError } = await adminSupabase
        .from('users_profile')
        .insert({
          user_id: newUser.user.id,
          full_name,
          roles: [role],
          primary_role: role,
          email
        });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
      }
    }

    return { success: true, message: '註冊成功' };

  } catch (error: any) {
    console.error('SignUp error:', error);
    return { success: false, error: error.message };
  }
}
