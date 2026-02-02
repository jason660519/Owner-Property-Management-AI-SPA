'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// 初始化 Admin Client (需要 Service Role Key)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface SignUpCredentials {
  email: string;
  password: string;
  display_name?: string;
  role?: 'landlord' | 'tenant' | 'buyer' | 'agent' | 'service_provider';
}

export async function signUpWithRole(credentials: SignUpCredentials) {
  const { email, password, display_name, role = 'landlord' } = credentials;

  try {
    // 1. 檢查用戶是否已存在
    const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      throw new Error('系統錯誤，請稍後再試');
    }

    const existingUser = listData.users.find((u) => u.email === email);

    if (existingUser) {
      // 2. 用戶已存在，添加角色
      const currentRoles = existingUser.user_metadata?.roles || [];

      // 如果角色已存在，直接返回成功
      if (currentRoles.includes(role)) {
        return { success: true, message: '帳號已存在，請直接登入' };
      }

      const updatedRoles = [...new Set([...currentRoles, role])];

      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            roles: updatedRoles,
          },
        }
      );

      if (updateError) {
        console.error('Update user error:', updateError);
        throw new Error('更新使用者失敗');
      }

      // 更新 users_profile 表
      const { error: profileError } = await adminSupabase
        .from('users_profile')
        .update({
          role: role, // Update single role, not roles array
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      if (profileError) {
        console.error('Failed to update user profile roles:', profileError);
      }

      return { success: true, message: '角色已新增，請登入' };
    }

    // 3. 新用戶註冊
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 email
      user_metadata: {
        display_name,
        role: role,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw new Error(createError.message || '註冊失敗');
    }

    // 創建 users_profile 記錄（確保在返回前完成）
    if (newUser.user) {
      const { error: profileError } = await adminSupabase.from('users_profile').insert({
        id: newUser.user.id,
        display_name,
        role: role,
      });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // 如果 profile 創建失敗，需要回滾或稍後在登入時修復
        // 為了不影響用戶體驗，這裡不拋出錯誤
      }

      // 等待一小段時間確保資料庫寫入完成
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { success: true, message: '註冊成功，請登入' };
  } catch (error: any) {
    console.error('SignUp error:', error);
    return { success: false, error: error.message };
  }
}
